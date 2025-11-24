document.addEventListener('DOMContentLoaded', () => {
    console.log('Beading Game Initialized');

    const beadPalette = document.getElementById('bead-palette');
    const beadsOnStringContainer = document.getElementById('beads-on-string');
    const stringContainer = document.querySelector('.string-container');
    const stringLine = document.getElementById('string-line');
    const resetBtn = document.getElementById('reset-btn');
    const undoBtn = document.getElementById('undo-btn');

    // Modal Elements
    const modal = document.getElementById('bead-modal');
    const modalColorPicker = document.getElementById('modal-color-picker');
    const modalDeleteBtn = document.getElementById('modal-delete-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // State
    let currentBeads = [];
    let editingBeadIndex = -1;
    let dragSrcIndex = -1;

    // Bead Data
    const beadTypes = [
        { id: 'red', color: '#ff6b6b' },
        { id: 'orange', color: '#feca57' },
        { id: 'yellow', color: '#ff9f43' },
        { id: 'green', color: '#1dd1a1' },
        { id: 'blue', color: '#54a0ff' },
        { id: 'purple', color: '#5f27cd' },
        { id: 'pink', color: '#ff9ff3' },
        { id: 'white', color: '#c8d6e5' },
        { id: 'black', color: '#222f3e' },
        { id: 'gold', color: 'radial-gradient(circle at 30% 30%, #ffd700, #b8860b)' },
        { id: 'pearl', color: 'radial-gradient(circle at 30% 30%, #ffffff, #dcdde1)' }
    ];

    // Initialize Palette
    function initPalette() {
        beadTypes.forEach(bead => {
            const beadEl = document.createElement('div');
            beadEl.classList.add('bead-option');
            applyColor(beadEl, bead.color);
            beadEl.addEventListener('click', () => addBead(bead));
            beadPalette.appendChild(beadEl);
        });

        // Init Modal Color Picker
        beadTypes.forEach(bead => {
            const colorEl = document.createElement('div');
            colorEl.classList.add('color-option');
            applyColor(colorEl, bead.color);
            colorEl.addEventListener('click', () => {
                if (editingBeadIndex > -1) {
                    currentBeads[editingBeadIndex].color = bead.color;
                    currentBeads[editingBeadIndex].id = bead.id;
                    renderBeads();
                    closeModal();
                }
            });
            modalColorPicker.appendChild(colorEl);
        });
    }

    function applyColor(element, color) {
        if (color.includes('gradient')) {
            element.style.background = color;
        } else {
            element.style.backgroundColor = color;
        }
    }

    // Add Bead to String
    function addBead(beadData) {
        // Clone data to avoid reference issues, add default rotation
        currentBeads.push({
            ...beadData,
            rotationX: 0,
            rotationY: 0
        });
        renderBeads();
        // Scroll to end
        setTimeout(() => {
            stringContainer.scrollLeft = stringContainer.scrollWidth;
        }, 50);
    }

    // Undo
    function undoBead() {
        if (currentBeads.length > 0) {
            currentBeads.pop();
            renderBeads();
        }
    }

    // Reset
    function resetGame() {
        if (confirm('確定要重置嗎？')) {
            currentBeads = [];
            renderBeads();
        }
    }

    // Render Beads
    function renderBeads() {
        beadsOnStringContainer.innerHTML = '';

        const minWidth = stringContainer.clientWidth;
        const contentWidth = currentBeads.length * 54 + 40;
        const finalWidth = Math.max(minWidth, contentWidth);
        stringLine.style.setProperty('--string-width', `${finalWidth}px`);
        beadsOnStringContainer.style.width = `${finalWidth}px`;

        currentBeads.forEach((bead, index) => {
            const beadEl = document.createElement('div');
            beadEl.classList.add('bead-on-string');
            beadEl.dataset.index = index;
            applyColor(beadEl, bead.color);

            // Apply rotation
            beadEl.style.transform = `rotateX(${bead.rotationX}deg) rotateY(${bead.rotationY}deg)`;

            // Click to edit (if not dragging)
            beadEl.addEventListener('click', (e) => {
                if (beadEl.classList.contains('dragging') || isDragging) return;
                openModal(index);
            });

            // Touch Events (Mobile) - Unified logic for Move & Rotate
            beadEl.addEventListener('touchstart', handleTouchStart, { passive: false });
            beadEl.addEventListener('touchmove', handleTouchMove, { passive: false });
            beadEl.addEventListener('touchend', handleTouchEnd);

            // Mouse Events (Desktop) - Basic drag support only for now, can expand if needed
            // For simplicity, we'll focus on touch logic as primary request was iPad
            // But we can map mouse events to touch handlers for testing
            beadEl.addEventListener('mousedown', handleMouseDown);

            beadsOnStringContainer.appendChild(beadEl);
        });
    }

    // Modal Logic
    function openModal(index) {
        editingBeadIndex = index;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        editingBeadIndex = -1;
        modal.classList.add('hidden');
    }

    modalCloseBtn.addEventListener('click', closeModal);
    modalDeleteBtn.addEventListener('click', () => {
        if (editingBeadIndex > -1) {
            currentBeads.splice(editingBeadIndex, 1);
            renderBeads();
            closeModal();
        }
    });

    // Interaction Logic (Touch & Mouse)
    let activeItem = null;
    let startX = 0;
    let startY = 0;
    let initialRotationX = 0;
    let initialRotationY = 0;
    let isDragging = false;
    let mode = 'none'; // 'reorder' or 'rotate'

    function handleTouchStart(e) {
        const touch = e.touches[0];
        startInteraction(this, touch.clientX, touch.clientY);
    }

    function handleMouseDown(e) {
        startInteraction(this, e.clientX, e.clientY);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function startInteraction(element, x, y) {
        activeItem = element;
        startX = x;
        startY = y;
        isDragging = false;
        mode = 'none';

        const index = parseInt(activeItem.dataset.index);
        const bead = currentBeads[index];
        initialRotationX = bead.rotationX || 0;
        initialRotationY = bead.rotationY || 0;
        dragSrcIndex = index;

        // Long press could trigger reorder mode explicitly, but let's try gesture direction
    }

    function handleTouchMove(e) {
        if (!activeItem) return;
        const touch = e.touches[0];
        moveInteraction(touch.clientX, touch.clientY, e);
    }

    function handleMouseMove(e) {
        if (!activeItem) return;
        moveInteraction(e.clientX, e.clientY, e);
    }

    function moveInteraction(x, y, e) {
        const deltaX = x - startX;
        const deltaY = y - startY;

        if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
            isDragging = true;
            // Determine mode based on initial movement direction
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                mode = 'reorder';
                activeItem.classList.add('dragging');
            } else {
                mode = 'rotate';
            }
        }

        if (isDragging) {
            e.preventDefault(); // Prevent scroll

            if (mode === 'rotate') {
                // Rotate Logic
                const index = parseInt(activeItem.dataset.index);
                // Map Y movement to X rotation (tilting up/down)
                // Map X movement to Y rotation (spinning left/right) - optional, but might conflict with reorder
                // Let's stick to Y movement -> RotateX for now as requested "angles" usually implies tilting

                const rotationChange = deltaY * 2; // Sensitivity
                currentBeads[index].rotationX = initialRotationX - rotationChange; // Invert for natural feel

                // Optional: X movement rotates around Y axis if in rotate mode?
                // currentBeads[index].rotationY = initialRotationY + deltaX;

                // Update transform directly for performance
                activeItem.style.transform = `rotateX(${currentBeads[index].rotationX}deg) rotateY(${currentBeads[index].rotationY}deg)`;
            }
            else if (mode === 'reorder') {
                // Reorder Logic
                const elementBelow = document.elementFromPoint(x, y);
                if (elementBelow && elementBelow.classList.contains('bead-on-string')) {
                    const destIndex = parseInt(elementBelow.dataset.index);
                    if (dragSrcIndex !== destIndex && !isNaN(destIndex)) {
                        const item = currentBeads[dragSrcIndex];
                        currentBeads.splice(dragSrcIndex, 1);
                        currentBeads.splice(destIndex, 0, item);
                        dragSrcIndex = destIndex;
                        renderBeads();

                        // Re-acquire reference
                        const newBeads = document.querySelectorAll('.bead-on-string');
                        activeItem = newBeads[destIndex];
                        activeItem.classList.add('dragging');

                        // Reset start positions to prevent jumps
                        startX = x;
                        startY = y;
                    }
                }
            }
        }
    }

    function handleTouchEnd(e) {
        endInteraction();
    }

    function handleMouseUp(e) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        endInteraction();
    }

    function endInteraction() {
        if (activeItem) {
            activeItem.classList.remove('dragging');
            activeItem = null;
        }
        isDragging = false;
        mode = 'none';
    }

    // Event Listeners
    resetBtn.addEventListener('click', resetGame);
    undoBtn.addEventListener('click', undoBead);

    // Initialize
    initPalette();
});
