document.addEventListener('DOMContentLoaded', () => {
    console.log('Beading Game Initialized');

    const beadPalette = document.getElementById('bead-palette');
    const beadsOnStringContainer = document.getElementById('beads-on-string');
    const resetBtn = document.getElementById('reset-btn');
    const undoBtn = document.getElementById('undo-btn');

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

    let currentBeads = [];

    // Initialize Palette
    function initPalette() {
        beadTypes.forEach(bead => {
            const beadEl = document.createElement('div');
            beadEl.classList.add('bead-option');
            
            if (bead.color.includes('gradient')) {
                beadEl.style.background = bead.color;
            } else {
                beadEl.style.backgroundColor = bead.color;
            }
            
            beadEl.addEventListener('click', () => addBead(bead));
            beadPalette.appendChild(beadEl);
        });
    }

    // Add Bead to String
    function addBead(beadData) {
        currentBeads.push(beadData);
        renderBeads();
    }

    // Remove Bead (Undo)
    function undoBead() {
        if (currentBeads.length > 0) {
            currentBeads.pop();
            renderBeads();
        }
    }

    // Reset Game
    function resetGame() {
        currentBeads = [];
        renderBeads();
    }

    // Render Beads on String
    function renderBeads() {
        beadsOnStringContainer.innerHTML = '';
        currentBeads.forEach((bead, index) => {
            const beadEl = document.createElement('div');
            beadEl.classList.add('bead-on-string');
            
            if (bead.color.includes('gradient')) {
                beadEl.style.background = bead.color;
            } else {
                beadEl.style.backgroundColor = bead.color;
            }

            // Allow removing specific bead by clicking
            beadEl.addEventListener('click', () => {
                currentBeads.splice(index, 1);
                renderBeads();
            });

            beadsOnStringContainer.appendChild(beadEl);
        });
    }

    // Event Listeners
    resetBtn.addEventListener('click', resetGame);
    undoBtn.addEventListener('click', undoBead);

    // Initialize
    initPalette();
});
