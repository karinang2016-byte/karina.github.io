const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas resolution (retro feel)
const width = 320;
const height = 240;
canvas.width = width;
canvas.height = height;

// Game State
let gameState = 'start'; // start, playing, gameover
let position = 0;
let playerX = 0;
let speed = 0;
const maxSpeed = 6000; // segment units per frame roughly
const accel = 30;
const breaking = 60;
const decel = 10;
const offRoadDecel = 100;
const offRoadLimit = 1500; // speed limit when offroad
const segmentLength = 200; // length of one segment
const trackLength = 0; // calculated later
const fov = 100;
const cameraHeight = 1000;
const cameraDepth = 0.84; // 1 / tan((fov/2) * pi/180)
const drawDistance = 300; // number of segments to draw
const roadWidth = 2000; // actually half width

let keyLeft = false;
let keyRight = false;
let keyUp = false;
let keyDown = false;

// Assets
const sprites = {
    player: new Image(),
    background: new Image(),
    opponent: new Image(),
    tree: new Image()
};

let assetsLoaded = 0;
const totalAssets = 4;

function onAssetLoad() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        console.log("All assets loaded");
        // Initial render if needed
    }
}

sprites.player.onload = onAssetLoad;
sprites.background.onload = onAssetLoad;
sprites.opponent.onload = onAssetLoad;
sprites.tree.onload = onAssetLoad;

sprites.player.src = 'player.png';
sprites.background.src = 'background.png';
sprites.opponent.src = 'opponent.png';
sprites.tree.src = 'tree.png';

// Chroma Key Helper
function applyChromaKey(image, r, g, b) {
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const cx = c.getContext('2d');
    cx.drawImage(image, 0, 0);
    const imgData = cx.getImageData(0, 0, c.width, c.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        // Simple distance check or exact match
        if (data[i] < 50 && data[i + 1] > 200 && data[i + 2] < 50) { // Bright Green
            data[i + 3] = 0; // Alpha 0
        }
    }
    cx.putImageData(imgData, 0, 0);
    const newImg = new Image();
    newImg.src = c.toDataURL();
    return newImg;
}

sprites.player.onload = () => {
    // Apply chroma key once loaded
    sprites.player = applyChromaKey(sprites.player, 0, 255, 0);
    onAssetLoad();
};

// Track Generation
const segments = [];

function addSegment(curve) {
    const n = segments.length;
    segments.push({
        index: n,
        p1: { world: { z: n * segmentLength }, camera: {}, screen: {} },
        p2: { world: { z: (n + 1) * segmentLength }, camera: {}, screen: {} },
        curve: curve,
        color: Math.floor(n / 3) % 2 ? { road: '#666', grass: '#1ca51c', rumble: '#fff' } : { road: '#6b6b6b', grass: '#1ec21e', rumble: '#c00' },
        sprites: []
    });
}

function addRoad(enter, hold, leave, curve) {
    for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter));
    for (let n = 0; n < hold; n++) addSegment(curve);
    for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave));
}

function easeIn(a, b, percent) { return a + (b - a) * Math.pow(percent, 2); }
function easeInOut(a, b, percent) { return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5); }

// Build Track
for (let n = 0; n < 500; n++) addSegment(0); // Start straight
addRoad(50, 50, 50, 2);
addRoad(50, 50, 50, -2);
addRoad(50, 50, 50, 4);
addRoad(50, 50, 50, -4);
for (let n = 0; n < 200; n++) addSegment(0); // End straight

const trackSize = segments.length * segmentLength;

// Add some trees and opponents
for (let n = 20; n < segments.length - 20; n += 10) {
    if (Math.random() > 0.5) {
        segments[n].sprites.push({ source: sprites.tree, offset: -2 - Math.random() * 3 });
    } else {
        segments[n].sprites.push({ source: sprites.tree, offset: 2 + Math.random() * 3 });
    }

    // Add opponents occasionally
    if (n % 50 === 0) {
        segments[n].sprites.push({ source: sprites.opponent, offset: (Math.random() * 1) - 0.5 });
    }
}

// Input Handling
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft': keyLeft = true; break;
        case 'ArrowRight': keyRight = true; break;
        case 'ArrowUp': keyUp = true; break;
        case 'ArrowDown': keyDown = true; break;
        case 'Enter':
            if (gameState === 'start') {
                gameState = 'playing';
                document.getElementById('start-screen').classList.add('hidden');
                gameLoop();
            }
            break;
    }
});

// Touch Controls
const setupTouch = (id, keyStart, keyEnd) => {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keyStart(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keyEnd(); });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); keyStart(); });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); keyEnd(); });
};

setupTouch('btn-left', () => keyLeft = true, () => keyLeft = false);
setupTouch('btn-right', () => keyRight = true, () => keyRight = false);
setupTouch('btn-gas', () => keyUp = true, () => keyUp = false);
setupTouch('btn-brake', () => keyDown = true, () => keyDown = false);

// Start screen touch
document.getElementById('start-screen').addEventListener('touchstart', () => {
    if (gameState === 'start') {
        gameState = 'playing';
        document.getElementById('start-screen').classList.add('hidden');
        gameLoop();
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowLeft': keyLeft = false; break;
        case 'ArrowRight': keyRight = false; break;
        case 'ArrowUp': keyUp = false; break;
        case 'ArrowDown': keyDown = false; break;
    }
});

// Math Helpers
function project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
}

function renderPolygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

function renderSprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, clipY) {
    const destW = (sprite.width * scale * width / 2) * (1 / 80); // Scale factor adjustment
    const destH = (sprite.height * scale * width / 2) * (1 / 80);

    destX = destX + (destW * (sprite.offset || 0));
    destY = destY + (-1 * destH);

    const clipH = clipY ? Math.max(0, destY + destH - clipY) : 0;
    if (clipH < destH) {
        ctx.drawImage(sprite.source, 0, 0, sprite.source.width, sprite.source.height - (sprite.source.height * clipH / destH), destX, destY, destW, destH - clipH);
    }
}

// Main Loop
function update(dt) {
    if (gameState !== 'playing') return;

    position += speed * dt;
    while (position >= trackSize) position -= trackSize;
    while (position < 0) position += trackSize;

    const startPos = position / segmentLength;
    const playerSegment = segments[Math.floor(startPos)];

    // Speed control
    if (keyUp) speed += accel;
    else if (keyDown) speed -= breaking;
    else speed -= decel;

    // Steering
    if (keyLeft) playerX -= (speed / maxSpeed) * 0.05; // Steering depends on speed
    if (keyRight) playerX += (speed / maxSpeed) * 0.05;

    // Centering force (optional)
    playerX -= playerX * 0.01 * (speed / maxSpeed);

    // Offroad physics
    if ((playerX < -1 || playerX > 1) && speed > offRoadLimit) {
        speed -= offRoadDecel;
    }

    // Clamp speed
    speed = Math.max(0, Math.min(speed, maxSpeed));

    // Update UI
    document.getElementById('scoreValue').innerText = Math.floor(position / 100);
    document.getElementById('speedValue').innerText = Math.floor(speed / 100);
}

function render() {
    ctx.clearRect(0, 0, width, height);

    // Render Background
    // Simple parallax can be added here by shifting source X based on playerX/curve
    ctx.drawImage(sprites.background, 0, 0, width, height);

    const startPos = position;
    const startSegmentIndex = Math.floor(startPos / segmentLength);
    const baseSegment = segments[startSegmentIndex % segments.length];
    const maxy = height;
    let clipBottomLine = maxy;

    let x = 0;
    let dx = -(baseSegment.curve * (startPos % segmentLength) / segmentLength);

    // Draw Road
    for (let n = 0; n < drawDistance; n++) {
        const segment = segments[(startSegmentIndex + n) % segments.length];
        const looped = segment.index < baseSegment.index;
        const cameraZ = position - (looped ? trackSize : 0);
        const cameraX = playerX * roadWidth;

        // Curve calculation
        x += dx;
        dx += segment.curve;

        project(segment.p1, (playerX * roadWidth) - x, cameraHeight, position - (looped ? trackSize : 0), cameraDepth, width, height, roadWidth);
        project(segment.p2, (playerX * roadWidth) - x - dx, cameraHeight, position - (looped ? trackSize : 0), cameraDepth, width, height, roadWidth);

        if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= clipBottomLine) continue;

        renderPolygon(ctx, 0, segment.p2.screen.y, width, segment.p2.screen.y, width, segment.p1.screen.y, 0, segment.p1.screen.y, segment.color.grass);
        renderPolygon(ctx, segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y, segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y, segment.p2.screen.x, segment.p2.screen.y, segment.color.road);

        // Rumble strips
        const rumbleW1 = segment.p1.screen.w / 5;
        const rumbleW2 = segment.p2.screen.w / 5;
        renderPolygon(ctx, segment.p1.screen.x - rumbleW1, segment.p1.screen.y, segment.p1.screen.x, segment.p1.screen.y, segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.x - rumbleW2, segment.p2.screen.y, segment.color.rumble);
        renderPolygon(ctx, segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y, segment.p1.screen.x + segment.p1.screen.w + rumbleW1, segment.p1.screen.y, segment.p2.screen.x + segment.p2.screen.w + rumbleW2, segment.p2.screen.y, segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y, segment.color.rumble);

        clipBottomLine = segment.p2.screen.y;
    }

    // Draw Sprites (Painters algorithm - back to front)
    for (let n = drawDistance - 1; n > 0; n--) {
        const segment = segments[(startSegmentIndex + n) % segments.length];
        // Loop through sprites in segment
        for (let i = 0; i < segment.sprites.length; i++) {
            const sprite = segment.sprites[i];
            const spriteScale = segment.p1.screen.scale;
            const spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * roadWidth * width / 2);
            const spriteY = segment.p1.screen.y;
            renderSprite(ctx, width, height, width, roadWidth, sprites, { source: sprite.source, width: 64, height: 64, offset: 0 }, spriteScale, spriteX, spriteY, null);
        }
    }

    // Draw Player
    // Player is always at screen bottom center
    const playerScale = 1.5; // Scale up the sprite
    const playerW = 64 * playerScale;
    const playerH = 64 * playerScale;
    // Bounce effect
    const bounce = (1.5 + Math.sin(Date.now() / 100)) * (speed / maxSpeed) * 2;

    ctx.drawImage(sprites.player, (width / 2) - (playerW / 2), height - playerH - 10 - bounce, playerW, playerH);
}

let lastTime = 0;
function gameLoop(time) {
    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    update(dt || 1 / 60);
    render();

    requestAnimationFrame(gameLoop);
}

// Start loop to render start screen background (optional)
// requestAnimationFrame(gameLoop);
