// =====================
// Global State
// =====================

let currentText = '';
let currentDifficulty = 'easy';
let currentDuration = 60;
let timeLeft = 60;
let timerInterval = null;
let testStarted = false;
let currentCharIndex = 0;
let correctChars = 0;
let incorrectChars = 0;
let testResults = null;
let currentUser = null; // Store logged in user info

// DOM Elements
const textDisplay = document.getElementById('text-display');
const typingInput = document.getElementById('typing-input');
const timerElement = document.getElementById('timer');
const liveWpmElement = document.getElementById('live-wpm');
const liveAccuracyElement = document.getElementById('live-accuracy');
const restartBtn = document.getElementById('restart-btn');
const resultsModal = document.getElementById('results-modal');
const modalClose = document.getElementById('modal-close');
const tryAgainBtn = document.getElementById('try-again-btn');
const viewStatsBtn = document.getElementById('view-stats-btn');

// Nav buttons
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

// Settings buttons
const difficultyBtns = document.querySelectorAll('[data-difficulty]');
const durationBtns = document.querySelectorAll('[data-duration]');

// Stats elements
const totalTestsEl = document.getElementById('total-tests');
const avgWpmEl = document.getElementById('avg-wpm');
const bestWpmEl = document.getElementById('best-wpm');
const avgAccuracyEl = document.getElementById('avg-accuracy');
const historyListEl = document.getElementById('history-list');

// Leaderboard elements
const leaderboardBodyEl = document.getElementById('leaderboard-body');
const lbHeadersEl = document.getElementById('lb-headers');
const lbTypeTestBtn = document.getElementById('lb-type-test');
const lbTypeGameBtn = document.getElementById('lb-type-game');

// Auth Elements
const authModal = document.getElementById('auth-modal');
const authClose = document.getElementById('auth-close');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSwitch = document.getElementById('switch-auth');
const usernameGroup = document.getElementById('username-group');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const usernameSpan = document.getElementById('username-span');

let isLoginMode = true; // Toggle for modal

// =====================
// Initialization
// =====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(); // Check if user is logged in
    loadNewText();
    setupEventListeners();
    loadLeaderboard('test'); // Default Load
});

// =====================
// Authentication Logic
// =====================

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.isLoggedIn) {
            setUserUI(data.user);
        } else {
            setGuestUI();
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
}

function setUserUI(user) {
    currentUser = user;
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    userDisplay.style.display = 'flex';
    usernameSpan.textContent = `Hi, ${user.username}`;
}

function setGuestUI() {
    currentUser = null;
    loginBtn.style.display = 'block';
    signupBtn.style.display = 'block';
    userDisplay.style.display = 'none';
    usernameSpan.textContent = '';
}

function openAuthModal(mode) { // 'login' or 'signup'
    isLoginMode = mode === 'login';
    authModal.classList.add('active');
    updateAuthModalUI();
}

function updateAuthModalUI() {
    if (isLoginMode) {
        authTitle.textContent = 'Login';
        usernameGroup.style.display = 'none';
        document.getElementById('auth-username').removeAttribute('required');
        authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="switch-auth-link">Sign Up</a>';
    } else {
        authTitle.textContent = 'Sign Up';
        usernameGroup.style.display = 'block';
        document.getElementById('auth-username').setAttribute('required', 'true');
        authSwitch.innerHTML = 'Already have an account? <a href="#" id="switch-auth-link">Login</a>';
    }
    // Re-bind link
    document.getElementById('switch-auth-link').addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateAuthModalUI();
    });
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const body = isLoginMode ? { email, password } : { email, password, username };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
            setUserUI(data.user);
            authModal.classList.remove('active');
            authForm.reset();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Authentication failed');
    }
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setGuestUI();
    window.location.reload(); // Refresh to clear specific user data/state
}

// =====================
// Event Listeners
// =====================

function setupEventListeners() {
    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.dataset.view;
            switchView(viewName);
        });
    });

    // Auth Events
    loginBtn.addEventListener('click', () => openAuthModal('login'));
    signupBtn.addEventListener('click', () => openAuthModal('signup'));
    logoutBtn.addEventListener('click', handleLogout);
    authClose.addEventListener('click', () => authModal.classList.remove('active'));
    authForm.addEventListener('submit', handleAuthSubmit);

    // Leaderboard switching
    lbTypeTestBtn.addEventListener('click', () => loadLeaderboard('test'));
    lbTypeGameBtn.addEventListener('click', () => loadLeaderboard('game'));

    // Difficulty selection
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (testStarted) return; // Don't allow changes during test

            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.dataset.difficulty;
            loadNewText();
        });
    });

    // Duration selection
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (testStarted) return;

            durationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDuration = parseInt(btn.dataset.duration);
            timeLeft = currentDuration;
            timerElement.textContent = timeLeft;
        });
    });

    // Typing input
    typingInput.addEventListener('input', handleTyping);
    typingInput.addEventListener('focus', () => {
        if (!testStarted) {
            startTest();
        }
    });

    // Restart button
    restartBtn.addEventListener('click', resetTest);

    // Modal controls
    modalClose.addEventListener('click', closeModal);
    tryAgainBtn.addEventListener('click', () => {
        closeModal();
        resetTest();
    });
    viewStatsBtn.addEventListener('click', () => {
        closeModal();
        switchView('stats');
    });

    // Close modal on overlay click
    resultsModal.addEventListener('click', (e) => {
        if (e.target === resultsModal || e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    authModal.addEventListener('click', (e) => {
        if (e.target === authModal || e.target.classList.contains('modal-overlay')) {
            authModal.classList.remove('active');
        }
    });
}

// =====================
// View Management
// =====================

function switchView(viewName) {
    views.forEach(view => view.classList.remove('active'));
    navBtns.forEach(btn => btn.classList.remove('active'));

    const targetView = document.getElementById(`${viewName}-view`);
    const targetBtn = document.querySelector(`[data-view="${viewName}"]`);

    if (targetView) targetView.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    // Load data for specific views
    if (viewName === 'stats') {
        loadUserStats();
        loadUserHistory();
    } else if (viewName === 'leaderboard') {
        loadLeaderboard('test');
    }
}

// =====================
// Test Logic
// =====================

async function loadNewText() {
    try {
        const response = await fetch(`/api/quotes/${currentDifficulty}`);
        const data = await response.json();
        currentText = data.text;
        renderText();
    } catch (error) {
        console.error('Error loading text:', error);
        textDisplay.innerHTML = '<div class="loading">Error loading text. Please refresh.</div>';
    }
}

function renderText() {
    textDisplay.innerHTML = '';
    for (let i = 0; i < currentText.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.classList.add('char');
        charSpan.textContent = currentText[i];
        if (i === 0) charSpan.classList.add('current');
        textDisplay.appendChild(charSpan);
    }
}

function startTest() {
    if (testStarted) return;

    testStarted = true;
    typingInput.value = '';
    currentCharIndex = 0;
    correctChars = 0;
    incorrectChars = 0;

    // Start timer
    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            endTest();
        }
    }, 1000);
}

function handleTyping(e) {
    const typedValue = e.target.value;
    const chars = textDisplay.querySelectorAll('.char');

    // Check each character
    let allCorrect = true;
    for (let i = 0; i < typedValue.length; i++) {
        if (i < chars.length) {
            const char = chars[i];
            const typedChar = typedValue[i];
            const expectedChar = currentText[i];

            // Remove previous classes
            char.classList.remove('correct', 'incorrect', 'current');

            if (typedChar === expectedChar) {
                char.classList.add('correct');
            } else {
                char.classList.add('incorrect');
                allCorrect = false;
            }
        }
    }

    // Update current character indicator
    chars.forEach((char, i) => {
        if (i === typedValue.length) {
            char.classList.add('current');
        } else if (i > typedValue.length) {
            char.classList.remove('correct', 'incorrect', 'current');
        }
    });

    currentCharIndex = typedValue.length;

    // Count correct and incorrect characters
    correctChars = 0;
    incorrectChars = 0;
    chars.forEach(char => {
        if (char.classList.contains('correct')) correctChars++;
        if (char.classList.contains('incorrect')) incorrectChars++;
    });

    // Update live stats
    updateLiveStats();

    // Check if user finished typing the entire text
    if (currentCharIndex >= currentText.length) {
        endTest();
    }
}

function updateLiveStats() {
    const timeElapsed = currentDuration - timeLeft;

    // Calculate WPM: (correct_chars / 5) / (time_in_minutes)
    const wpm = timeElapsed > 0 ? Math.round((correctChars / 5) / (timeElapsed / 60)) : 0;

    // Calculate accuracy: (correct_chars / total_typed_chars) * 100
    const totalTyped = correctChars + incorrectChars;
    const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

    liveWpmElement.textContent = wpm;
    liveAccuracyElement.textContent = `${accuracy}%`;
}

async function endTest() {
    clearInterval(timerInterval);
    testStarted = false;
    typingInput.disabled = true;

    const timeElapsed = currentDuration - timeLeft;
    const wpm = timeElapsed > 0 ? Math.round((correctChars / 5) / (timeElapsed / 60)) : 0;
    const totalTyped = correctChars + incorrectChars;
    const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

    testResults = {
        wpm,
        accuracy,
        correctChars,
        incorrectChars,
        totalChars: currentText.length,
        difficulty: currentDifficulty,
        duration: currentDuration
    };

    // Save results to backend
    try {
        await fetch('/api/results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testResults)
        });
    } catch (error) {
        console.error('Error saving results:', error);
    }

    // Show results modal
    showResults();
}

function resetTest() {
    clearInterval(timerInterval);
    testStarted = false;
    typingInput.disabled = false;
    typingInput.value = '';
    timeLeft = currentDuration;
    timerElement.textContent = timeLeft;
    currentCharIndex = 0;
    correctChars = 0;
    incorrectChars = 0;
    liveWpmElement.textContent = '0';
    liveAccuracyElement.textContent = '100%';

    loadNewText();
}

// =====================
// Results Modal
// =====================

function showResults() {
    if (!testResults) return;

    document.getElementById('result-wpm').textContent = testResults.wpm;
    document.getElementById('result-accuracy').textContent = `${testResults.accuracy}%`;
    document.getElementById('result-correct').textContent = testResults.correctChars;
    document.getElementById('result-incorrect').textContent = testResults.incorrectChars;

    resultsModal.classList.add('active');
}

function closeModal() {
    resultsModal.classList.remove('active');
}

// =====================
// Statistics
// =====================

async function loadUserStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        totalTestsEl.textContent = stats.total_tests || 0;
        avgWpmEl.textContent = Math.round(stats.avg_wpm || 0);
        bestWpmEl.textContent = Math.round(stats.best_wpm || 0);
        avgAccuracyEl.textContent = `${Math.round(stats.avg_accuracy || 0)}%`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUserHistory() {
    try {
        const response = await fetch('/api/history?limit=10');
        const history = await response.json();

        if (history.length === 0) {
            historyListEl.innerHTML = '<div class="empty-state">No tests completed yet. Start typing to see your results here!</div>';
            return;
        }

        historyListEl.innerHTML = '';
        history.forEach((test, index) => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');

            const date = new Date(test.timestamp);
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            historyItem.innerHTML = `
        <div class="history-detail">
          <div class="history-detail-label">WPM</div>
          <div class="history-detail-value">${Math.round(test.wpm)}</div>
        </div>
        <div class="history-detail">
          <div class="history-detail-label">Accuracy</div>
          <div class="history-detail-value">${Math.round(test.accuracy)}%</div>
        </div>
        <div class="history-detail">
          <div class="history-detail-label">Difficulty</div>
          <div class="history-detail-value">${test.difficulty}</div>
        </div>
        <div class="history-detail">
          <div class="history-detail-label">Duration</div>
          <div class="history-detail-value">${test.duration}s</div>
        </div>
        <div class="history-detail">
          <div class="history-detail-label">Date</div>
          <div class="history-detail-value">${dateStr}</div>
        </div>
      `;

            historyListEl.appendChild(historyItem);
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// =====================
// Leaderboard
// =====================

async function loadLeaderboard(type = 'test') { // 'test' or 'game'
    try {
        // UI Toggles
        if (type === 'test') {
            lbTypeTestBtn.classList.add('active');
            lbTypeGameBtn.classList.remove('active');
            lbHeadersEl.innerHTML = `
            <th>Rank</th>
            <th>Player</th>
            <th>WPM</th>
            <th>Accuracy</th>
            <th>Difficulty</th>
            <th>Date</th>
        `;
        } else {
            lbTypeTestBtn.classList.remove('active');
            lbTypeGameBtn.classList.add('active');
            lbHeadersEl.innerHTML = `
            <th>Rank</th>
            <th>Player</th>
            <th>High Score</th>
            <th>Game Mode</th>
            <th>Last Played</th>
        `;
        }

        const endpoint = type === 'test'
            ? '/api/leaderboard?limit=10'
            : '/api/games/leaderboard?gameType=falling_words&limit=10';

        const response = await fetch(endpoint);
        const leaderboard = await response.json();

        leaderboardBodyEl.innerHTML = '';

        if (leaderboard.length === 0) {
            leaderboardBodyEl.innerHTML = '<tr><td colspan="6" class="empty-state">No entries yet. Be the first!</td></tr>';
            return;
        }

        leaderboard.forEach((entry, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');

            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });

            // Formatting
            const displayName = entry.username || entry.session_id.substring(0, 12) + '...';

            let rankClass = 'rank';
            if (rank === 1) rankClass += ' top-1';
            if (rank === 2) rankClass += ' top-2';
            if (rank === 3) rankClass += ' top-3';

            if (type === 'test') {
                row.innerHTML = `
            <td><span class="${rankClass}">${rank}</span></td>
            <td>${displayName}</td>
            <td><strong>${Math.round(entry.best_wpm)}</strong></td>
            <td>${Math.round(entry.accuracy)}%</td>
            <td>${entry.difficulty}</td>
            <td>${dateStr}</td>
          `;
            } else {
                row.innerHTML = `
            <td><span class="${rankClass}">${rank}</span></td>
            <td>${displayName}</td>
            <td><strong>${entry.high_score}</strong></td>
            <td>Skyfall</td>
            <td>${dateStr}</td>
          `;
            }

            leaderboardBodyEl.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}
