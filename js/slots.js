(() => {
  // Declare variables, but don't assign them yet
  let slotsBetInput;
  let slotsSpinButton;
  let slotsReel1;
  let slotsReel2;
  let slotsReel3;
  let slotsResultDiv;

  const slotSymbols = ["🍒", "🍋", "🔔", "💰", "7️⃣", "❌"]; // Include a losing symbol
  let slotsSpinning = false;
  let spinIntervals = [];
  let spinTimeouts = []; // To store timeouts for stopping reels

  const spinSlots = () => {
    if (slotsSpinning) return;

    const betResult = window.placeBet(slotsBetInput);
    if (!betResult.success) {
      window.setResult(slotsResultDiv, betResult.message, "loss");
      return;
    }
    const betAmount = betResult.amount;

    slotsSpinning = true;
    window.updateSlotsControls(); // Disable controls
    window.setResult(slotsResultDiv, "Spinning...", "info");

    const reels = [slotsReel1, slotsReel2, slotsReel3];
    let finalResults = [];

    // Clear any previous intervals/timeouts
    spinIntervals.forEach(clearInterval);
    spinTimeouts.forEach(clearTimeout);
    spinIntervals = [];
    spinTimeouts = [];

    // Start spinning animation
    reels.forEach((reel, index) => {
      if (!reel) return; // Check if reel exists
      spinIntervals[index] = setInterval(() => {
        reel.textContent =
          slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
      }, 80); // Animation speed
    });

    // Schedule stops for reels one by one
    spinTimeouts.push(
      setTimeout(() => {
        clearInterval(spinIntervals[0]);
        finalResults[0] =
          slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
        if (reels[0]) reels[0].textContent = finalResults[0];
      }, 1000)
    ); // Stop reel 1 after 1s

    spinTimeouts.push(
      setTimeout(() => {
        clearInterval(spinIntervals[1]);
        finalResults[1] =
          slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
        if (reels[1]) reels[1].textContent = finalResults[1];
      }, 1800)
    ); // Stop reel 2 after 1.8s

    spinTimeouts.push(
      setTimeout(() => {
        clearInterval(spinIntervals[2]);
        finalResults[2] =
          slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
        if (reels[2]) reels[2].textContent = finalResults[2];

        // Determine outcome
        determineSlotsWinner(finalResults, betAmount);
        slotsSpinning = false;
        window.updateSlotsControls(); // Re-enable controls
      }, 2600)
    ); // Stop reel 3 after 2.6s
  };

  const determineSlotsWinner = (results, betAmount) => {
    if (!slotsResultDiv) return;
    let payoutMultiplier = 0;
    let winSymbol = "";

    if (results.length === 3) {
      if (results[0] === results[1] && results[1] === results[2]) {
        // Three of a kind
        winSymbol = results[0];
        switch (winSymbol) {
          case "🍋":
            payoutMultiplier = 15;
            break;
          case "🍒":
            payoutMultiplier = 25;
            break;
          case "🔔":
            payoutMultiplier = 35;
            break;
          case "💰":
            payoutMultiplier = 45;
            break;
          case "7️⃣":
            payoutMultiplier = 55;
            break;
          // case '❌': payoutMultiplier = 0; break; // No payout for 3 'X'
        }
      } else if (
        results[0] === results[1] ||
        results[0] === results[2] ||
        results[1] === results[2]
      ) {
        winSymbol = results[0] === results[2] ? results[0] : results[1];
        switch (winSymbol) {
          case "🍋":
            payoutMultiplier = 1.3;
            break;
          case "🍒":
            payoutMultiplier = 1.8;
            break;
          case "🔔":
            payoutMultiplier = 2.4;
            break;
          case "💰":
            payoutMultiplier = 3;
            break;
          case "7️⃣":
            payoutMultiplier = 3.5;
            break;
        }
      }
    } // Add more winning combinations here (e.g., two cherries) if desired

    if (payoutMultiplier > 0) {
      const winnings = betAmount * payoutMultiplier;
      window.awardWinnings(winnings);
      window.setResult(
        slotsResultDiv,
        `Winner! ${results.join(
          ""
        )} pays ${payoutMultiplier}x. You won ${winnings} coins!`,
        "win"
      );
    } else {
      window.setResult(
        slotsResultDiv,
        `Result: ${results.join("")}. You lost ${betAmount} coins.`,
        "loss"
      );
    }
  };

  window.resetSlots = reason => {
    console.log(`Slots reset triggered by: ${reason}`);
    // Clear any ongoing animations
    spinIntervals.forEach(clearInterval);
    spinTimeouts.forEach(clearTimeout);
    spinIntervals = [];
    spinTimeouts = [];
    slotsSpinning = false;

    // Reset reel displays
    if (slotsReel1) slotsReel1.textContent = "❓";
    if (slotsReel2) slotsReel2.textContent = "❓";
    if (slotsReel3) slotsReel3.textContent = "❓";
    if (slotsResultDiv)
      window.setResult(
        slotsResultDiv,
        "Place your bet and spin! (🍒=10x, 🍋=8x, 🔔=15x, 💰=25x, 7️⃣=50x)",
        "info"
      );

    window.updateSlotsControls();
  };

  window.updateSlotsControls = () => {
    if (slotsSpinButton)
      slotsSpinButton.disabled = slotsSpinning || window.currentCoins <= 0;
    if (slotsBetInput) slotsBetInput.disabled = slotsSpinning;
  };

  function initSlots() {
    // Get elements *inside* init, after HTML is loaded
    slotsBetInput = document.getElementById("slots-bet");
    slotsSpinButton = document.getElementById("slots-spin-button");
    slotsReel1 = document.getElementById("reel1");
    slotsReel2 = document.getElementById("reel2");
    slotsReel3 = document.getElementById("reel3");
    slotsResultDiv = document.getElementById("slots-result");

    if (!slotsSpinButton || !slotsBetInput) {
      console.error("Slots elements not found even after init!"); // Modify error message
      return;
    }
    slotsSpinButton.addEventListener("click", spinSlots);
    window.resetSlots("Initial load"); // Set initial state
  }

  window.registerGame("slots", initSlots);
})();
