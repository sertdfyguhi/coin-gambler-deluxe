(() => {
    // Declare variables at the top
    let crashBetInput;
    let crashPlaceBetButton;
    let crashCashOutButton;
    let crashMultiplierDisplay;
    let crashResultDisplay;

    let crashGameRunning = false; // Is the multiplier currently rising?
    let crashMultiplier = 1.0;
    let crashInterval = null;
    let crashBetPlacedAmount = 0;
    let hasCashedOut = false;

    const placeCrashBet = () => {
        if (crashGameRunning) return;

        const betResult = window.placeBet(crashBetInput);
        if (!betResult.success) {
            window.setResult(crashResultDisplay, betResult.message, 'loss');
            return;
        }
        crashBetPlacedAmount = betResult.amount;
        window.setResult(crashResultDisplay, `Bet of ${crashBetPlacedAmount} placed. Starting...`, 'info');
        startCrashGame();
    };

    const startCrashGame = () => {
        if (crashGameRunning) return;
        crashGameRunning = true;
        hasCashedOut = false;
        crashMultiplier = 1.00;
        if(crashMultiplierDisplay) {
             crashMultiplierDisplay.textContent = `${crashMultiplier.toFixed(2)}x`;
             crashMultiplierDisplay.classList.add('rising');
             crashMultiplierDisplay.classList.remove('crashed');
        }
        window.updateCrashControls();

        // Complex crash point calculation (from original)
        const randomFactor = Math.random();
        // Base exponential growth, higher chance for low multipliers, small chance for very high
        const crashPointBase = 1 + Math.pow(randomFactor, 4) * 15; // Adjust base multiplier range
        // Add a chance for a truly high multiplier run
        const extraBoost = (randomFactor > 0.98) ? (Math.random() * 50) : 0; // e.g., 2% chance of up to 50x extra
        const crashPoint = Math.max(1.01, crashPointBase + extraBoost); // Ensure it crashes at least at 1.01x

        if (crashInterval) clearInterval(crashInterval);

        crashInterval = setInterval(() => {
            // Slightly variable increase for less predictability
            const increase = 1.015 + Math.random() * 0.015; // e.g., 1.015 to 1.03
            crashMultiplier = Math.max(1.00, crashMultiplier * increase);
            if(crashMultiplierDisplay) crashMultiplierDisplay.textContent = `${crashMultiplier.toFixed(2)}x`;

            if (crashMultiplier >= crashPoint) {
                stopCrashGame('crashed');
            }
        }, 100); // Update interval
    };

    const cashOutCrash = () => {
        if (!crashGameRunning || hasCashedOut) return;
        stopCrashGame('cashed_out');
    };

    const stopCrashGame = (reason) => {
        if (!crashGameRunning && reason !== 'cashed_out' && reason !== 'switched') return; // Allow stop if cashing out or switching

        clearInterval(crashInterval);
        crashInterval = null;
        crashGameRunning = false;

        if(crashMultiplierDisplay) crashMultiplierDisplay.classList.remove('rising');

        let message = "";
        let resultType = 'info';

        switch (reason) {
            case 'crashed':
                if(crashMultiplierDisplay) crashMultiplierDisplay.classList.add('crashed');
                message = `Crashed @ ${crashMultiplier.toFixed(2)}x!`;
                // Bet was already placed, so it's lost unless cashed out before
                if (!hasCashedOut && crashBetPlacedAmount > 0) {
                    message += ` Lost ${crashBetPlacedAmount} coins.`;
                    resultType = 'loss';
                } else if (hasCashedOut) {
                    // If somehow crashed after cashing out (race condition?), use previous cashout message
                    message = crashResultDisplay.textContent; // Keep existing win message
                    resultType = 'win';
                } else {
                     // No bet was placed or already handled
                     resultType = 'info';
                }
                break;
            case 'cashed_out':
                if (!hasCashedOut) {
                    hasCashedOut = true;
                    const winnings = Math.floor(crashBetPlacedAmount * crashMultiplier);
                    window.awardWinnings(winnings);
                    message = `Cashed out @ ${crashMultiplier.toFixed(2)}x! You won ${winnings} coins!`;
                    resultType = 'win';
                } else {
                    // Already cashed out, do nothing
                    return; 
                }
                break;
             case 'switched': // Called from resetCrash when switching games
                 if (!hasCashedOut && crashBetPlacedAmount > 0) {
                     message = `Switched games. Bet of ${crashBetPlacedAmount} lost.`;
                     resultType = 'loss';
                 } else {
                     message = "Switched games.";
                     resultType = 'info';
                 }
                 break;
             default:
                 message = "Game stopped.";
                 resultType = 'info';
        }

        window.setResult(crashResultDisplay, message, resultType);
        crashBetPlacedAmount = 0; // Reset bet amount after round ends
        hasCashedOut = false; // Reset cashout status
        window.updateCrashControls();
    };

    window.resetCrash = (reason) => {
        console.log(`Crash reset triggered by: ${reason}`);
        if (crashInterval) {
            clearInterval(crashInterval);
            crashInterval = null;
        }
        // If game was running and reset by switching, call stopCrashGame to handle potential lost bet
        if (crashGameRunning && reason === 'Switched games') {
             stopCrashGame('switched');
        } else {
            crashGameRunning = false;
            crashBetPlacedAmount = 0;
            hasCashedOut = false;
            crashMultiplier = 1.0;
             if(crashMultiplierDisplay) {
                 crashMultiplierDisplay.textContent = `${crashMultiplier.toFixed(2)}x`;
                 crashMultiplierDisplay.classList.remove('rising', 'crashed');
             }
             if(crashResultDisplay) window.setResult(crashResultDisplay, "Place your bet to start the next round.", 'info');
             window.updateCrashControls();
        }
    }

    window.updateCrashControls = () => {
        if (!crashPlaceBetButton || !crashCashOutButton || !crashBetInput) return;
        // Can place bet only if game is NOT running
        crashPlaceBetButton.disabled = crashGameRunning || window.currentCoins <= 0;
        // Can cash out only if game IS running AND hasn't already cashed out
        crashCashOutButton.disabled = !crashGameRunning || hasCashedOut;
        // Bet input disabled while game is running
        crashBetInput.disabled = crashGameRunning;
    }

    function initCrash() {
        // Get elements inside init
        crashBetInput = document.getElementById('crash-bet');
        crashPlaceBetButton = document.getElementById('crash-place-bet');
        crashCashOutButton = document.getElementById('crash-cash-out');
        crashMultiplierDisplay = document.getElementById('crash-multiplier');
        crashResultDisplay = document.getElementById('crash-result');

        if (!crashPlaceBetButton || !crashCashOutButton || !crashBetInput || !crashMultiplierDisplay || !crashResultDisplay) {
            console.error("Crash game elements not found!");
            return;
        }
        crashPlaceBetButton.addEventListener('click', placeCrashBet);
        crashCashOutButton.addEventListener('click', cashOutCrash);
        window.resetCrash("Initial load");
    }

    window.registerGame('crash', initCrash);

})(); 