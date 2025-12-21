// =====================
// Type Races Game Logic
// =====================

class TypeRacesGame {
    constructor() {
        this.difficulty = 'medium';
        this.gameState = 'idle'; // idle, countdown, racing, finished
        this.startTime = null;
        this.currentCharIndex = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.totalChars = 0;
        this.timerInterval = null;
        this.opponentIntervals = [];

        // Text passages by difficulty
        this.texts = {
            easy: [
                "The quick brown fox jumps over the lazy dog.",
                "A journey of a thousand miles begins with a single step.",
                "Time flies when you are having fun.",
                "Practice makes perfect in every skill.",
                "The early bird catches the worm."
            ],
            medium: [
                "Success is not final, failure is not fatal: it is the courage to continue that counts. Never give up on your dreams.",
                "The only way to do great work is to love what you do. If you haven't found it yet, keep looking and don't settle.",
                "Life is what happens when you're busy making other plans. Focus on the present moment and make it count.",
                "Innovation distinguishes between a leader and a follower. Always strive to create something new and meaningful."
            ],
            hard: [
                "The greatest glory in living lies not in never falling, but in rising every time we fall. Persistence and determination alone are omnipotent in achieving extraordinary success.",
                "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference in my journey through life.",
                "It is during our darkest moments that we must focus to see the light. The human spirit is capable of overcoming incredible adversity with courage and determination.",
                "In the end, we will remember not the words of our enemies, but the silence of our friends. Stand up for what is right, even when standing alone."
            ]
        };

        this.currentText = '';

        // DOM Elements
        this.initElements();
        this.attachEventListeners();
        this.loadStats();
    }

    initElements() {
        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.resultsScreen = document.getElementById('results-screen');

        // Difficulty buttons
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
        this.startBtn = document.getElementById('start-btn');

        // Game elements
        this.textDisplay = document.getElementById('text-display');
        this.typingInput = document.getElementById('typing-input');
        this.wpmEl = document.getElementById('wpm');
        this.accuracyEl = document.getElementById('accuracy');
        this.timerEl = document.getElementById('timer');
        this.restartBtn = document.getElementById('restart-btn');

        // Race cars
        this.playerCar = document.getElementById('player-car');
        this.opponent1Car = document.getElementById('opponent1-car');
        this.opponent2Car = document.getElementById('opponent2-car');

        // Progress bars
        this.playerProgress = document.getElementById('player-progress');
        this.opponent1Progress = document.getElementById('opponent1-progress');
        this.opponent2Progress = document.getElementById('opponent2-progress');

        // Results elements
        this.resultsTrophy = document.getElementById('results-trophy');
        this.resultsTitle = document.getElementById('results-title');
        this.finalWpm = document.getElementById('final-wpm');
        this.finalAccuracy = document.getElementById('final-accuracy');
        this.finalTime = document.getElementById('final-time');
        this.finalPosition = document.getElementById('final-position');
        this.raceAgainBtn = document.getElementById('race-again-btn');
        this.changeDifficultyBtn = document.getElementById('change-difficulty-btn');

        // Header stats
        this.bestWpmEl = document.getElementById('best-wpm');
        this.racesWonEl = document.getElementById('races-won');
    }

    attachEventListeners() {
        // Difficulty selection
        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.difficulty;
            });
        });

        // Start button
        this.startBtn.addEventListener('click', () => this.startRace());

        // Typing input
        this.typingInput.addEventListener('input', (e) => this.handleTyping(e));

        // Restart button
        this.restartBtn.addEventListener('click', () => this.resetRace());

        // Results buttons
        this.raceAgainBtn.addEventListener('click', () => this.raceAgain());
        this.changeDifficultyBtn.addEventListener('click', () => this.backToStart());
    }

    loadStats() {
        const stats = JSON.parse(localStorage.getItem('typeRacesStats') || '{"bestWpm": 0, "racesWon": 0}');
        this.bestWpmEl.textContent = stats.bestWpm;
        this.racesWonEl.textContent = stats.racesWon;
    }

    saveStats(wpm, position) {
        const stats = JSON.parse(localStorage.getItem('typeRacesStats') || '{"bestWpm": 0, "racesWon": 0}');

        if (wpm > stats.bestWpm) {
            stats.bestWpm = Math.round(wpm);
            this.bestWpmEl.textContent = stats.bestWpm;
        }

        if (position === 1) {
            stats.racesWon++;
            this.racesWonEl.textContent = stats.racesWon;
        }

        localStorage.setItem('typeRacesStats', JSON.stringify(stats));
    }

    startRace() {
        // Hide start screen, show game screen
        this.startScreen.classList.add('hidden');
        this.gameScreen.classList.add('active');

        // Get random text
        const texts = this.texts[this.difficulty];
        this.currentText = texts[Math.floor(Math.random() * texts.length)];
        this.totalChars = this.currentText.length;

        // Reset game state
        this.currentCharIndex = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.gameState = 'countdown';

        // Reset progress
        this.updateCarPosition(this.playerCar, this.playerProgress, 0);
        this.updateCarPosition(this.opponent1Car, this.opponent1Progress, 0);
        this.updateCarPosition(this.opponent2Car, this.opponent2Progress, 0);

        // Start countdown
        this.startCountdown();
    }

    startCountdown() {
        let count = 3;
        this.textDisplay.innerHTML = `<span class="countdown" id="countdown">${count}</span>`;

        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                const countdownEl = document.getElementById('countdown');
                if (countdownEl) {
                    countdownEl.textContent = count;
                    // Trigger animation
                    countdownEl.style.animation = 'none';
                    setTimeout(() => countdownEl.style.animation = 'countdown-pulse 1s ease-in-out', 10);
                }
            } else {
                clearInterval(countdownInterval);
                this.startTyping();
            }
        }, 1000);
    }

    startTyping() {
        this.gameState = 'racing';
        this.startTime = Date.now();
        this.displayText();
        this.typingInput.disabled = false;
        this.typingInput.value = '';
        this.typingInput.focus();

        // Start timer
        this.timerInterval = setInterval(() => this.updateTimer(), 100);

        // Start opponents
        this.startOpponents();
    }

    displayText() {
        let html = '';
        for (let i = 0; i < this.currentText.length; i++) {
            const char = this.currentText[i];
            let className = 'char';

            if (i < this.currentCharIndex) {
                // Check if correct from our tracking
                className += ' correct';
            } else if (i === this.currentCharIndex) {
                className += ' current';
            }

            if (char === ' ') {
                html += `<span class="${className}">&nbsp;</span>`;
            } else {
                html += `<span class="${className}">${char}</span>`;
            }
        }
        this.textDisplay.innerHTML = html;
    }

    handleTyping(e) {
        if (this.gameState !== 'racing') return;

        const typedText = e.target.value;
        const expectedText = this.currentText.substring(0, typedText.length);

        // Update character styling
        this.currentCharIndex = typedText.length;

        // Count correct and incorrect
        this.correctChars = 0;
        this.incorrectChars = 0;

        for (let i = 0; i < typedText.length; i++) {
            if (typedText[i] === this.currentText[i]) {
                this.correctChars++;
            } else {
                this.incorrectChars++;
            }
        }

        // Update display with correct/incorrect styling
        let html = '';
        for (let i = 0; i < this.currentText.length; i++) {
            const char = this.currentText[i];
            let className = 'char';

            if (i < typedText.length) {
                if (typedText[i] === this.currentText[i]) {
                    className += ' correct';
                } else {
                    className += ' incorrect';
                }
            } else if (i === typedText.length) {
                className += ' current';
            }

            if (char === ' ') {
                html += `<span class="${className}">&nbsp;</span>`;
            } else {
                html += `<span class="${className}">${char}</span>`;
            }
        }
        this.textDisplay.innerHTML = html;

        // Update stats
        this.updateStats();

        // Update player position
        const progress = (typedText.length / this.totalChars) * 100;
        this.updateCarPosition(this.playerCar, this.playerProgress, progress);

        // Check if finished
        if (typedText === this.currentText) {
            this.finishRace();
        }
    }

    updateTimer() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.timerEl.textContent = `${elapsed.toFixed(1)}s`;
    }

    updateStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;

        // Calculate WPM (assuming average word length of 5 characters)
        const wordsTyped = this.correctChars / 5;
        const minutes = elapsed / 60;
        const wpm = minutes > 0 ? Math.round(wordsTyped / minutes) : 0;
        this.wpmEl.textContent = wpm;

        // Calculate accuracy
        const totalTyped = this.correctChars + this.incorrectChars;
        const accuracy = totalTyped > 0 ? Math.round((this.correctChars / totalTyped) * 100) : 100;
        this.accuracyEl.textContent = `${accuracy}%`;
    }

    updateCarPosition(carEl, progressEl, percentage) {
        const maxPosition = 85; // Leave space for finish line
        const position = (percentage / 100) * maxPosition;
        carEl.style.left = `${position}%`;
        progressEl.style.width = `${percentage}%`;
    }

    startOpponents() {
        // Opponent 1 - Slightly slower than player on average
        const opponent1Speed = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
        const opponent1Interval = setInterval(() => {
            if (this.gameState !== 'racing') {
                clearInterval(opponent1Interval);
                return;
            }

            const currentProgress = parseFloat(this.opponent1Progress.style.width) || 0;
            const newProgress = Math.min(currentProgress + opponent1Speed, 100);
            this.updateCarPosition(this.opponent1Car, this.opponent1Progress, newProgress);

            if (newProgress >= 100) {
                clearInterval(opponent1Interval);
            }
        }, 200);

        this.opponentIntervals.push(opponent1Interval);

        // Opponent 2 - Even slower
        const opponent2Speed = 0.6 + Math.random() * 0.4; // 0.6 - 1.0
        const opponent2Interval = setInterval(() => {
            if (this.gameState !== 'racing') {
                clearInterval(opponent2Interval);
                return;
            }

            const currentProgress = parseFloat(this.opponent2Progress.style.width) || 0;
            const newProgress = Math.min(currentProgress + opponent2Speed, 100);
            this.updateCarPosition(this.opponent2Car, this.opponent2Progress, newProgress);

            if (newProgress >= 100) {
                clearInterval(opponent2Interval);
            }
        }, 200);

        this.opponentIntervals.push(opponent2Interval);
    }

    finishRace() {
        this.gameState = 'finished';
        clearInterval(this.timerInterval);
        this.opponentIntervals.forEach(interval => clearInterval(interval));

        // Calculate final stats
        const elapsed = (Date.now() - this.startTime) / 1000;
        const wordsTyped = this.correctChars / 5;
        const minutes = elapsed / 60;
        const wpm = minutes > 0 ? Math.round(wordsTyped / minutes) : 0;
        const totalTyped = this.correctChars + this.incorrectChars;
        const accuracy = totalTyped > 0 ? Math.round((this.correctChars / totalTyped) * 100) : 100;

        // Calculate position
        const playerProgress = parseFloat(this.playerProgress.style.width) || 0;
        const opponent1Progress = parseFloat(this.opponent1Progress.style.width) || 0;
        const opponent2Progress = parseFloat(this.opponent2Progress.style.width) || 0;

        let position = 1;
        if (opponent1Progress > playerProgress) position++;
        if (opponent2Progress > playerProgress) position++;

        // Show results
        this.showResults(wpm, accuracy, elapsed, position);

        // Save stats
        this.saveStats(wpm, position);
    }

    showResults(wpm, accuracy, time, position) {
        this.finalWpm.textContent = wpm;
        this.finalAccuracy.textContent = `${accuracy}%`;
        this.finalTime.textContent = `${time.toFixed(1)}s`;

        const positions = ['1st', '2nd', '3rd'];
        this.finalPosition.textContent = positions[position - 1];

        // Update trophy and title based on position
        if (position === 1) {
            this.resultsTrophy.innerHTML = '<div class="trophy-icon">🏆</div>';
            this.resultsTitle.textContent = 'Victory!';
        } else if (position === 2) {
            this.resultsTrophy.innerHTML = '<div class="trophy-icon">🥈</div>';
            this.resultsTitle.textContent = 'Second Place!';
        } else {
            this.resultsTrophy.innerHTML = '<div class="trophy-icon">🥉</div>';
            this.resultsTitle.textContent = 'Third Place';
        }

        this.resultsScreen.classList.add('active');
    }

    resetRace() {
        // Stop current race
        this.gameState = 'idle';
        clearInterval(this.timerInterval);
        this.opponentIntervals.forEach(interval => clearInterval(interval));
        this.opponentIntervals = [];

        // Start new race with same difficulty
        this.startRace();
    }

    raceAgain() {
        this.resultsScreen.classList.remove('active');
        this.resetRace();
    }

    backToStart() {
        this.resultsScreen.classList.remove('active');
        this.gameScreen.classList.remove('active');
        this.startScreen.classList.remove('hidden');

        // Reset game state
        this.gameState = 'idle';
        clearInterval(this.timerInterval);
        this.opponentIntervals.forEach(interval => clearInterval(interval));
        this.opponentIntervals = [];

        this.typingInput.value = '';
        this.typingInput.disabled = true;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new TypeRacesGame();
});
