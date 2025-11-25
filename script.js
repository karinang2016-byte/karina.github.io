const pizzaBase = document.getElementById('pizza-base');
const toppingsLayer = document.getElementById('toppings-layer');
const toppingsContainer = document.getElementById('toppings-container');
const bakeBtn = document.getElementById('bake-btn');

let activeTopping = null;
let isDragging = false;
let startX, startY;
let initialLeft, initialTop;

// --- Event Listeners for Ingredients (Spawning) ---

toppingsContainer.addEventListener('click', (e) => {
    const ingredient = e.target.closest('.ingredient');
    if (ingredient) {
        spawnTopping(ingredient);
    }
});

// Also support dragging from the palette directly? 
// For simplicity in this version, tapping adds to center, then you move it.
// OR: We can implement drag-from-palette. Let's stick to "Tap to spawn at center" 
// or "Tap to spawn at random position" for easier mobile interaction initially, 
// but the prompt said "drag and drop toppings onto the pizza".
// Let's try: Tap ingredient -> spawns on pizza -> user drags it. 
// This is safer for touch than dragging from a scrollable container.

function spawnTopping(ingredientElement) {
    const type = ingredientElement.dataset.type;
    const visual = ingredientElement.dataset.visual;

    const newTopping = document.createElement('div');
    newTopping.textContent = visual;
    newTopping.classList.add('topping-on-pizza');
    newTopping.dataset.type = type;

    // Random position near center
    const randomX = 50 + (Math.random() * 20 - 10);
    const randomY = 50 + (Math.random() * 20 - 10);

    newTopping.style.left = `${randomX}%`;
    newTopping.style.top = `${randomY}%`;

    toppingsLayer.appendChild(newTopping);

    // Add drag events to the new topping
    addDragEvents(newTopping);
}

// --- Drag and Drop Logic ---

function addDragEvents(element) {
    // Touch events
    element.addEventListener('touchstart', handleDragStart, { passive: false });
    element.addEventListener('touchmove', handleDragMove, { passive: false });
    element.addEventListener('touchend', handleDragEnd);

    // Mouse events (for testing on PC)
    element.addEventListener('mousedown', handleDragStart);
}

function handleDragStart(e) {
    if (e.target.classList.contains('topping-on-pizza')) {
        e.preventDefault(); // Prevent scrolling
        activeTopping = e.target;
        isDragging = true;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Get current position relative to the pizza base
        const rect = activeTopping.getBoundingClientRect();
        const baseRect = pizzaBase.getBoundingClientRect();

        // Calculate offset from the center of the topping
        startX = clientX;
        startY = clientY;

        // We need to work with the element's current style or computed style
        // But since we set left/top in %, it's tricky. 
        // Let's switch to pixels during drag for precision, then back to % or keep pixels?
        // Keeping pixels is easier for drag.

        // Convert current % position to pixels if needed, or just rely on visual position
        activeTopping.style.left = (rect.left - baseRect.left + rect.width / 2) + 'px';
        activeTopping.style.top = (rect.top - baseRect.top + rect.height / 2) + 'px';
    }
}

function handleDragMove(e) {
    if (!isDragging || !activeTopping) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const baseRect = pizzaBase.getBoundingClientRect();

    // Calculate new position relative to pizza base
    let newX = clientX - baseRect.left;
    let newY = clientY - baseRect.top;

    // Boundary checks (keep inside pizza roughly)
    // Pizza is circle, but simple box check is fine for now, or radius check
    // Radius check:
    const radius = baseRect.width / 2;
    const centerX = baseRect.width / 2;
    const centerY = baseRect.height / 2;

    const dist = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));

    // If outside, clamp to edge (optional, but nice)
    if (dist > radius - 20) { // -20 for padding
        const angle = Math.atan2(newY - centerY, newX - centerX);
        newX = centerX + (radius - 20) * Math.cos(angle);
        newY = centerY + (radius - 20) * Math.sin(angle);
    }

    activeTopping.style.left = `${newX}px`;
    activeTopping.style.top = `${newY}px`;
}

function handleDragEnd(e) {
    isDragging = false;
    activeTopping = null;
}

// --- Global Mouse Move/Up for smoother dragging if mouse leaves element ---
document.addEventListener('mousemove', (e) => {
    if (isDragging) handleDragMove(e);
});

document.addEventListener('mouseup', (e) => {
    if (isDragging) handleDragEnd(e);
});


// --- Bake Functionality ---

bakeBtn.addEventListener('click', () => {
    pizzaBase.classList.add('baked');
    bakeBtn.textContent = "美味的披薩完成了!";
    bakeBtn.disabled = true;

    // Confetti or celebration could go here
    setTimeout(() => {
        alert("披薩烤好了！");
        // Reset option?
        if (confirm("再做一個？")) {
            resetGame();
        }
    }, 1500);
});

function resetGame() {
    pizzaBase.classList.remove('baked');
    toppingsLayer.innerHTML = '';
    bakeBtn.textContent = "烘烤披薩!";
    bakeBtn.disabled = false;
}
