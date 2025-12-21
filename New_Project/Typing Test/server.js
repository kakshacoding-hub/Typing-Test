import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    initializeDatabase,
    insertResult,
    getUserHistory,
    getUserStats,
    getLeaderboard,
    createUser,
    findUserByEmail,
    findUserById,
    saveGameScore,
    getGameLeaderboard
} from './database.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Session configuration
app.use(session({
    secret: 'typing-test-secret-key-2024',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false // Set to true if using HTTPS
    }
}));

// Initialize database (async)
await initializeDatabase();

// Load quotes
const quotes = JSON.parse(readFileSync(join(__dirname, 'quotes.json'), 'utf-8'));

// --- Authentication Middleware ---
const requireAuth = (req, res, next) => {
    if (req.session.userId && !req.session.userId.toString().startsWith('user_')) {
        // Valid numeric user ID means logged in
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- AUTHENTICATION API ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (findUserByEmail(email)) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = createUser(username, email, passwordHash);

        req.session.userId = user.id; // Log in immediately
        res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = findUserByEmail(email);

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    if (req.session.userId && typeof req.session.userId === 'number') {
        const user = findUserById(req.session.userId);
        if (user) {
            return res.json({ isLoggedIn: true, user });
        }
    }
    res.json({ isLoggedIn: false });
});

// --- GAMES API ---

app.post('/api/games/score', requireAuth, (req, res) => {
    try {
        const { score, gameType } = req.body;
        saveGameScore(req.session.userId, score, gameType);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save score' });
    }
});

app.get('/api/games/leaderboard', (req, res) => {
    try {
        const { gameType } = req.query;
        const leaderboard = getGameLeaderboard(gameType || 'falling_words');
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// --- CORE API ---

// Get random quote by difficulty
app.get('/api/quotes/:difficulty', (req, res) => {
    const { difficulty } = req.params;

    if (!quotes[difficulty]) {
        return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    const difficultyQuotes = quotes[difficulty];
    const randomQuote = difficultyQuotes[Math.floor(Math.random() * difficultyQuotes.length)];

    res.json({ text: randomQuote, difficulty });
});

// Save test result
app.post('/api/results', (req, res) => {
    try {
        const { wpm, accuracy, difficulty, duration, correctChars, incorrectChars, totalChars } = req.body;

        // Validation
        if (!wpm || !accuracy || !difficulty || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Determine Identity
        let userId = null;
        let sessionId = req.session.userId;

        if (typeof req.session.userId === 'number') {
            // Logged in user
            userId = req.session.userId;
            sessionId = `user_${userId}`; // For backward compatibility with session_id column
        } else if (!sessionId) {
            // Guest
            sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            req.session.userId = sessionId;
        }

        const result = insertResult({
            sessionId: sessionId,
            userId: userId,
            wpm: parseFloat(wpm),
            accuracy: parseFloat(accuracy),
            difficulty,
            duration: parseInt(duration),
            correctChars: parseInt(correctChars),
            incorrectChars: parseInt(incorrectChars),
            totalChars: parseInt(totalChars)
        });

        res.json({
            success: true,
            resultId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error saving result:', error);
        res.status(500).json({ error: 'Failed to save result' });
    }
});

// Get user's test history
app.get('/api/history', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json([]);
        }

        const isRegisteredUser = typeof req.session.userId === 'number';
        const limit = parseInt(req.query.limit) || 10;

        const history = getUserHistory(req.session.userId, isRegisteredUser, limit);

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get user statistics
app.get('/api/stats', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({
                total_tests: 0,
                avg_wpm: 0,
                best_wpm: 0,
                avg_accuracy: 0,
                best_accuracy: 0
            });
        }

        const isRegisteredUser = typeof req.session.userId === 'number';
        const stats = getUserStats(req.session.userId, isRegisteredUser);

        res.json(stats || {
            total_tests: 0,
            avg_wpm: 0,
            best_wpm: 0,
            avg_accuracy: 0,
            best_accuracy: 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = getLeaderboard(limit);

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   Typing Test Server Running! 🚀      ║
╠═══════════════════════════════════════╣
║  URL: http://localhost:${PORT}       ║
║  Status: Ready to accept requests     ║
╚═══════════════════════════════════════╝
  `);
});
