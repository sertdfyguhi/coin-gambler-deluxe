(() => {
  // --- DOM Elements ---
  let wheelBetAmountInput;
  let wheelSpinButton;
  let wheelResultDisplay;
  let wheelElement;
  let wheelContainer; // Needed for label positioning relative to center

  // --- Game State & Configuration ---
  let wheelSpinning = false;
  let wheelSpinTimeout = null;

  // Define the segments: { multiplier: number, color: string }
  // Ensure segment count matches visual generation logic
  // Include 0x and < 1x multipliers for house edge
  const WHEEL_SEGMENTS = [
    { multiplier: 2, color: "#4CAF50" }, // Green
    { multiplier: 0.1, color: "#FFC107" }, // Amber
    { multiplier: 5, color: "#2196F3" }, // Blue
    { multiplier: 0, color: "#607D8B" }, // Blue Grey (Loss)
    { multiplier: 1.5, color: "#9C27B0" }, // Purple
    { multiplier: 0.5, color: "#FF9800" }, // Orange
    { multiplier: 10, color: "#E91E63" }, // Pink
    { multiplier: 0.2, color: "#795548" }, // Brown
    { multiplier: 1, color: "#00BCD4" }, // Cyan
    { multiplier: 0, color: "#607D8B" }, // Blue Grey (Loss)
    { multiplier: 20, color: "#F44336" }, // Red (Big Win)
    { multiplier: 0.3, color: "#FFEB3B" }, // Yellow
  ];
  const NUM_SEGMENTS = WHEEL_SEGMENTS.length;
  const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
  const SPIN_DURATION_MS = 4000; // Must match CSS transition duration

  // --- Initialization ---
  function initWheel() {
    wheelBetAmountInput = document.getElementById("wheel-bet-amount");
    wheelSpinButton = document.getElementById("wheel-spin-button");
    wheelResultDisplay = document.getElementById("wheel-result");
    wheelElement = document.getElementById("wheel");
    wheelContainer = document.getElementById("wheel-container");

    if (
      !wheelBetAmountInput ||
      !wheelSpinButton ||
      !wheelResultDisplay ||
      !wheelElement ||
      !wheelContainer
    ) {
      console.error("Multiplier Wheel elements not found!");
      if (wheelResultDisplay)
        window.setResult(
          wheelResultDisplay,
          "Error loading wheel elements.",
          "loss"
        );
      return;
    }

    generateWheelVisuals();
    wheelSpinButton.addEventListener("click", spinWheel);
    window.resetWheel("Initial load"); // Use a specific reset function
  }

  // --- Visual Generation ---
  function generateWheelVisuals() {
    if (!wheelElement || !wheelContainer) return;

    let gradientString = "conic-gradient(";
    const radius = wheelContainer.offsetWidth / 2; // Use container for radius calc

    // Clear existing labels first
    wheelContainer
      .querySelectorAll(".wheel-segment-label")
      .forEach(label => label.remove());

    WHEEL_SEGMENTS.forEach((segment, index) => {
      const startAngle = index * SEGMENT_ANGLE;
      const endAngle = (index + 1) * SEGMENT_ANGLE;

      // Add color stop to gradient
      gradientString += `${segment.color} ${startAngle}deg ${endAngle}deg`;
      if (index < NUM_SEGMENTS - 1) {
        gradientString += ", ";
      }

      // --- Add Segment Label ---
      const label = document.createElement("div");
      label.classList.add("wheel-segment-label");
      label.textContent = `${segment.multiplier}x`;

      // Calculate position for the label
      // Angle for the middle of the segment (for positioning)
      const midAngleRad = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      const labelDist = radius * 0.75; // How far from center (adjust 0.75)

      // Calculate position relative to the center of the wheel container
      const x = labelDist * Math.sin(midAngleRad);
      const y = -labelDist * Math.cos(midAngleRad); // Y is negative because CSS top increases downwards

      // Angle for rotating the label itself to be upright relative to the segment edge
      const labelRotation = (startAngle + endAngle) / 2;

      // Apply transform: move from center, then rotate label container
      // Translate moves relative to the element's default position (top-left of container)
      // We need to translate it from the center (50%, 50%)
      label.style.transform = `translate(${x}px, ${y}px) rotate(${labelRotation}deg)`;

      wheelContainer.appendChild(label); // Append to container, not wheel, for easier positioning
    });

    gradientString += ")";
    wheelElement.style.background = gradientString;
  }

  // --- Spin Logic ---
  function spinWheel() {
    if (wheelSpinning) return;

    // 1. Place Bet
    const betResult = window.placeBet(wheelBetAmountInput); // Use global placeBet
    if (!betResult.success) {
      window.setResult(wheelResultDisplay, betResult.message, "loss");
      return;
    }
    const betAmount = betResult.amount;

    // 2. Start Spinning State
    wheelSpinning = true;
    window.updateWheelControls(); // Disable button/input
    window.setResult(wheelResultDisplay, "Spinning...", "info");

    // 3. Calculate Target
    const targetSegmentIndex = Math.floor(Math.random() * NUM_SEGMENTS);
    const winningSegment = WHEEL_SEGMENTS[targetSegmentIndex];

    // Calculate target rotation:
    // - Base angle to point the TOP of the wheel (where the pointer is) to the MIDDLE of the target segment.
    // - Add multiple full rotations for visual effect.
    // - Add a small random offset within the segment angle for variability.
    const angleOffsetWithinSegment =
      (Math.random() - 0.5) * SEGMENT_ANGLE * 0.8; // Random offset within the segment
    const targetAngle =
      targetSegmentIndex * SEGMENT_ANGLE +
      SEGMENT_ANGLE / 2 +
      angleOffsetWithinSegment;
    const fullRotations = 5; // Number of full spins
    const finalRotation = -(fullRotations * 360 + targetAngle); // Negative because pointer is at top

    // Apply rotation via CSS transform. The transition is handled by CSS.
    wheelElement.style.transform = `rotate(${finalRotation}deg)`;

    // 4. Set Timeout to Handle Result after Animation
    if (wheelSpinTimeout) clearTimeout(wheelSpinTimeout); // Clear previous timeout if any

    wheelSpinTimeout = setTimeout(() => {
      handleSpinResult(winningSegment, betAmount);
    }, SPIN_DURATION_MS); // Wait for CSS transition to finish
  }

  // --- Handle Spin Result ---
  function handleSpinResult(winningSegment, betAmount) {
    const multiplier = winningSegment.multiplier;
    const winnings = betAmount * multiplier;

    let message = "";
    let resultType = "loss";

    if (winnings > 0) {
      window.awardWinnings(winnings); // Award includes original bet if multiplier >= 1
      message = `Landed on ${multiplier}x! You won ${winnings.toFixed(
        0
      )} coins!`;
      resultType = "win";
    } else {
      // multiplier is 0
      message = `Landed on 0x. You lost ${betAmount} coins.`;
      resultType = "loss";
    }

    window.setResult(wheelResultDisplay, message, resultType);

    // Reset state
    wheelSpinning = false;
    window.updateWheelControls(); // Re-enable button/input

    // Optional: Reset wheel position smoothly after a delay? Or snap back?
    // For now, it stays where it landed until next spin.
    // To snap back:
    // setTimeout(() => {
    //     wheelElement.style.transition = 'none'; // Disable transition for snap
    //     wheelElement.style.transform = 'rotate(0deg)';
    //     // Force reflow/repaint might be needed here
    //     wheelElement.offsetHeight; // Trigger reflow
    //     wheelElement.style.transition = `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.25, 0.1, 0.25, 1)`; // Re-enable
    // }, 1000); // Delay before snapping back
  }

  window.resetWheel = reason => {
    console.log(`Multiplier Wheel reset triggered by: ${reason}`);
    if (wheelSpinTimeout) clearTimeout(wheelSpinTimeout);
    wheelSpinning = false;

    // Reset wheel rotation visually
    if (wheelElement) {
      wheelElement.style.transition = "none";
      wheelElement.style.transform = "rotate(0deg)";
      wheelElement.offsetHeight; // Trigger reflow
      wheelElement.style.transition = `transform ${
        SPIN_DURATION_MS / 1000
      }s cubic-bezier(0.25, 0.1, 0.25, 1)`;
    }

    // Reset result message
    if (wheelResultDisplay)
      window.setResult(wheelResultDisplay, "Place your bet and spin!", "info");

    // Update controls based on current balance etc.
    window.updateWheelControls();
  };

  window.updateWheelControls = () => {
    // Update balance display if there's a specific one for the wheel game
    // const balanceDisplayWheel = document.getElementById('coin-balance-wheel');
    // if (balanceDisplayWheel) balanceDisplayWheel.textContent = window.currentCoins;

    const betAmount = parseInt(wheelBetAmountInput?.value || "0");
    // Use global window.currentCoins
    const canAffordBet =
      window.currentCoins > 0 &&
      betAmount > 0 &&
      betAmount <= window.currentCoins;
    const spinDisabled = wheelSpinning || !canAffordBet;

    if (wheelSpinButton) wheelSpinButton.disabled = spinDisabled;
    // Disable input if spinning or no coins
    if (wheelBetAmountInput)
      wheelBetAmountInput.disabled = wheelSpinning || window.currentCoins <= 0;

    // Update max bet amount on the input based on current coins
    if (wheelBetAmountInput) {
      wheelBetAmountInput.max =
        window.currentCoins > 0 ? window.currentCoins : 1;
    }
  };

  if (wheelResultDisplay) {
    window.setResult(wheelResultDisplay, "Place your bet and spin!", "info");
    window.updateWheelControls(); // Ensure controls are correctly enabled/disabled
  }

  // --- Registration ---
  window.registerGame("wheel", initWheel);
})();
