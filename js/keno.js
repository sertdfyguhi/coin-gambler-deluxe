(() => {
    // Declare variables at the top
    let kenoBetInput;
    let kenoGridContainer;
    let kenoDrawButton;
    let kenoClearButton;
    let kenoSelectedCountDisplay;
    let kenoDrawResultsDisplay;
    let kenoDrawnListDisplay;
    let kenoHitsCountDisplay;
    let kenoResultDisplay;

    const KENO_GRID_SIZE = 80;
    const KENO_MAX_PICKS = 10;
    const KENO_NUMBERS_DRAWN = 20;
    let kenoSelectedNumbers = new Set();
    let kenoDrawnNumbers = [];
    let kenoGameInProgress = false;
    let kenoDrawingAnimationTimeout = null; // Timeout for animation steps

    const generateKenoGrid = () => {
        if (!kenoGridContainer) return;
        kenoGridContainer.innerHTML = '';
        for (let i = 1; i <= KENO_GRID_SIZE; i++) {
            const numberCell = document.createElement('div');
            numberCell.classList.add('keno-number');
            numberCell.textContent = i;
            numberCell.dataset.number = i;
            numberCell.addEventListener('click', handleKenoNumberClick);
            kenoGridContainer.appendChild(numberCell);
        }
    };

    const handleKenoNumberClick = (event) => {
        if (kenoGameInProgress) return;
        const cell = event.target.closest('.keno-number');
        if (!cell) return;
        const number = parseInt(cell.dataset.number);

        if (kenoSelectedNumbers.has(number)) {
            kenoSelectedNumbers.delete(number);
            cell.classList.remove('selected');
        } else {
            if (kenoSelectedNumbers.size < KENO_MAX_PICKS) {
                kenoSelectedNumbers.add(number);
                cell.classList.add('selected');
            } else {
                window.setResult(kenoResultDisplay, `Max ${KENO_MAX_PICKS} numbers selected.`, 'info');
                // Optionally clear the message after a delay
                setTimeout(() => {
                    if (kenoResultDisplay && kenoResultDisplay.textContent === `Max ${KENO_MAX_PICKS} numbers selected.` && !kenoGameInProgress) {
                         window.setResult(kenoResultDisplay, "Select numbers or Draw.", 'info');
                    }
                }, 2000);
            }
        }
        window.updateKenoControls();
    };

    const clearKenoPicks = () => {
        if (kenoGameInProgress) return;
        kenoSelectedNumbers.clear();
        resetKenoGridStyles();
        if (kenoDrawResultsDisplay) kenoDrawResultsDisplay.style.display = 'none';
        if (kenoResultDisplay) window.setResult(kenoResultDisplay, "Picks cleared. Select 1 to 10 numbers.", 'info');
        window.updateKenoControls();
    };

    const resetKenoGridStyles = () => {
        if (!kenoGridContainer) return;
        kenoGridContainer.querySelectorAll('.keno-number').forEach(cell => {
            cell.classList.remove('drawn', 'hit', 'selected');
            // Re-enable clicks only if game is not in progress
            cell.style.pointerEvents = kenoGameInProgress ? 'none' : 'auto';
            cell.style.opacity = '1';
        });
        // Re-apply selected class based on current set
        kenoSelectedNumbers.forEach(num => {
             const cell = kenoGridContainer.querySelector(`.keno-number[data-number="${num}"]`);
             if (cell) cell.classList.add('selected');
        });
    };

    const getKenoPayoutMultiplier = (picks, hits) => {
        // Ensure picks is within a valid range for payout calculation
        if (picks < 1 || picks > KENO_MAX_PICKS || hits < 0 || hits > picks) return 0;

        // Payout Table (example, adjust as needed)
        const payouts = {
        // Added lower multipliers for some lower hit counts
        1: { 1: 2.5 },
        2: { 1: 0.5, 2: 8 }, // Added payout for 1 hit with 2 picks
        3: { 1: 0.2, 2: 2, 3: 20 }, // Added payout for 1 hit with 3 picks
        4: { 1: 0.1, 2: 1, 3: 5, 4: 50 }, // Added payout for 1 hit with 4 picks
        5: { 2: 0.5, 3: 2, 4: 15, 5: 100 }, // Added payout for 2 hits with 5 picks
        6: { 2: 0.2, 3: 1, 4: 5, 5: 40, 6: 250 }, // Added payout for 2 hits with 6 picks
        7: { 3: 0.5, 4: 2, 5: 15, 6: 100, 7: 750 }, // Added payout for 3 hits with 7 picks
        8: { 3: 0.2, 4: 1, 5: 8, 6: 50, 7: 250, 8: 1500 }, // Added payout for 3 hits with 8 picks
        9: { 4: 0.5, 5: 4, 6: 20, 7: 100, 8: 500, 9: 2500 }, // Added payout for 4 hits with 9 picks
        10: { 4: 0.2, 5: 2, 6: 10, 7: 50, 8: 250, 9: 1000, 10: 5000 } // Added payout for 4 hits with 10 picks
    };


        if (payouts[picks] && payouts[picks][hits]) {
            return payouts[picks][hits];
        }
        return 0;
    };

    const drawKenoNumbers = () => {
        if (kenoGameInProgress || kenoSelectedNumbers.size === 0) return;

        const betResult = window.placeBet(kenoBetInput);
        if (!betResult.success) {
            window.setResult(kenoResultDisplay, betResult.message, 'loss');
            return;
        }
        const betAmount = betResult.amount;
        kenoGameInProgress = true;
        window.updateKenoControls(); // Disable controls
        resetKenoGridStyles(); // Clear previous drawn/hit states but keep selected
        if (kenoDrawResultsDisplay) kenoDrawResultsDisplay.style.display = 'none'; // Hide results initially
        window.setResult(kenoResultDisplay, "Drawing numbers...", 'info');

        // Make sure grid numbers are not clickable during draw
        kenoGridContainer.querySelectorAll('.keno-number').forEach(cell => {
            cell.style.pointerEvents = 'none';
        });

        kenoDrawnNumbers = [];
        const availableNumbers = Array.from({ length: KENO_GRID_SIZE }, (_, i) => i + 1);
        for (let i = 0; i < KENO_NUMBERS_DRAWN; i++) {
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            kenoDrawnNumbers.push(availableNumbers.splice(randomIndex, 1)[0]);
        }
        kenoDrawnNumbers.sort((a, b) => a - b);

        let hits = 0;
        kenoSelectedNumbers.forEach(pickedNum => {
            if (kenoDrawnNumbers.includes(pickedNum)) hits++;
        });

        if (kenoDrawnListDisplay) kenoDrawnListDisplay.textContent = kenoDrawnNumbers.join(', ');
        if (kenoHitsCountDisplay) kenoHitsCountDisplay.textContent = hits;
        if (kenoDrawResultsDisplay) kenoDrawResultsDisplay.style.display = 'block';

        let delay = 0;
        const delayIncrement = 100;
        if (kenoDrawingAnimationTimeout) clearTimeout(kenoDrawingAnimationTimeout);

        // Animate drawing numbers
        function animateDrawStep(drawIndex) {
            if (drawIndex >= kenoDrawnNumbers.length) {
                 // Animation finished, calculate and show results
                finalizeKenoDraw(betAmount, hits);
                return;
            }

            const drawnNum = kenoDrawnNumbers[drawIndex];
            const cell = kenoGridContainer.querySelector(`.keno-number[data-number="${drawnNum}"]`);
            if (cell) {
                cell.classList.add('drawn');
                if (kenoSelectedNumbers.has(drawnNum)) {
                    cell.classList.add('hit');
                }
                 // Make non-hit selected numbers slightly opaque after draw completes for contrast
                 // This is handled in finalizeKenoDraw now
            }

            kenoDrawingAnimationTimeout = setTimeout(() => animateDrawStep(drawIndex + 1), delayIncrement);
        }

        animateDrawStep(0); // Start the animation
    };

    const finalizeKenoDraw = (betAmount, hits) => {
         // Apply final styles to non-hit selected numbers
         kenoSelectedNumbers.forEach(pickedNum => {
             if (!kenoDrawnNumbers.includes(pickedNum)) {
                 const cell = kenoGridContainer.querySelector(`.keno-number[data-number="${pickedNum}"]`);
                 if (cell) {
                     cell.classList.add('selected'); // Ensure selected is still there
                     cell.style.opacity = '0.7'; // Dim it slightly
                 }
             }
         });

        const payoutMultiplier = getKenoPayoutMultiplier(kenoSelectedNumbers.size, hits);
        let message = `Drew ${KENO_NUMBERS_DRAWN}. You picked ${kenoSelectedNumbers.size}, hit ${hits}. `;
        let resultType = 'loss';

        if (payoutMultiplier > 0) {
            const winnings = betAmount * payoutMultiplier;
            window.awardWinnings(winnings);
            message += `Multiplier: ${payoutMultiplier}x. Won ${winnings} coins!`;
            resultType = 'win';
        } else {
            message += `Lost ${betAmount} coins.`;
            resultType = 'loss';
        }
        window.setResult(kenoResultDisplay, message, resultType);

        kenoGameInProgress = false;
        window.updateKenoControls(); // Re-enable controls
    }

    window.resetKeno = (reason) => {
        console.log(`Keno reset triggered by: ${reason}`);
        if (kenoDrawingAnimationTimeout) clearTimeout(kenoDrawingAnimationTimeout);
        kenoDrawingAnimationTimeout = null;
        kenoGameInProgress = false;
        kenoSelectedNumbers.clear();
        kenoDrawnNumbers = [];
        if (kenoDrawResultsDisplay) kenoDrawResultsDisplay.style.display = 'none';
        if (kenoResultDisplay) window.setResult(kenoResultDisplay, "Select 1 to 10 numbers and place your bet.", 'info');
        resetKenoGridStyles(); // Resets grid visuals
        window.updateKenoControls();
    }

    window.updateKenoControls = () => {
        const canDraw = kenoSelectedNumbers.size > 0 && !kenoGameInProgress;
        if(kenoDrawButton) kenoDrawButton.disabled = !canDraw;
        if(kenoClearButton) kenoClearButton.disabled = kenoGameInProgress;
        if(kenoBetInput) kenoBetInput.disabled = kenoGameInProgress;
        // Update selected count display
        if (kenoSelectedCountDisplay) kenoSelectedCountDisplay.textContent = kenoSelectedNumbers.size;
        // Grid cell interactivity handled in resetKenoGridStyles and handleKenoNumberClick
        if (kenoGridContainer) {
             kenoGridContainer.querySelectorAll('.keno-number').forEach(cell => {
                 cell.style.pointerEvents = kenoGameInProgress ? 'none' : 'auto';
             });
        }
    }

    function initKeno() {
        // Get elements inside init
        kenoBetInput = document.getElementById('keno-bet');
        kenoGridContainer = document.getElementById('keno-grid');
        kenoDrawButton = document.getElementById('keno-draw-button');
        kenoClearButton = document.getElementById('keno-clear-button');
        kenoSelectedCountDisplay = document.getElementById('keno-selected-count');
        kenoDrawResultsDisplay = document.getElementById('keno-draw-results');
        kenoDrawnListDisplay = document.getElementById('keno-drawn-list');
        kenoHitsCountDisplay = document.getElementById('keno-hits-count');
        kenoResultDisplay = document.getElementById('keno-result');

        if (!kenoGridContainer || !kenoDrawButton || !kenoClearButton || !kenoBetInput || !kenoSelectedCountDisplay || !kenoDrawResultsDisplay || !kenoDrawnListDisplay || !kenoHitsCountDisplay || !kenoResultDisplay) {
             console.error("Keno elements not found!");
             return;
        }
        generateKenoGrid();
        kenoDrawButton.addEventListener('click', drawKenoNumbers);
        kenoClearButton.addEventListener('click', clearKenoPicks);
        window.resetKeno("Initial load"); // Set initial state
    }

    window.registerGame('keno', initKeno);

})();