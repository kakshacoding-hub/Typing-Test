import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'typing_test.db');

let db;
let SQL;

// Initialize database
const initializeDatabase = async () => {
    try {
        // Initialize SQL.js
        SQL = await initSqlJs();

        // Load existing database or create new one
        if (existsSync(DB_PATH)) {
            const buffer = readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
            console.log('✓ Database loaded successfully');
        } else {
            db = new SQL.Database();
            console.log('✓ New database created');
        }

        // Create tables
        db.run(`
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id INTEGER, -- Nullable, links to users table
        wpm REAL NOT NULL,
        accuracy REAL NOT NULL,
        difficulty TEXT NOT NULL,
        duration INTEGER NOT NULL,
        correct_chars INTEGER NOT NULL,
        incorrect_chars INTEGER NOT NULL,
        total_chars INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        game_type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        saveDatabase();
        console.log('✓ Database tables initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

// Save database to file
const saveDatabase = () => {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(DB_PATH, buffer);
    }
};

// --- User Management ---

const createUser = (username, email, passwordHash) => {
    try {
        db.run(
            `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
            [username, email, passwordHash]
        );
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id');
        return { id: result[0].values[0][0], username, email };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error; // Likely unique constraint violation
    }
};

const findUserByEmail = (email) => {
    try {
        const result = db.exec(`SELECT * FROM users WHERE email = ?`, [email]);
        if (result.length === 0) return null;
        const columns = result[0].columns;
        const values = result[0].values[0];
        const user = {};
        columns.forEach((col, idx) => { user[col] = values[idx]; });
        return user;
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
};

const findUserById = (id) => {
    try {
        const result = db.exec(`SELECT id, username, email, created_at FROM users WHERE id = ?`, [id]);
        if (result.length === 0) return null;
        const columns = result[0].columns;
        const values = result[0].values[0];
        const user = {};
        columns.forEach((col, idx) => { user[col] = values[idx]; });
        return user;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
};

// --- Game Scores ---

const saveGameScore = (userId, score, gameType = 'falling_words') => {
    try {
        db.run(
            `INSERT INTO games (user_id, score, game_type) VALUES (?, ?, ?)`,
            [userId, score, gameType]
        );
        saveDatabase();
        return true;
    } catch (error) {
        console.error('Error saving game score:', error);
        return false;
    }
};

const getGameLeaderboard = (gameType = 'falling_words', limit = 10) => {
    try {
        const result = db.exec(`
      SELECT u.username, MAX(g.score) as high_score, g.timestamp
      FROM games g
      JOIN users u ON g.user_id = u.id
      WHERE g.game_type = ?
      GROUP BY g.user_id
      ORDER BY high_score DESC
      LIMIT ?
    `, [gameType, limit]);

        if (result.length === 0) return [];

        const columns = result[0].columns;
        const rows = result[0].values;

        return rows.map(row => {
            const obj = {};
            columns.forEach((col, idx) => { obj[col] = row[idx]; });
            return obj;
        });
    } catch (error) {
        console.error('Error getting game leaderboard:', error);
        return [];
    }
};

// --- Existing Functions Updated ---

// Insert a new test result
const insertResult = (data) => {
    try {
        db.run(
            `INSERT INTO results (session_id, user_id, wpm, accuracy, difficulty, duration, correct_chars, incorrect_chars, total_chars, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                data.sessionId,
                data.userId || null, // New field
                data.wpm,
                data.accuracy,
                data.difficulty,
                data.duration,
                data.correctChars,
                data.incorrectChars,
                data.totalChars
            ]
        );

        saveDatabase();

        // Get last insert ID
        const result = db.exec('SELECT last_insert_rowid() as id');
        return { lastInsertRowid: result[0].values[0][0] };
    } catch (error) {
        console.error('Error inserting result:', error);
        throw error;
    }
};

// Get user's test history by session ID OR User ID
const getUserHistory = (identifier, isUserId = false, limit = 10) => {
    try {
        const query = isUserId
            ? `SELECT * FROM results WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`
            : `SELECT * FROM results WHERE session_id = ? AND user_id IS NULL ORDER BY timestamp DESC LIMIT ?`;

        const result = db.exec(query, [identifier, limit]);

        if (result.length === 0) return [];

        const columns = result[0].columns;
        const rows = result[0].values;

        return rows.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
    } catch (error) {
        console.error('Error getting history:', error);
        return [];
    }
};

// Get user statistics
const getUserStats = (identifier, isUserId = false) => {
    try {
        const query = isUserId
            ? `SELECT 
          COUNT(*) as total_tests,
          AVG(wpm) as avg_wpm,
          MAX(wpm) as best_wpm,
          AVG(accuracy) as avg_accuracy,
          MAX(accuracy) as best_accuracy
         FROM results 
         WHERE user_id = ?`
            : `SELECT 
          COUNT(*) as total_tests,
          AVG(wpm) as avg_wpm,
          MAX(wpm) as best_wpm,
          AVG(accuracy) as avg_accuracy,
          MAX(accuracy) as best_accuracy
         FROM results 
         WHERE session_id = ? AND user_id IS NULL`;

        const result = db.exec(query, [identifier]);

        if (result.length === 0) return null;

        const columns = result[0].columns;
        const values = result[0].values[0];

        const stats = {};
        columns.forEach((col, idx) => {
            stats[col] = values[idx];
        });

        return stats;
    } catch (error) {
        console.error('Error getting stats:', error);
        return null;
    }
};

// Get global leaderboard (Users get priority display)
const getLeaderboard = (limit = 10) => {
    try {
        // Prefer showing updated username if linked, otherwise session_id fallback
        // This is a simplified query; ideally we join users table
        const result = db.exec(
            `SELECT 
        r.session_id,
        u.username,
        MAX(r.wpm) as best_wpm,
        r.difficulty,
        r.accuracy,
        r.timestamp
       FROM results r
       LEFT JOIN users u ON r.user_id = u.id
       GROUP BY r.user_id, r.session_id
       ORDER BY best_wpm DESC 
       LIMIT ?`,
            [limit]
        );

        if (result.length === 0) return [];

        const columns = result[0].columns;
        const rows = result[0].values;

        return rows.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return [];
    }
};

export {
    db,
    initializeDatabase,
    insertResult,
    getUserHistory,
    getUserStats,
    getLeaderboard,
    saveDatabase,
    createUser,
    findUserByEmail,
    findUserById,
    saveGameScore,
    getGameLeaderboard
};
