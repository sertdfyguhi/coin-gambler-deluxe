(() => {
    // Declare variables
    let diceBetInputSlider;
    let diceSlider;
    let diceSliderValue;
    let diceChanceDisplay;
    let dicePayoutDisplay;
    let diceRollButton;
    let diceResultDisplaySlider;

    const updateDiceInfo = () => {
        if (!diceSlider || !diceSliderValue || !diceChanceDisplay || !dicePayoutDisplay) return;

        const target = parseInt(diceSlider.value);
        const winChance = ((target - 1) / 100) * 100; // Roll UNDER target (1 to target-1)
        // Avoid division by zero or negative chance for payout calculation
        const safeWinChance = Math.max(0.01, winChance); // Minimum 0.01% chance
        const payout = Math.max(1.01, 100 / safeWinChance * 0.95); // Calculate payout (with 5% house edge), ensure minimum 1.01x

        diceSliderValue.textContent = target;
        diceChanceDisplay.textContent = winChance.toFixed(2);
        dicePayoutDisplay.textContent = payout.toFixed(2);
    };

    const playDiceSlider = () => {
        if (!diceBetInputSlider || !diceSlider || !diceResultDisplaySlider || !dicePayoutDisplay) return;

        const betResult = window.placeBet(diceBetInputSlider);
        if (!betResult.success) {
            window.setResult(diceResultDisplaySlider, betResult.message, 'loss');
            return;
        }

        const target = parseInt(diceSlider.value);
        const roll = Math.floor(Math.random() * 100) + 1; // 1 to 100
        const win = roll < target;
        const payout = parseFloat(dicePayoutDisplay.textContent); // Get calculated payout

        let message = `Rolled a ${roll}. You bet on under ${target}. `;
        if (win) {
            const winnings = betResult.amount * payout;
            window.awardWinnings(winnings);
            message += `You won ${winnings.toFixed(0)} coins!`;
            window.setResult(diceResultDisplaySlider, message, 'win');
        } else {
            message += `You lost ${betResult.amount} coins.`;
            window.setResult(diceResultDisplaySlider, message, 'loss');
        }
        // No game state to manage for dice, controls should always be enabled unless balance is 0
        window.updateDiceControls();
    };

    window.resetDice = (reason) => {
        console.log(`Dice reset triggered by: ${reason}`);
        // Dice has no complex state to reset, just ensure controls are correct
        if(diceResultDisplaySlider) window.setResult(diceResultDisplaySlider, "Adjust slider and roll!", 'info');
        updateDiceInfo(); // Recalculate payout/chance on reset/switch
        window.updateDiceControls();
    }

    window.updateDiceControls = () => {
        const betAmount = parseInt(diceBetInputSlider?.value || '0');
        const disabled = window.currentCoins <= 0 || betAmount > window.currentCoins;
        if(diceRollButton) diceRollButton.disabled = disabled;
        if(diceBetInputSlider) diceBetInputSlider.disabled = window.currentCoins <= 0;
        if(diceSlider) diceSlider.disabled = false; // Slider is always enabled
    }

    function initDice() {
        // Get elements inside init
        diceBetInputSlider = document.getElementById('dice-bet-slider');
        diceSlider = document.getElementById('dice-slider');
        diceSliderValue = document.getElementById('dice-slider-value');
        diceChanceDisplay = document.getElementById('dice-chance');
        dicePayoutDisplay = document.getElementById('dice-payout');
        diceRollButton = document.getElementById('dice-roll-button');
        diceResultDisplaySlider = document.getElementById('dice-result-slider');

        if (!diceSlider || !diceRollButton) {
            console.error("Dice elements not found even after init!");
            return;
        }
        diceSlider.addEventListener('input', updateDiceInfo);
        diceRollButton.addEventListener('click', playDiceSlider);
        updateDiceInfo(); // Initial calculation
        window.resetDice("Initial load"); // Set initial state
    }

    window.registerGame('dice', initDice);

})(); 