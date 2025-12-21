// =====================
// Skyfall Game Logic
// =====================

class SkyfallGame {
    constructor() {
        this.isActive = false;
        this.score = 0;
        this.lives = 3; // Hidden mechanic, or just game over on miss
        this.spawnRate = 2000;
        this.fallSpeed = 1; // Pixels per frame
        this.words = [];
        this.animationFrame = null;
        this.lastSpawnTime = 0;
        this.difficultyMultiplier = 1;

        // DOM Elements
        this.canvas = document.getElementById('skyfall-canvas');
        this.input = document.getElementById('game-input');
        this.scoreEl = document.getElementById('game-score');

        // Word List (Shared with main app effectively)
        this.wordList = [
            "code", "java", "script", "web", "html", "css", "node", "react", "vue", "angular",
            "server", "client", "data", "base", "api", "rest", "json", "ajax", "query", "stack",
            "heap", "loop", "func", "class", "object", "array", "string", "number", "boolean",
            "null", "void", "async", "await", "promise", "scope", "closure", "this", "super",
            "bind", "call", "apply", "map", "filter", "reduce", "sort", "find", "push", "pop",
            "shift", "main", "int", "char", "float", "double", "long", "short", "byte", "void"
        ]; // Short words for game
    }

    init() {
        this.input.addEventListener('input', (e) => this.handleInput(e));
        document.getElementById('start-skyfall-btn').addEventListener('click', () => this.startGame());
        document.getElementById('exit-game-btn').addEventListener('click', () => this.stopGame());
    }

    startGame() {
        // UI Setup
        document.querySelector('.games-grid').style.display = 'none';
        document.getElementById('game-arena').style.display = 'block';
        this.input.focus();

        // Reset State
        this.isActive = true;
        this.score = 0;
        this.scoreEl.innerText = '0';
        this.spawnRate = 2000;
        this.fallSpeed = 1.5; // Start speed
        this.difficultyMultiplier = 1;
        this.words = [];
        this.canvas.innerHTML = '';

        this.gameLoop();
    }

    stopGame() {
        this.isActive = false;
        cancelAnimationFrame(this.animationFrame);
        document.getElementById('game-arena').style.display = 'none';
        document.querySelector('.games-grid').style.display = 'grid';

        // Save score if logged in
        if (this.score > 0) {
            this.saveScore();
        }
    }

    async saveScore() {
        try {
            await fetch('/api/games/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: this.score, gameType: 'falling_words' })
            });
            // Could trigger leaderboard refresh here
        } catch (e) {
            console.error("Failed to save score", e);
        }
    }

    spawnWord() {
        const text = this.wordList[Math.floor(Math.random() * this.wordList.length)];
        const wordEl = document.createElement('div');
        wordEl.className = 'falling-word';
        wordEl.innerText = text;

        // Random X position (keep within bounds)
        const maxX = this.canvas.clientWidth - 100;
        const x = Math.floor(Math.random() * maxX);

        wordEl.style.left = `${x}px`;
        wordEl.style.top = '-30px';

        this.canvas.appendChild(wordEl);

        this.words.push({
            id: Date.now() + Math.random(),
            text: text,
            el: wordEl,
            x: x,
            y: -30
        });
    }

    gameLoop(timestamp) {
        if (!this.isActive) return;

        // Spawn logic
        if (!this.lastSpawnTime || timestamp - this.lastSpawnTime > this.spawnRate) {
            this.spawnWord();
            this.lastSpawnTime = timestamp;

            // Difficulty scaling
            if (this.spawnRate > 500) this.spawnRate -= 10;
            this.fallSpeed += 0.005;
        }

        // Update words
        const canvasHeight = this.canvas.clientHeight;

        for (let i = this.words.length - 1; i >= 0; i--) {
            const word = this.words[i];
            word.y += this.fallSpeed;
            word.el.style.top = `${word.y}px`;

            // Game Over Check
            if (word.y > canvasHeight - 20) {
                this.gameOver();
                return;
            }
        }

        this.animationFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleInput(e) {
        const typed = e.target.value.trim();

        // Find matching word (simplest version: match exact word)
        // Advanced: highlight matching prefixes

        // Check for exact matches
        const matchIndex = this.words.findIndex(w => w.text === typed);

        if (matchIndex !== -1) {
            // Destroy word
            const word = this.words[matchIndex];
            word.el.remove();
            this.words.splice(matchIndex, 1);

            // Update score
            this.score += 10 * Math.ceil(this.fallSpeed);
            this.scoreEl.innerText = this.score;

            // Clear input
            this.input.value = '';

            // Play sound effect (optional)
        } else {
            // Highlight partial matches? 
            // For now just keep input. If user mistypes, they backspace manually or type other words.
            // Auto-clearing on mismatch is annoying if there are multiple similar words.
            // Simplest is manual clearing or clearing on success. 
        }

        // Highlight logic (visual flair)
        this.words.forEach(w => {
            if (w.text.startsWith(typed) && typed.length > 0) {
                w.el.classList.add('highlight');
            } else {
                w.el.classList.remove('highlight');
            }
        });
    }

    gameOver() {
        this.isActive = false;
        cancelAnimationFrame(this.animationFrame);
        alert(`Game Over! Score: ${this.score}`);
        this.stopGame();
    }
}

// Initialize
const skyfall = new SkyfallGame();
document.addEventListener('DOMContentLoaded', () => skyfall.init());
