const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Control Buttons
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Game constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
let GAME_SPEED = 100;

// Assets
const catImage = new Image();
catImage.src = 'cat.png';

// Game state
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let snake = [];
let food = { x: 0, y: 0, colorHue: 0 };
let dx = 0;
let dy = 0;
let gameLoop;
let isGameRunning = false;

// Initialize high score display
highScoreElement.textContent = highScore;

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
document.addEventListener('keydown', handleKeyPress);

// Touch/Click Controls
function handleControl(direction) {
    if (!isGameRunning) return;

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    switch (direction) {
        case 'UP': if (!goingDown) { dx = 0; dy = -1; } break;
        case 'DOWN': if (!goingUp) { dx = 0; dy = 1; } break;
        case 'LEFT': if (!goingRight) { dx = -1; dy = 0; } break;
        case 'RIGHT': if (!goingLeft) { dx = 1; dy = 0; } break;
    }
}

btnUp.addEventListener('click', () => handleControl('UP'));
btnDown.addEventListener('click', () => handleControl('DOWN'));
btnLeft.addEventListener('click', () => handleControl('LEFT'));
btnRight.addEventListener('click', () => handleControl('RIGHT'));

// Prevent double tap zoom on buttons
const preventZoom = (e) => {
    e.preventDefault();
    e.target.click();
};

[btnUp, btnDown, btnLeft, btnRight].forEach(btn => {
    btn.addEventListener('touchstart', preventZoom, { passive: false });
});


// Swipe Controls (Keep existing swipe logic as backup)
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!isGameRunning) return;
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isGameRunning) return;

    // If target is a button, don't process swipe
    if (e.target.classList.contains('control-btn')) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) { // Threshold
            if (diffX > 0) handleControl('RIGHT');
            else handleControl('LEFT');
        }
    } else {
        if (Math.abs(diffY) > 30) {
            if (diffY > 0) handleControl('DOWN');
            else handleControl('UP');
        }
    }
});

function startGame() {
    // Set speed based on difficulty
    const difficulty = document.getElementById('difficulty').value;
    switch (difficulty) {
        case 'easy': GAME_SPEED = 150; break;
        case 'normal': GAME_SPEED = 100; break;
        case 'hard': GAME_SPEED = 60; break;
        default: GAME_SPEED = 100;
    }

    snake = [
        { x: 10, y: 10, hue: 0 },
        { x: 9, y: 10, hue: 30 },
        { x: 8, y: 10, hue: 60 }
    ];
    score = 0;
    dx = 1;
    dy = 0;
    scoreElement.textContent = score;
    isGameRunning = true;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    createFood();

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

function createFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT),
        colorHue: Math.floor(Math.random() * 360) // Random color for food
    };

    snake.forEach(segment => {
        if (segment.x === food.x && segment.y === food.y) {
            createFood();
        }
    });
}

function handleKeyPress(e) {
    if (!isGameRunning) {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
    }

    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    const keyPressed = e.keyCode;

    if (keyPressed === LEFT_KEY) handleControl('LEFT');
    if (keyPressed === UP_KEY) handleControl('UP');
    if (keyPressed === RIGHT_KEY) handleControl('RIGHT');
    if (keyPressed === DOWN_KEY) handleControl('DOWN');
}

function update() {
    moveSnake();
    if (checkCollision()) {
        gameOver();
        return;
    }
    checkFood();
    draw();
}

function moveSnake() {
    const head = {
        x: snake[0].x + dx,
        y: snake[0].y + dy,
        hue: snake[0].hue // Keep head hue or change it? Let's keep it consistent or cycle
    };
    snake.unshift(head);
    snake.pop();
}

function checkCollision() {
    const head = snake[0];

    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return true;
    }

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    return false;
}

function checkFood() {
    const head = snake[0];
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;

        // Add new segment with the food's color/hue
        snake.push({ x: snake[snake.length - 1].x, y: snake[snake.length - 1].y, hue: food.colorHue });

        createFood();

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highScoreElement.textContent = highScore;
        }
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#fff0f5'; // Lavender Blush background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#ffe6f2';
    ctx.lineWidth = 1;
    for (let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw Snake
    snake.forEach((segment, index) => {
        const x = segment.x * GRID_SIZE;
        const y = segment.y * GRID_SIZE;

        // Use filter to change color of the cat image
        // If it's the head, maybe no filter or specific one
        // For body, use the stored hue

        ctx.save();
        if (index === 0) {
            // Head
            ctx.filter = 'none';
        } else {
            // Body - rotate hue to make them look different
            ctx.filter = `hue-rotate(${segment.hue}deg)`;
        }

        if (catImage.complete) {
            ctx.drawImage(catImage, x, y, GRID_SIZE, GRID_SIZE);
        } else {
            // Fallback if image not loaded
            ctx.fillStyle = index === 0 ? '#ff69b4' : `hsl(${segment.hue}, 100%, 70%)`;
            ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
        }
        ctx.restore();
    });

    // Draw Food
    const fx = food.x * GRID_SIZE;
    const fy = food.y * GRID_SIZE;

    ctx.save();
    ctx.filter = `hue-rotate(${food.colorHue}deg)`;
    if (catImage.complete) {
        ctx.drawImage(catImage, fx, fy, GRID_SIZE, GRID_SIZE);
    } else {
        ctx.fillStyle = '#ff1493';
        ctx.fillRect(fx, fy, GRID_SIZE, GRID_SIZE);
    }
    ctx.restore();
}
