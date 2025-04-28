(() => {
    // Declare variables at the top
    let minesBetInput;
    let minesCountInput;
    let minesStartButton;
    let minesCashOutButton;
    let minesGridContainer;
    let minesResultDisplay;
    let minesGemsFoundDisplay;
    let minesPayoutDisplay;
    let minesDescription;

    let minesGameActive = false;
    let minesBetAmount = 0;
    let minesGridData = []; // Stores { revealed: bool, isMine: bool, element: div }
    const MINES_ROWS = 5;
    const MINES_COLS = 5;
    const TOTAL_CELLS = MINES_ROWS * MINES_COLS;
    let currentTotalMines = 3;
    let currentTotalGems = TOTAL_CELLS - currentTotalMines;
    let minesRevealedGems = 0;
    let minesGameOver = false;
    let minesCurrentMultiplier = 1.0;

    const calculateMinesMultiplier = (gemsFound, totalGems, totalMines) => {
        // More sophisticated calculation: payout based on odds of hitting gem vs mine
        // This version uses nCr (combinations) for a fairer payout curve
        if (gemsFound === 0) return 1.0;
        if (gemsFound > totalGems) return calculateMinesMultiplier(totalGems, totalGems, totalMines); // Cap at max gems

        const totalCells = totalGems + totalMines;

        // Calculate combinations using a helper function (avoids large numbers)
        const combinations = (n, k) => {
            if (k < 0 || k > n) return 0;
            if (k === 0 || k === n) return 1;
            if (k > n / 2) k = n - k; // Optimization
            let res = 1;
            for (let i = 1; i <= k; ++i) {
                res = res * (n - i + 1) / i;
            }
            return Math.floor(res); // Use floor to prevent potential floating point issues
        };

        // Probability of picking `gemsFound` gems without hitting a mine
        // P = C(totalGems, gemsFound) / C(totalCells, gemsFound)
        const prob = combinations(totalGems, gemsFound) / combinations(totalCells, gemsFound);

        // Payout is inverse of probability, with house edge (e.g., 95% return)
        if (prob <= 0) return 1000; // Avoid division by zero, return high multiplier if prob is effectively 0
        const multiplier = 0.95 / prob;

        return Math.max(1.0, multiplier); // Ensure multiplier is at least 1.0
    };

    const updateMinesInfo = () => {
        if (!minesDescription || !minesCountInput) return;
        const numMines = parseInt(minesCountInput.value);
         if (!isNaN(numMines) && numMines >= 1 && numMines < TOTAL_CELLS) {
             currentTotalMines = numMines;
         } else {
            currentTotalMines = 3; // Default if invalid
            minesCountInput.value = 3;
         }
         currentTotalGems = TOTAL_CELLS - currentTotalMines;
         minesDescription.textContent = `Find gems (💎) and avoid ${currentTotalMines} mines (💣). Click squares!`;
    }

    const updateMinesUIState = () => {
        if (!minesGemsFoundDisplay || !minesPayoutDisplay) return;
        minesRevealedGems = minesGridData.filter(cell => cell.revealed && !cell.isMine).length;
        minesGemsFoundDisplay.textContent = minesRevealedGems;

        if (minesGameActive && !minesGameOver && minesRevealedGems > 0) {
            minesCurrentMultiplier = calculateMinesMultiplier(minesRevealedGems, currentTotalGems, currentTotalMines);
            minesPayoutDisplay.textContent = `${minesCurrentMultiplier.toFixed(2)}`;
        } else {
            minesCurrentMultiplier = 1.0;
            minesPayoutDisplay.textContent = `1.00`; // Reset payout display if no gems found or game over
        }
         window.updateMinesControls(); // Update button states
    };

    const revealAllMines = (hitMineIndex = -1) => {
         minesGridData.forEach((cell, index) => {
             if (!cell.revealed) {
                 cell.revealed = true; // Mark as revealed internally
                 cell.element.style.cursor = 'default';
                 if (cell.isMine) {
                     cell.element.textContent = '💣';
                     cell.element.classList.add('revealed', 'mine');
                     if (index === hitMineIndex) {
                          cell.element.style.backgroundColor = '#e53e3e'; // Highlight the specific mine hit
                     }
                 } else {
                     cell.element.textContent = '💎';
                     cell.element.classList.add('revealed'); // Add 'revealed' but not 'gem' for non-clicked ones
                     cell.element.style.opacity = '0.6'; // Dim unclicked gems
                 }
             }
         });
         minesGameOver = true;
         minesGameActive = false;
         window.updateMinesControls();
     };

    const startMinesGame = () => {
        if (minesGameActive) return;

        updateMinesInfo(); // Update mine count based on input
        if (currentTotalMines < 1 || currentTotalMines >= TOTAL_CELLS) {
             window.setResult(minesResultDisplay, `Invalid number of mines (1-${TOTAL_CELLS - 1}).`, 'loss');
             return;
        }

        const betResult = window.placeBet(minesBetInput);
        if (!betResult.success) {
            window.setResult(minesResultDisplay, betResult.message, 'loss');
            return;
        }
        minesBetAmount = betResult.amount;
        minesGameActive = true;
        minesGameOver = false;
        minesRevealedGems = 0;
        minesCurrentMultiplier = 1.0;
        minesGridData = [];
        if(minesGridContainer) minesGridContainer.innerHTML = '';

        // Generate mine locations
        const mineIndices = new Set();
        while (mineIndices.size < currentTotalMines) {
            mineIndices.add(Math.floor(Math.random() * TOTAL_CELLS));
        }

        // Create grid elements
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('mine-cell');
            cellElement.dataset.index = i;
            cellElement.addEventListener('click', handleMineCellClick);
            const isMine = mineIndices.has(i);
            minesGridData.push({ revealed: false, isMine: isMine, element: cellElement });
            if(minesGridContainer) minesGridContainer.appendChild(cellElement);
        }

        window.setResult(minesResultDisplay, `Game started with ${minesBetAmount} coins bet and ${currentTotalMines} mines. Find the gems!`, 'info');
        updateMinesUIState(); // Updates gem count, payout, and controls
    };

    const handleMineCellClick = (event) => {
        if (!minesGameActive || minesGameOver) return;
        const cellElement = event.target.closest('.mine-cell');
        if (!cellElement || cellElement.classList.contains('revealed')) return;

        const index = parseInt(cellElement.dataset.index);
        const cellData = minesGridData[index];

        if (cellData.isMine) {
            // Game Over - Hit Mine
            // cellData.revealed = true;
            window.setResult(minesResultDisplay, `Boom! Hit a mine. Lost ${minesBetAmount} coins.`, 'loss');
            revealAllMines(index); // Reveal all, highlighting the clicked one
        } else {
            // Found Gem
            cellData.revealed = true;
            cellElement.textContent = '💎';
            cellElement.classList.add('revealed', 'gem');
            cellElement.style.cursor = 'default';
            updateMinesUIState();

            if (minesRevealedGems === currentTotalGems) {
                // Game Over - Won (found all gems)
                minesGameOver = true;
                minesGameActive = false;
                const winnings = Math.floor(minesBetAmount * minesCurrentMultiplier);
                window.awardWinnings(winnings);
                window.setResult(minesResultDisplay, `Perfect run! Found all ${currentTotalGems} gems. Won ${winnings} coins! (Payout: ${minesCurrentMultiplier.toFixed(2)}x)`, 'win');
                revealAllMines(); // Reveal mines (optional, shows where they were)
            } else {
                // Game continues
                window.setResult(minesResultDisplay, `Found gem! Gems: ${minesRevealedGems}/${currentTotalGems}. Current Payout: ${minesCurrentMultiplier.toFixed(2)}x.`, 'info');
            }
        }
    };

    const cashOutMines = () => {
        if (!minesGameActive || minesGameOver || minesRevealedGems === 0) return;

        minesGameOver = true;
        minesGameActive = false;
        const winnings = Math.floor(minesBetAmount * minesCurrentMultiplier);
        window.awardWinnings(winnings);
        window.setResult(minesResultDisplay, `Cashed out with ${minesRevealedGems} gems for ${winnings} coins! (Payout: ${minesCurrentMultiplier.toFixed(2)}x)`, 'win');
        revealAllMines(); // Show where remaining mines/gems were
    };

    window.resetMines = (reason) => {
        console.log(`Mines reset triggered by: ${reason}`);
        minesGameActive = false;
        minesGameOver = true;
        minesBetAmount = 0;
        minesRevealedGems = 0;
        minesCurrentMultiplier = 1.0;
        if(minesGridContainer) minesGridContainer.innerHTML = '';
        minesGridData = [];
        updateMinesInfo(); // Update description based on current input
        if(minesResultDisplay) window.setResult(minesResultDisplay, "Select number of mines, place your bet, and start!", 'info');
        updateMinesUIState(); // Reset displays and controls
    }

    window.updateMinesControls = () => {
        if (!minesStartButton || !minesCashOutButton || !minesBetInput || !minesCountInput) return;
        // Can start game only if not active
        minesStartButton.disabled = minesGameActive || window.currentCoins <= 0;
        // Can change bet/mine count only if not active
        minesBetInput.disabled = minesGameActive;
        minesCountInput.disabled = minesGameActive;
        // Can cash out only if active, not game over, and at least one gem found
        minesCashOutButton.disabled = !minesGameActive || minesGameOver || minesRevealedGems === 0;
    }

    function initMines() {
        // Get elements inside init
        minesBetInput = document.getElementById('mines-bet');
        minesCountInput = document.getElementById('mines-count');
        minesStartButton = document.getElementById('mines-start-game');
        minesCashOutButton = document.getElementById('mines-cash-out');
        minesGridContainer = document.getElementById('mines-grid');
        minesResultDisplay = document.getElementById('mines-result');
        minesGemsFoundDisplay = document.getElementById('mines-gems-found');
        minesPayoutDisplay = document.getElementById('mines-current-payout');
        minesDescription = document.getElementById('mines-description');

         if (!minesStartButton || !minesGridContainer || !minesCashOutButton || !minesCountInput || !minesBetInput || !minesResultDisplay || !minesGemsFoundDisplay || !minesPayoutDisplay || !minesDescription) {
            console.error("Mines game elements not found!");
            return;
         }
        minesStartButton.addEventListener('click', startMinesGame);
        // Click listener is added to cells dynamically in startMinesGame
        minesCashOutButton.addEventListener('click', cashOutMines);
        // Update description if mine count changes when game not active
        minesCountInput.addEventListener('change', () => { if (!minesGameActive) updateMinesInfo(); });
        window.resetMines("Initial load");
    }

    window.registerGame('mines', initMines);

})(); 