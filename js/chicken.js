(() => {
  // Constants
  const NUM_LANES = 10;
  // Multipliers are awarded for *successfully reaching* the end of the lane (index matches lane number)
  // Index 0 = Starting point multiplier
  const LANE_MULTIPLIERS = [
    1, 1.04, 1.12, 1.24, 1.45, 1.76, 2.26, 3.06, 4.37, 6.72, 12.22,
  ];
  // Hit chance is the risk *when attempting to enter* the next lane (index matches the lane being entered - 1)
  // Index 0 = chance when entering lane 1
  const LANE_HIT_CHANCES = [
    0, 0.04, 0.07, 0.1, 0.14, 0.18, 0.22, 0.26, 0.3, 0.35, 0.45,
  ];

  // State variables
  let chickenGameActive = false;
  let chickenCurrentLane = 0; // 0 = start area, 1-5 = lanes
  let chickenCurrentMultiplier = 1.0;
  let chickenBetAmount = 0;

  // DOM Elements - Initialized in initChicken
  let chickenBetInput;
  let chickenStartButton;
  let chickenAdvanceButton;
  let chickenCashOutButton;
  let chickenCurrentLaneSpan;
  let chickenCurrentMultiplierSpan;
  let chickenPotentialWinningsSpan;
  let chickenRoadArea;
  let chickenIcon;
  let chickenResultDiv;
  let chickenStartArea; // Reference element for initial position

  function getPotentialWinnings() {
    // Ensure multiplier is accessed correctly based on current lane
    const multiplier = LANE_MULTIPLIERS[chickenCurrentLane] || 1.0;
    return (chickenBetAmount * multiplier).toFixed(2);
  }

  function updateChickenDisplays() {
    const currentMultiplier = LANE_MULTIPLIERS[chickenCurrentLane] || 1.0;
    if (chickenCurrentLaneSpan)
      chickenCurrentLaneSpan.textContent = chickenCurrentLane;
    if (chickenCurrentMultiplierSpan)
      chickenCurrentMultiplierSpan.textContent = currentMultiplier.toFixed(2);
    if (chickenPotentialWinningsSpan) {
      chickenPotentialWinningsSpan.textContent = chickenGameActive
        ? getPotentialWinnings()
        : "0";
    }
    moveChickenVisual(chickenCurrentLane);
  }

  function moveChickenVisual(lane) {
    if (!chickenIcon || !chickenRoadArea || !chickenStartArea) return;

    const roadWidth = chickenRoadArea.offsetWidth;
    const startAreaWidth = chickenStartArea.offsetWidth;
    // Ensure we don't divide by zero if NUM_LANES is misconfigured
    const laneWidth =
      NUM_LANES > 0 ? (roadWidth - startAreaWidth) / NUM_LANES : 0;

    // Ensure container and icon have appropriate positioning
    if (getComputedStyle(chickenIcon.parentElement).position === "static") {
      chickenIcon.parentElement.style.position = "relative";
    }
    chickenIcon.style.position = "absolute";

    // Vertical centering (assuming road area fills height appropriately or has fixed height)
    chickenIcon.style.top = "50%";
    chickenIcon.style.transform = "translateY(-50%)";

    let targetLeftPercent;
    if (lane === 0) {
      // Position chicken in the middle of the start area (left side of the container)
      // Use direct style for simplicity here
      chickenIcon.style.left = `calc(${startAreaWidth / 2}px - ${
        chickenIcon.offsetWidth / 2
      }px)`;
    } else {
      // Calculate the middle of the target lane (lanes stack from left to right)
      const laneIndex = lane - 1; // 0-based index for calculation
      // Left edge of the lane area (after start area)
      const lanesStartX = (startAreaWidth / roadWidth) * 100;
      // Left edge of the specific lane
      const leftOfLane =
        lanesStartX + ((laneIndex * laneWidth) / roadWidth) * 100;
      // Middle of the specific lane
      const middleOfLane = leftOfLane + (laneWidth / 2 / roadWidth) * 100;
      targetLeftPercent = middleOfLane;
      // Use direct style for simplicity here
      chickenIcon.style.left = `calc(${leftOfLane}% + ${laneWidth / 2}px - ${
        chickenIcon.offsetWidth / 2
      }px)`;
    }

    // Remove horizontal transform if previously applied for centering
    // chickenIcon.style.transform = 'translateY(-50%)'; // Keep vertical centering

    // Ensure it's a chicken unless game state dictates otherwise (splat, trophy, etc.)
    if (
      chickenIcon.textContent === "💥" ||
      chickenIcon.textContent === "🏆" ||
      chickenIcon.textContent === "💰"
    ) {
      // Keep the end state icon
    } else {
      chickenIcon.textContent = "🐔";
    }
  }

  function updateChickenControls() {
    const betValue = chickenBetInput?.value || "0";
    const betAmount = parseInt(betValue);
    const sufficientFunds = window.currentCoins >= betAmount;

    if (chickenStartButton)
      chickenStartButton.disabled =
        chickenGameActive || betAmount <= 0 || !sufficientFunds;
    if (chickenAdvanceButton)
      chickenAdvanceButton.disabled =
        !chickenGameActive || chickenCurrentLane >= NUM_LANES;
    if (chickenCashOutButton)
      chickenCashOutButton.disabled =
        !chickenGameActive || chickenCurrentLane === 0;
    if (chickenBetInput) chickenBetInput.disabled = chickenGameActive;

    // Add visual feedback if funds are insufficient
    if (
      chickenBetInput &&
      betAmount > 0 &&
      !sufficientFunds &&
      !chickenGameActive
    ) {
      chickenBetInput.classList.add("insufficient-funds");
    } else if (chickenBetInput) {
      chickenBetInput.classList.remove("insufficient-funds");
    }
  }

  function endGame(isWinOrCashout) {
    chickenGameActive = false;
    updateChickenControls();
    // Re-enable bet input after game ends
    if (chickenBetInput) chickenBetInput.disabled = false;
  }

  function startGame() {
    if (chickenGameActive) return;

    const betResult = window.placeBet(chickenBetInput);
    if (!betResult.success) {
      window.setResult(chickenResultDiv, betResult.message, "loss");
      updateChickenControls(); // Ensure controls reflect inability to bet
      return;
    }
    chickenBetAmount = betResult.amount;

    chickenGameActive = true;
    chickenCurrentLane = 0;
    chickenCurrentMultiplier = LANE_MULTIPLIERS[0]; // Use the defined multiplier for lane 0
    chickenIcon.textContent = "🐔"; // Reset icon

    updateChickenDisplays(); // Includes moving chicken to start
    updateChickenControls();
    window.setResult(
      chickenResultDiv,
      `Game started! Bet: ${chickenBetAmount}. Try to cross Lane 1!`,
      "info"
    );
  }

  function advanceLane() {
    if (!chickenGameActive || chickenCurrentLane >= NUM_LANES) return;

    const nextLane = chickenCurrentLane + 1;
    // Hit chance is based on the lane we are *currently* in (index = currentLane)
    const hitChance = LANE_HIT_CHANCES[nextLane];
    console.log(hitChance);

    // Disable buttons during check
    chickenAdvanceButton.disabled = true;
    chickenCashOutButton.disabled = true;

    // Short delay to simulate crossing attempt
    setTimeout(() => {
      // Double check game hasn't been ended/reset elsewhere
      if (!chickenGameActive) return;

      if (Math.random() < hitChance) {
        // Hit!
        window.setResult(
          chickenResultDiv,
          `Splat! 💥 Failed entering lane ${nextLane}. Lost ${chickenBetAmount} coins.`,
          "loss"
        );
        if (chickenIcon) chickenIcon.textContent = "💥";
        endGame(false);
      } else {
        // Success!
        chickenCurrentLane = nextLane;
        // Update multiplier based on the lane *reached*
        chickenCurrentMultiplier = LANE_MULTIPLIERS[chickenCurrentLane];

        updateChickenDisplays(); // Move chicken visually & update text

        if (chickenCurrentLane === NUM_LANES) {
          // Reached the end!
          const winnings = getPotentialWinnings(); // Use final multiplier
          window.awardWinnings(winnings);
          window.setResult(
            chickenResultDiv,
            `Success! 🎉 Reached the end! Won ${winnings} coins!`,
            "win"
          );
          if (chickenIcon) chickenIcon.textContent = "🏆";
          endGame(true);
        } else {
          // Continue
          window.setResult(
            chickenResultDiv,
            `Crossed to Lane ${chickenCurrentLane}. Multiplier: ${chickenCurrentMultiplier.toFixed(
              2
            )}x. Advance or Cash Out?`,
            "info"
          );
          // Re-enable buttons for next choice
          updateChickenControls();
        }
      }
    }, 300); // Simulate crossing time
  }

  function cashOut() {
    if (!chickenGameActive || chickenCurrentLane === 0) return;

    const winnings = getPotentialWinnings(); // Based on current lane's multiplier
    window.awardWinnings(winnings);
    window.setResult(
      chickenResultDiv,
      `Cashed Out! 💰 Won ${winnings} coins at Lane ${chickenCurrentLane}.`,
      "win"
    );
    if (chickenIcon) chickenIcon.textContent = "💰";
    endGame(true);
  }

  function resetChicken(reason) {
    console.log(`Resetting Chicken v2 (10 lanes): ${reason}`);
    chickenGameActive = false;
    chickenCurrentLane = 0;
    chickenCurrentMultiplier = LANE_MULTIPLIERS[0]; // Reset to base multiplier
    chickenBetAmount = 0;
    if (chickenIcon) chickenIcon.textContent = "🐔"; // Ensure icon is chicken

    // Update displays and move chicken back to start visually
    updateChickenDisplays();
    // Ensure controls are set correctly for a new game
    updateChickenControls();
    // Set initial message only if the result isn't showing a win/loss message already
    if (
      !chickenResultDiv.classList.contains("win") &&
      !chickenResultDiv.classList.contains("loss")
    ) {
      window.setResult(
        chickenResultDiv,
        "Place your bet and click Start Game!",
        "info"
      );
    }
    // Ensure bet input is enabled
    if (chickenBetInput) chickenBetInput.disabled = false;
    // Need to recalculate position on resize
    window.addEventListener("resize", () =>
      moveChickenVisual(chickenCurrentLane)
    );
  }

  // Expose necessary functions globally if they are called from elsewhere
  window.updateChickenControls = updateChickenControls; // Called on balance change
  window.resetChicken = resetChicken; // Might be called by a global reset

  function initChicken() {
    console.log("Initializing Chicken Game v2");
    chickenBetInput = document.getElementById("chicken-bet");
    chickenStartButton = document.getElementById("chicken-start-button");
    chickenAdvanceButton = document.getElementById("chicken-advance-button");
    chickenCashOutButton = document.getElementById("chicken-cashout-button");
    chickenCurrentLaneSpan = document.getElementById("chicken-current-lane");
    chickenCurrentMultiplierSpan = document.getElementById(
      "chicken-current-multiplier"
    );
    chickenPotentialWinningsSpan = document.getElementById(
      "chicken-potential-winnings"
    );
    chickenRoadArea = document.getElementById("chicken-road-area");
    chickenIcon = document.getElementById("chicken-icon-v2");
    chickenResultDiv = document.getElementById("chicken-result");
    chickenStartArea = document.getElementById("chicken-start-area");

    if (
      !chickenBetInput ||
      !chickenStartButton ||
      !chickenAdvanceButton ||
      !chickenCashOutButton ||
      !chickenCurrentLaneSpan ||
      !chickenCurrentMultiplierSpan ||
      !chickenPotentialWinningsSpan ||
      !chickenRoadArea ||
      !chickenIcon ||
      !chickenResultDiv ||
      !chickenStartArea
    ) {
      console.error("Chicken game v2 elements not found! Check HTML IDs.");
      // Prevent further setup if elements are missing
      const errorDiv = document.getElementById("chicken-game") || document.body;
      const errorMsg = document.createElement("p");
      errorMsg.textContent =
        "Error loading Chicken game. Required elements missing.";
      errorMsg.style.color = "red";
      errorDiv.prepend(errorMsg);
      return;
    }

    // Add event listeners
    chickenStartButton.addEventListener("click", startGame);
    chickenAdvanceButton.addEventListener("click", advanceLane);
    chickenCashOutButton.addEventListener("click", cashOut);
    // Listen for changes in bet input or global coin updates to update controls
    chickenBetInput.addEventListener("input", updateChickenControls);
    // Need to recalculate position on resize
    window.addEventListener("resize", () =>
      moveChickenVisual(chickenCurrentLane)
    );

    resetChicken("Initial load (10 lanes)"); // Initialize state, visuals, and controls
  }

  // Register the initialization function for the 'chicken' game
  window.registerGame("chicken", initChicken);
})();
