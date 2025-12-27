# Typing Test Website

A fully functional, professional typing test application with real-time statistics, leaderboard, and beautiful UI.

## Features

- ✨ **Real-time Typing Test** - Test your typing speed with instant feedback
- 📊 **Live Statistics** - See your WPM (Words Per Minute) and accuracy update in real-time
- 🎯 **Multiple Difficulty Levels** - Easy, Medium, and Hard text options
- ⏱️ **Flexible Duration** - Choose between 30s, 60s, or 120s tests
- 📈 **Personal Statistics** - Track your progress with detailed stats and history
- 🏆 **Global Leaderboard** - Compete with others and see top performers
- 🎨 **Premium UI** - Modern design with smooth animations and gradients
- 💾 **Data Persistence** - All results saved to SQLite database

## Installation

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Navigate to project directory**
   ```bash
   cd "C:\User-to-path-of-Folder"
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

## Running the Application

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open your browser**
   - Navigate to: `http://localhost:3000`

3. **Start typing!**
   - Select your preferred difficulty and duration
   - Click on the input field and start typing
   - Your results will be saved automatically

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/quotes/:difficulty` - Fetch random typing text
- `POST /api/results` - Save test results
- `GET /api/history?limit=10` - Get user's test history
- `GET /api/stats` - Get user statistics
- `GET /api/leaderboard?limit=10` - Get global leaderboard
- `GET /api/health` - Server health check

## Technology Stack

- **Frontend**: HTML5, CSS3 (with modern gradients & animations), Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Session Management**: express-session

## Project Structure

```
Typing Test/
├── server.js           # Express server with API endpoints
├── database.js         # Database configuration and queries
├── quotes.json         # Typing text samples by difficulty
├── index.html          # Main HTML structure
├── styles.css          # Premium styling with animations
├── script.js           # Frontend logic and typing test engine
├── package.json        # Node.js dependencies
├── typing_test.db      # SQLite database (created automatically)
└── README.md           # This file
```

## How It Works

### WPM Calculation
```
WPM = (correct_characters / 5) / (time_in_minutes)
```

### Accuracy Calculation
```
Accuracy = (correct_characters / total_typed_characters) × 100
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - Feel free to use and modify!

---

**Enjoy improving your typing speed! 🚀**
