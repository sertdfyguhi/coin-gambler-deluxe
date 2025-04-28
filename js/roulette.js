(() => {
  // Declare variables
  let rouletteBetAmountInput;
  let rouletteTable;
  let rouletteSpinButton;
  let rouletteClearButton;
  let rouletteCurrentBetsDiv;
  let rouletteWheelResultDiv;

  let rouletteCurrentBets = {}; // Stores { betType: amount }
  let rouletteSpinning = false;
  let rouletteSpinTimeout = null;

  const ROULETTE_NUMBERS = {
    0: "green",
    1: "red",
    2: "black",
    3: "red",
    4: "black",
    5: "red",
    6: "black",
    7: "red",
    8: "black",
    9: "red",
    10: "black",
    11: "black",
    12: "red",
    13: "black",
    14: "red",
    15: "black",
    16: "red",
    17: "black",
    18: "red",
    19: "red",
    20: "black",
    21: "red",
    22: "black",
    23: "red",
    24: "black",
    25: "red",
    26: "black",
    27: "red",
    28: "black",
    29: "black",
    30: "red",
    31: "black",
    32: "red",
    33: "black",
    34: "red",
    35: "black",
    36: "red",
  };

  // --- Table Generation (No changes needed) ---
  const generateRouletteTable = () => {
    if (!rouletteTable) return;
    rouletteTable.innerHTML = ""; // Clear existing

    // Zero
    const zeroCell = document.createElement("div");
    zeroCell.classList.add("roulette-cell", "roulette-zero");
    zeroCell.textContent = "0";
    zeroCell.dataset.bet = "0";
    rouletteTable.appendChild(zeroCell);

    // Numbers 1-36
    for (let i = 1; i <= 36; i++) {
      const numberCell = document.createElement("div");
      numberCell.classList.add(
        "roulette-cell",
        "roulette-number",
        ROULETTE_NUMBERS[i]
      );
      numberCell.textContent = i;
      numberCell.dataset.bet = i.toString();
      const row = 3 - ((i - 1) % 3);
      const col = Math.floor((i - 1) / 3) + 2;
      numberCell.style.gridRow = row.toString();
      numberCell.style.gridColumn = col.toString();
      rouletteTable.appendChild(numberCell);
    }

    // Outside Bets
    const outsideBets = [
      { name: "1st 12", bet: "D1", span: 4, row: 4, col: 2 },
      { name: "2nd 12", bet: "D2", span: 4, row: 4, col: 6 },
      { name: "3rd 12", bet: "D3", span: 4, row: 4, col: 10 },
      { name: "1-18", bet: "L", span: 2, row: 5, col: 2 },
      { name: "Even", bet: "E", span: 2, row: 5, col: 4 },
      { name: "Red", bet: "R", span: 2, row: 5, col: 6, color: "red" },
      { name: "Black", bet: "B", span: 2, row: 5, col: 8, color: "black" },
      { name: "Odd", bet: "O", span: 2, row: 5, col: 10 },
      { name: "19-36", bet: "H", span: 2, row: 5, col: 12 },
      { name: "2:1", bet: "C1", span: 1, row: 1, col: 14 },
      { name: "2:1", bet: "C2", span: 1, row: 2, col: 14 },
      { name: "2:1", bet: "C3", span: 1, row: 3, col: 14 },
    ];

    outsideBets.forEach(b => {
      const cell = document.createElement("div");
      cell.classList.add("roulette-cell", "roulette-outside");
      cell.textContent = b.bet.startsWith("C")
        ? `2:1 (Col ${b.bet[1]})`
        : b.name;
      cell.dataset.bet = b.bet;
      cell.style.gridColumn = `span ${b.span}`;
      cell.style.gridRow = b.row.toString();
      cell.style.gridColumnStart = b.col.toString();
      if (b.color === "red") cell.style.backgroundColor = "var(--red-color)";
      if (b.color === "black") cell.style.backgroundColor = "#222";
      rouletteTable.appendChild(cell);
    });

    // Add click listeners
    rouletteTable.querySelectorAll(".roulette-cell").forEach(cell => {
      cell.addEventListener("click", handleRouletteBetPlacement);
    });
  };

  // --- Update Bets Display (No major changes needed) ---
  const updateRouletteBetsDisplay = () => {
    if (!rouletteCurrentBetsDiv || !rouletteTable) return;
    let betsText = "Current Bets: ";
    let totalBet = 0;
    const betsArray = [];
    for (const betType in rouletteCurrentBets) {
      betsArray.push(`${betType}: ${rouletteCurrentBets[betType]}`);
      totalBet += rouletteCurrentBets[betType];
    }
    betsText += betsArray.length > 0 ? betsArray.join(", ") : "None";
    betsText += ` (Total: ${totalBet})`;
    rouletteCurrentBetsDiv.textContent = betsText;

    // Update chips on table
    rouletteTable
      .querySelectorAll(".roulette-chip")
      .forEach(chip => chip.remove());
    for (const betType in rouletteCurrentBets) {
      const cell = rouletteTable.querySelector(
        `.roulette-cell[data-bet="${betType}"]`
      );
      if (cell) {
        const chip = document.createElement("div");
        chip.classList.add("roulette-chip");
        cell.appendChild(chip);
      }
    }
  };

  // --- Bet Placement Logic (No changes needed from previous version) ---
  const handleRouletteBetPlacement = event => {
    if (rouletteSpinning) return;
    const cell = event.target.closest(".roulette-cell");
    if (!cell || !cell.dataset.bet) return;

    const betType = cell.dataset.bet;
    const betAmount = parseInt(rouletteBetAmountInput.value);

    if (isNaN(betAmount) || betAmount <= 0) {
      window.setResult(
        rouletteWheelResultDiv,
        "Invalid bet amount per click.",
        "loss"
      );
      return;
    }

    // Add bet amount to the tracking object
    rouletteCurrentBets[betType] =
      (rouletteCurrentBets[betType] || 0) + betAmount;

    updateRouletteBetsDisplay();
    window.updateRouletteControls();
    window.setResult(
      rouletteWheelResultDiv,
      `Bet ${betAmount} added to ${betType}. Total on ${betType}: ${rouletteCurrentBets[betType]}`,
      "info"
    );
  };

  // --- Clear Bets Logic (No changes needed from previous version) ---
  const clearRouletteBets = () => {
    if (rouletteSpinning) return;

    rouletteCurrentBets = {}; // Just clear the bets object
    updateRouletteBetsDisplay();
    window.setResult(
      rouletteWheelResultDiv,
      "Bets cleared. Place new bets!",
      "info"
    );
    window.updateRouletteControls();
  };

  // --- Spin Wheel Logic (MODIFIED - Bets Persist) ---
  const spinRouletteWheel = () => {
    if (rouletteSpinning || Object.keys(rouletteCurrentBets).length === 0) {
      if (!rouletteSpinning && Object.keys(rouletteCurrentBets).length === 0) {
        window.setResult(
          rouletteWheelResultDiv,
          "Please place bets before spinning.",
          "loss"
        );
      }
      return;
    }

    // Calculate total bet and deduct BEFORE spinning
    let totalBetAmount = 0;
    for (const betType in rouletteCurrentBets) {
      totalBetAmount += rouletteCurrentBets[betType];
    }

    if (totalBetAmount <= 0) return;

    // Attempt to place the total bet amount for THIS SPIN
    if (totalBetAmount > window.currentCoins) {
      window.setResult(
        rouletteWheelResultDiv,
        `Not enough coins to spin. Need ${totalBetAmount}, have ${window.currentCoins}.`,
        "loss"
      );
      return; // Abort spin
    }

    // Deduct the total bet amount for THIS SPIN
    window.currentCoins -= totalBetAmount;
    window.updateBalanceDisplay();

    // --- Proceed with spin animation ---
    rouletteSpinning = true;
    window.updateRouletteControls();
    window.setResult(
      rouletteWheelResultDiv,
      `Spinning... (Bet: ${totalBetAmount})`,
      "info"
    );

    if (rouletteSpinTimeout) clearTimeout(rouletteSpinTimeout);

    rouletteSpinTimeout = setTimeout(() => {
      const winningNumber = Math.floor(Math.random() * 37);
      const winningColor = ROULETTE_NUMBERS[winningNumber];
      let totalReturned = 0;

      // Calculate winnings based on PERSISTENT bets
      for (const betType in rouletteCurrentBets) {
        const betAmount = rouletteCurrentBets[betType];
        let payoutMultiplier = 0;
        let win = false;

        // --- Check win conditions (same logic) ---
        const numBetType = parseInt(betType);
        if (!isNaN(numBetType) && numBetType === winningNumber) {
          payoutMultiplier = 35;
          win = true;
        } else if (betType === "0" && winningNumber === 0) {
          payoutMultiplier = 35;
          win = true;
        } else if (betType === "R" && winningColor === "red") {
          payoutMultiplier = 1;
          win = true;
        } else if (betType === "B" && winningColor === "black") {
          payoutMultiplier = 1;
          win = true;
        } else if (
          betType === "E" &&
          winningNumber !== 0 &&
          winningNumber % 2 === 0
        ) {
          payoutMultiplier = 1;
          win = true;
        } else if (betType === "O" && winningNumber % 2 !== 0) {
          payoutMultiplier = 1;
          win = true;
        } else if (
          betType === "L" &&
          winningNumber >= 1 &&
          winningNumber <= 18
        ) {
          payoutMultiplier = 1;
          win = true;
        } else if (
          betType === "H" &&
          winningNumber >= 19 &&
          winningNumber <= 36
        ) {
          payoutMultiplier = 1;
          win = true;
        } else if (
          betType === "D1" &&
          winningNumber >= 1 &&
          winningNumber <= 12
        ) {
          payoutMultiplier = 2;
          win = true;
        } else if (
          betType === "D2" &&
          winningNumber >= 13 &&
          winningNumber <= 24
        ) {
          payoutMultiplier = 2;
          win = true;
        } else if (
          betType === "D3" &&
          winningNumber >= 25 &&
          winningNumber <= 36
        ) {
          payoutMultiplier = 2;
          win = true;
        } else if (
          betType === "C1" &&
          winningNumber !== 0 &&
          winningNumber % 3 === 1
        ) {
          payoutMultiplier = 2;
          win = true;
        } else if (
          betType === "C2" &&
          winningNumber !== 0 &&
          winningNumber % 3 === 2
        ) {
          payoutMultiplier = 2;
          win = true;
        } else if (
          betType === "C3" &&
          winningNumber !== 0 &&
          winningNumber % 3 === 0
        ) {
          payoutMultiplier = 2;
          win = true;
        }
        // --- End win conditions ---

        if (win) {
          // Calculate amount to return (stake + profit)
          totalReturned += betAmount * (payoutMultiplier + 1);
        }
      }

      // Award the total returned amount (if any)
      if (totalReturned > 0) {
        window.awardWinnings(totalReturned);
      }

      // --- Display Result ---
      const resultText = `Wheel landed on ${winningNumber} (${
        winningColor ? winningColor.toUpperCase() : "GREEN"
      })! `;
      let outcomeText = "";
      const netWinLoss = totalReturned - totalBetAmount;

      if (netWinLoss > 0) {
        outcomeText = `You won ${netWinLoss} coins! (Returned: ${totalReturned})`;
        window.setResult(
          rouletteWheelResultDiv,
          resultText + outcomeText,
          "win"
        );
      } else if (netWinLoss === 0) {
        outcomeText = `Push! Bet of ${totalBetAmount} returned.`;
        window.setResult(
          rouletteWheelResultDiv,
          resultText + outcomeText,
          "push"
        );
      } else {
        outcomeText = `You lost ${totalBetAmount} coins.`;
        window.setResult(
          rouletteWheelResultDiv,
          resultText + outcomeText,
          "loss"
        );
      }

      // --- Finish Spin ---
      rouletteSpinning = false;

      // **CHANGE: DO NOT CLEAR BETS HERE**
      // rouletteCurrentBets = {}; // <-- This line is removed/commented out

      updateRouletteBetsDisplay(); // Update display (chips remain)
      window.updateRouletteControls(); // Re-enable controls
    }, 1500); // Simulate spin time
  };

  // --- Reset Game Logic (No changes needed from previous version) ---
  window.resetRoulette = reason => {
    console.log(`Roulette reset triggered by: ${reason}`);
    if (rouletteSpinTimeout) clearTimeout(rouletteSpinTimeout);
    rouletteSpinning = false;

    rouletteCurrentBets = {}; // Ensure bets are clear on reset
    updateRouletteBetsDisplay();
    if (rouletteWheelResultDiv)
      window.setResult(rouletteWheelResultDiv, "Place your bets!", "info");
    window.updateRouletteControls();
  };

  // --- Update Controls Logic (No changes needed from previous version) ---
  window.updateRouletteControls = () => {
    const hasBets = Object.keys(rouletteCurrentBets).length > 0;
    const currentBetAmountInput = parseInt(
      rouletteBetAmountInput?.value || "1"
    );
    const canAffordBetClick = window.currentCoins >= currentBetAmountInput;

    if (rouletteSpinButton)
      rouletteSpinButton.disabled = !hasBets || rouletteSpinning;
    if (rouletteClearButton)
      rouletteClearButton.disabled = !hasBets || rouletteSpinning;
    if (rouletteBetAmountInput)
      rouletteBetAmountInput.disabled =
        rouletteSpinning || window.currentCoins <= 0 || !canAffordBetClick;
    if (rouletteTable) {
      rouletteTable.style.cursor = rouletteSpinning ? "not-allowed" : "pointer";
      rouletteTable.querySelectorAll(".roulette-cell").forEach(cell => {
        cell.style.pointerEvents = rouletteSpinning ? "none" : "auto";
      });
    }
  };

  // --- Initialization (No changes needed) ---
  function initRoulette() {
    rouletteBetAmountInput = document.getElementById("roulette-bet-amount");
    rouletteTable = document.getElementById("roulette-table");
    rouletteSpinButton = document.getElementById("roulette-spin-button");
    rouletteClearButton = document.getElementById("roulette-clear-bets-button");
    rouletteCurrentBetsDiv = document.getElementById("roulette-current-bets");
    rouletteWheelResultDiv = document.getElementById("roulette-wheel-result");

    if (!rouletteTable || !rouletteSpinButton /* ... other checks ... */) {
      console.error("Roulette elements not found even after init!");
      return;
    }
    generateRouletteTable();
    rouletteSpinButton.addEventListener("click", spinRouletteWheel);
    rouletteClearButton.addEventListener("click", clearRouletteBets);
    window.resetRoulette("Initial load");
  }

  // --- Registration ---
  window.registerGame("roulette", initRoulette);
})();
