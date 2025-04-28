(() => {
  // --- DOM Elements ---
  let gridBetAmountInput;
  let gridStartButton;
  let gridResultDisplay;
  let gridContainer;

  // --- Game State & Configuration ---
  let gridState = "betting"; // 'betting', 'playing', 'revealed'
  let currentBetAmount = 0;
  const GRID_SIZE = 5; // <--- CHANGED: 5x5 grid
  const NUM_TILES = GRID_SIZE * GRID_SIZE; // Now 25

  // Define the pool of possible multipliers - MUST HAVE 25 elements
  // Adjust these values to balance the game
  const MULTIPLIER_POOL = [
    0, 0, 0, 0, 0, 0, 0, 0.2, 0.2, 0.2, 0.2, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 2, 2,
    3, 3, 5, 8, 12,
    // Example pool for 25 tiles - adjust as needed!
  ];
  if (MULTIPLIER_POOL.length !== NUM_TILES) {
    console.error(
      `CRITICAL ERROR: MULTIPLIER_POOL length (${MULTIPLIER_POOL.length}) does not match NUM_TILES (${NUM_TILES})!`
    );
    // You might want to throw an error or use a default pool here
  }

  // --- Initialization ---
  function initGrid() {
    gridBetAmountInput = document.getElementById("grid-bet-amount");
    gridStartButton = document.getElementById("grid-start-button");
    gridResultDisplay = document.getElementById("grid-result");
    gridContainer = document.getElementById("multiplier-grid-container");

    if (
      !gridBetAmountInput ||
      !gridStartButton ||
      !gridResultDisplay ||
      !gridContainer
    ) {
      console.error("Multiplier Grid elements not found!");
      if (gridResultDisplay)
        window.setResult(
          gridResultDisplay,
          "Error loading grid elements.",
          "loss"
        );
      return;
    }

    // --- CHANGED: Set grid CSS based on size and fixed width ---
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 45px)`;
    // gridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, 45px)`; // Remove rows, let height be auto

    gridStartButton.addEventListener("click", startGame);
    window.resetGrid("Initial load");
  }

  // --- Grid Generation (No changes needed here, uses NUM_TILES) ---
  function generateGrid() {
    if (!gridContainer) return;
    gridContainer.innerHTML = ""; // Clear previous grid

    // Shuffle the multiplier pool
    const shuffledMultipliers = [...MULTIPLIER_POOL].sort(
      () => Math.random() - 0.5
    );

    for (let i = 0; i < NUM_TILES; i++) {
      const button = document.createElement("button");
      button.classList.add("grid-button");
      button.dataset.multiplier = shuffledMultipliers[i];
      // button.textContent = '?'; // Optional placeholder

      button.addEventListener("click", handleGridClick);
      gridContainer.appendChild(button);
    }
    console.log("Grid generated with multipliers assigned.");
  }

  // --- Game Flow (No changes needed in startGame, handleGridClick logic) ---
  function startGame() {
    if (gridState !== "betting" && gridState !== "revealed") return;

    const betResult = window.placeBet(gridBetAmountInput);
    if (!betResult.success) {
      window.setResult(gridResultDisplay, betResult.message, "loss");
      return;
    }
    currentBetAmount = betResult.amount;

    generateGrid();

    gridState = "playing";
    window.setResult(gridResultDisplay, "Click a tile!", "info");
    window.updateGridControls();

    gridContainer.querySelectorAll(".grid-button").forEach(btn => {
      btn.classList.add("active");
    });
    console.log("Round started. Waiting for click.");
  }

  function handleGridClick(event) {
    if (gridState !== "playing") return;

    const clickedButton = event.target.closest(".grid-button");
    if (!clickedButton || clickedButton.classList.contains("revealed")) return; // Prevent clicking revealed

    gridState = "revealed";

    const multiplier = parseFloat(clickedButton.dataset.multiplier);
    const winnings = currentBetAmount * multiplier;

    if (winnings > 0) {
      window.awardWinnings(winnings);
    }

    let message = `You clicked ${multiplier}x! `;
    if (winnings > currentBetAmount) {
      message += `You won ${(winnings - currentBetAmount).toFixed(
        0
      )} coins! (Total: ${winnings.toFixed(0)})`;
      window.setResult(gridResultDisplay, message, "win");
    } else if (winnings > 0) {
      message += `You got back ${winnings.toFixed(0)} coins (Lost ${(
        currentBetAmount - winnings
      ).toFixed(0)}).`;
      window.setResult(gridResultDisplay, message, "loss");
    } else {
      message += `You lost ${currentBetAmount} coins.`;
      window.setResult(gridResultDisplay, message, "loss");
    }

    revealAll(clickedButton);
    window.updateGridControls();
    console.log(
      `Clicked ${multiplier}x. Winnings: ${winnings}. State: revealed.`
    );
  }

  // --- CHANGED: Added opacity dimming for non-clicked revealed buttons ---
  function revealAll(clickedButton) {
    if (!gridContainer) return;
    const buttons = gridContainer.querySelectorAll(".grid-button");
    buttons.forEach(button => {
      button.classList.remove("active");
      button.classList.add("revealed");
      button.textContent = button.dataset.multiplier + "x";

      if (button === clickedButton) {
        button.classList.add("clicked");
        button.style.opacity = "1"; // Ensure clicked is fully opaque
      } else {
        // Dim non-clicked revealed buttons slightly
        button.style.opacity = "0.7";
      }
    });
    console.log("All tiles revealed.");
  }

  // --- Control Updates & Reset (No changes needed here) ---
  window.updateGridControls = () => {
    const betAmount = parseInt(gridBetAmountInput?.value || "0");
    const canAffordBet =
      window.currentCoins > 0 &&
      betAmount > 0 &&
      betAmount <= window.currentCoins;

    if (gridStartButton) {
      gridStartButton.disabled = !(
        (gridState === "betting" || gridState === "revealed") &&
        canAffordBet
      );
    }
    if (gridBetAmountInput) {
      gridBetAmountInput.disabled = !(
        (gridState === "betting" || gridState === "revealed") &&
        window.currentCoins > 0
      );
      gridBetAmountInput.max =
        window.currentCoins > 0 ? window.currentCoins : 1;
    }
  };

  window.resetGrid = reason => {
    console.log(`Multiplier Grid reset triggered by: ${reason}`);
    gridState = "betting";
    currentBetAmount = 0;
    // if (gridContainer)
    //   gridContainer.innerHTML =
    //     '<p style="color:#666; text-align:center; padding: 20px;">Start a round to generate the grid.</p>';
    if (gridResultDisplay)
      window.setResult(gridResultDisplay, "Place bet and start round.", "info");
    window.updateGridControls();
  };

  // --- Registration ---
  window.registerGame("grid", initGrid);
})();
