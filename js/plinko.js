(() => {
  // --- DOM Elements ---
  let plinkoBetInput;
  let plinkoDropButton;
  let plinkoResultDisplay;
  let plinkoBoardContainer;
  let plinkoSlotsContainer;
  let plinkoBoard;
  let rowsSelect; // New
  let riskSelect; // New

  // --- Game State & Configuration ---
  let currentRows = 16; // Default, will be updated from select on init
  let currentRisk = "medium"; // Default, will be updated from select on init
  const possibleRowCounts = [8, 10, 12, 14, 16]; // Allowed row counts
  let slotMultipliers = []; // Will be dynamically set
  let slotElements = []; // Will be dynamically set
  let activeAnimations = 0; // Counter for falling balls

  // --- Constants ---
  const CSS_TRANSITION_DURATION_MS = 250;
  const ANIMATION_STEP_DURATION = 280;
  const PEG_VERTICAL_SPACING = 28; // Vertical distance between centers of peg rows
  const PEG_DIAMETER = 6; // Match CSS .plinko-peg width/height
  const INITIAL_TOP_OFFSET = 15; // How far down the first row of pegs starts from the top of the board div

  // --- Risk Profiles ---
  // Define multipliers for [risk][rows] -> array of multipliers (length = rows + 1)
  const riskLevels = {
    low: {
      // Higher middle multipliers, lower edges. EV ~0.95-0.98
      8: [2.5, 2.0, 1.5, 1.0, 0.5, 1.0, 1.5, 2.0, 2.5],
      10: [2.5, 2.2, 1.8, 1.2, 0.7, 0.3, 0.7, 1.2, 1.8, 2.2, 2.5],
      12: [3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.2, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
      14: [
        3.0, 2.8, 2.3, 1.8, 1.2, 0.7, 0.3, 0.1, 0.3, 0.7, 1.2, 1.8, 2.3, 2.8,
        3.0,
      ],
      16: [
        3.5, 3.0, 2.5, 2.0, 1.4, 0.9, 0.5, 0.2, 0.1, 0.2, 0.5, 0.9, 1.4, 2.0,
        2.5, 3.0, 3.5,
      ],
    },
    medium: {
      // Balanced middle/edges. EV ~0.90-0.93
      8: [2, 3, 1.5, 1.0, 0.8, 1.0, 1.5, 3, 2],
      10: [4, 5, 2.0, 1.2, 0.9, 0.7, 0.9, 1.2, 2.0, 5, 4],
      12: [6, 8, 3.0, 1.5, 1.0, 0.8, 0.6, 0.8, 1.0, 1.5, 3.0, 8, 6],
      14: [
        10, 12, 5.0, 2.0, 1.2, 0.9, 0.7, 0.5, 0.7, 0.9, 1.2, 2.0, 5.0, 12, 10,
      ],
      16: [
        20, 15, 8.0, 3.0, 1.5, 1.0, 0.8, 0.6, 0.4, 0.6, 0.8, 1.0, 1.5, 3.0, 8.0,
        15, 20,
      ],
    },
    high: {
      // High edges, very low center. EV ~0.85-0.88
      8: [20, 5, 2.0, 0.5, 0.2, 0.5, 2.0, 5, 20],
      10: [30, 10, 3.0, 0.8, 0.3, 0.2, 0.3, 0.8, 3.0, 10, 30],
      12: [50, 15, 5.0, 1.5, 0.5, 0.3, 0.1, 0.3, 0.5, 1.5, 5.0, 15, 50],
      14: [
        80, 25, 8.0, 2.0, 0.8, 0.4, 0.2, 0.1, 0.2, 0.4, 0.8, 2.0, 8.0, 25, 80,
      ],
      16: [
        100, 40, 15.0, 4.0, 1.5, 0.6, 0.3, 0, 0, 0, 0.3, 0.6, 1.5, 4.0, 15.0,
        40, 100,
      ],
    },
  };

  // --- Initialization ---
  function initPlinko() {
    plinkoBetInput = document.getElementById("plinko-bet");
    plinkoDropButton = document.getElementById("plinko-drop-button");
    plinkoResultDisplay = document.getElementById("plinko-result");
    plinkoBoardContainer = document.getElementById("plinko-board-container");
    plinkoSlotsContainer = document.getElementById("plinko-slots");
    plinkoBoard = document.getElementById("plinko-board");
    rowsSelect = document.getElementById("plinko-rows-select");
    riskSelect = document.getElementById("plinko-risk-select");

    if (
      !plinkoBetInput ||
      !plinkoDropButton ||
      !plinkoResultDisplay ||
      !plinkoBoardContainer ||
      !plinkoSlotsContainer ||
      !plinkoBoard ||
      !rowsSelect ||
      !riskSelect
    ) {
      console.error("Plinko elements not found!");
      if (plinkoResultDisplay)
        window.setResult(
          plinkoResultDisplay,
          "Error loading Plinko elements.",
          "loss"
        );
      return;
    }

    // Set initial values from controls
    currentRows = parseInt(rowsSelect.value);
    currentRisk = riskSelect.value;

    // Generate initial board and slots
    generateBoardAndSlots();

    // Add event listeners
    plinkoDropButton.addEventListener("click", playPlinko);
    rowsSelect.addEventListener("change", handleConfigChange);
    riskSelect.addEventListener("change", handleConfigChange);

    window.resetPlinko("Initial load"); // Initial setup
  }

  // --- Board Generation ---
  function generatePegRows(rows) {
    plinkoBoard.innerHTML = ""; // Clear existing pegs
    const boardWidth = plinkoBoard.offsetWidth;

    if (boardWidth <= 0) {
      console.warn(
        "Board width is 0, cannot generate pegs accurately. Retrying..."
      );
      // Retry after a short delay, hoping layout is complete
      setTimeout(() => generatePegRows(rows), 100);
      return;
    }

    // Calculate the horizontal distance the ball travels for a single +/- 0.5 step
    const horizontalUnit = boardWidth / rows / 2;

    // Set board height dynamically based on rows and spacing
    plinkoBoard.style.height = `${
      INITIAL_TOP_OFFSET + rows * PEG_VERTICAL_SPACING
    }px`;

    for (let i = 0; i < rows; i++) {
      const numPegs = i + 2; // Pegs per row (2, 3, 4...)
      const yPos = INITIAL_TOP_OFFSET + i * PEG_VERTICAL_SPACING; // Top position for this row's pegs

      // Calculate the total horizontal span of pegs in this row
      const rowPegSpan = (numPegs - 1) * (2 * horizontalUnit);
      // Calculate the starting X position (left edge of the first peg's center) to center the row
      const startX = (boardWidth - rowPegSpan) / 2;

      for (let j = 0; j < numPegs; j++) {
        const peg = document.createElement("div");
        peg.classList.add("plinko-peg");

        // Calculate the center X coordinate for this specific peg
        const xPos = startX + j * (2 * horizontalUnit);

        peg.style.top = `${yPos}px`;
        peg.style.left = `${xPos}px`;
        // CSS transform: translate(-50%, -50%) centers the peg visually

        plinkoBoard.appendChild(peg);
      }
    }
  }

  function generateSlots(rows, risk) {
    plinkoSlotsContainer.innerHTML = ""; // Clear existing slots
    const multipliers = riskLevels[risk]?.[rows];

    if (!multipliers) {
      console.error(`No multipliers defined for risk=${risk}, rows=${rows}`);
      slotMultipliers = [];
      slotElements = [];
      return;
    }

    slotMultipliers = multipliers; // Store the current multipliers
    slotElements = []; // Reset the elements array

    multipliers.forEach(multiplier => {
      const slot = document.createElement("div");
      slot.classList.add("plinko-slot");
      slot.dataset.multiplier = multiplier; // Store multiplier
      slot.textContent = `${multiplier}x`; // Display multiplier
      plinkoSlotsContainer.appendChild(slot);
      slotElements.push(slot); // Store reference
    });
  }

  function generateBoardAndSlots() {
    // Ensure board has a width before generating pegs that depend on it
    if (plinkoBoard.offsetWidth > 0) {
      generatePegRows(currentRows);
      generateSlots(currentRows, currentRisk);
    } else {
      // If board isn't rendered yet, wait briefly and try again
      console.warn("Board width not available yet, delaying generation.");
      setTimeout(generateBoardAndSlots, 50);
    }
  }

  // --- Event Handlers ---
  function handleConfigChange() {
    const newRows = parseInt(rowsSelect.value);
    const newRisk = riskSelect.value;

    if (newRows !== currentRows || newRisk !== currentRisk) {
      currentRows = newRows;
      currentRisk = newRisk;
      console.log(`Config changed: Rows=${currentRows}, Risk=${currentRisk}`);
      // Regenerate the visual elements
      generateBoardAndSlots();
      // Reset any game state message
      window.resetPlinko("Config changed");
    }
  }

  // --- Game Logic ---
  function playPlinko() {
    const betResult = window.placeBet(plinkoBetInput);
    if (!betResult.success) {
      window.setResult(plinkoResultDisplay, betResult.message, "loss");
      return;
    }
    const betAmount = betResult.amount; // Capture bet amount for this specific ball

    activeAnimations++; // Increment counter for active balls
    window.updatePlinkoControls(); // Disable controls if needed (like config)

    // --- Create a new ball element ---
    const ballElement = document.createElement("div");
    ballElement.classList.add("plinko-ball-instance");
    // Set initial position (relative to container) using transform for centering
    ballElement.style.top = "5px"; // Start slightly above the board
    ballElement.style.left = "50%";
    ballElement.style.transform = "translateX(-50%)";

    // Add ball to the board container
    plinkoBoardContainer.appendChild(ballElement);

    // Calculate path for this specific ball using current settings
    const path = calculatePath(currentRows);

    // Start animation for this specific ball
    animateBallDrop(ballElement, path, betAmount, currentRows);
  }

  function calculatePath(rows) {
    // Accept rows as parameter
    let path = [0]; // Initial offset is 0 (center)
    let currentOffset = 0;
    for (let i = 0; i < rows; i++) {
      // Randomly choose -0.5 or +0.5 for the next step direction
      const direction = Math.random() < 0.5 ? -0.5 : 0.5;
      currentOffset += direction;
      path.push(currentOffset);
    }
    return path; // Returns an array of horizontal offsets [-0.5, 0, 0.5, 0, 1, ...]
  }

  function getWinningSlotIndex(finalHorizontalOffset, rows) {
    // Accept rows
    if (!slotElements || slotElements.length === 0 || !plinkoBoard) return 0;

    const numberOfSlots = slotElements.length; // Use dynamic length based on generated slots
    // The number of slots should be rows + 1
    if (numberOfSlots !== rows + 1) {
      console.warn(
        `Slot count (${numberOfSlots}) mismatch with expected based on rows (${
          rows + 1
        })`
      );
      // Attempt to proceed, but might be inaccurate
    }

    // Normalize the final offset. Max possible offset is rows/2 (e.g., 8 rows -> max offset 4)
    const maxPossibleOffset = rows / 2;
    // Convert offset range [-maxOffset, +maxOffset] to a [0, 1] range
    // Add 1 to shift range to [0, 2], then divide by 2
    const normalizedOffset = maxPossibleOffset
      ? (finalHorizontalOffset / maxPossibleOffset + 1) / 2
      : 0.5; // Avoid division by zero if rows=0

    // Map the normalized offset [0, 1] to the slot index range [0, numberOfSlots - 1]
    let winningIndex = Math.round(normalizedOffset * (numberOfSlots - 1));

    // Clamp the index to ensure it's within the valid bounds
    winningIndex = Math.max(0, Math.min(numberOfSlots - 1, winningIndex));
    return winningIndex;
  }

  // --- Animation (Accept rows) ---
  function animateBallDrop(ballElement, path, betAmount, rows) {
    // Ensure elements needed for calculation exist
    if (
      !plinkoBoard ||
      !slotElements ||
      !plinkoSlotsContainer ||
      !plinkoBoardContainer
    ) {
      console.error("Board/Slot elements missing during animation start.");
      ballElement?.remove(); // Clean up the created ball
      activeAnimations--; // Decrement if animation fails early
      window.updatePlinkoControls();
      return;
    }

    const boardWidth = plinkoBoard.offsetWidth;
    const boardCenterX = boardWidth / 2;

    // Calculate horizontal spacing based on board width and rows (should match peg generation)
    const pegSpacing = boardWidth / rows; // Horizontal distance for a full unit offset (+1 or -1)

    // Apply CSS transition AFTER initial position is set and element is in DOM
    requestAnimationFrame(() => {
      ballElement.style.transition = `top ${
        CSS_TRANSITION_DURATION_MS / 1000
      }s linear, left ${CSS_TRANSITION_DURATION_MS / 1000}s ease-in-out`;
    });

    let step = 1; // Start from the first move (path[1])
    const finalHorizontalOffset = path[path.length - 1];
    // Pass rows to getWinningSlotIndex
    const winningIndex = getWinningSlotIndex(finalHorizontalOffset, rows);
    let currentTimeoutId = null; // Timeout specific to this ball's animation chain

    function nextStep() {
      // Check if ball element still exists (might have been removed by a reset)
      if (!ballElement || !ballElement.parentElement) {
        console.log("Ball element removed during animation, stopping.");
        if (currentTimeoutId) clearTimeout(currentTimeoutId); // Clear any pending timeout
        // Don't decrement activeAnimations here, it happens in finalize or if removed early by reset
        return;
      }

      // --- Animate through peg rows (use 'rows' parameter) ---
      if (step <= rows) {
        const ballWidth = ballElement.offsetWidth; // Get current ball width

        // --- X-Axis Calculation ---
        // path[step] gives the target offset (e.g., -0.5, 0, 1.5)
        // Multiply by pegSpacing (width/rows) to get pixel offset from center
        const horizontalOffsetPixels = path[step] * pegSpacing;
        const targetCenterXAbsolute = boardCenterX + horizontalOffsetPixels;
        // Adjust for ball width to center the ball visually over the target point
        const targetLeftAbsolute = targetCenterXAbsolute - ballWidth / 2;

        // Remove transform before setting absolute left
        ballElement.style.transform = "none";
        ballElement.style.left = `${targetLeftAbsolute}px`;

        // --- Y-Axis Calculation (Based on absolute peg positions) ---
        // Target the vertical position of the *next* row of pegs
        // The ball aims for the vertical level of the row it's about to interact with
        const targetRowIndex = step - 1; // The row index (0-based) the ball is currently above
        // Calculate target Y based on the spacing used in peg generation
        const targetTop =
          INITIAL_TOP_OFFSET + targetRowIndex * PEG_VERTICAL_SPACING;
        // Optional: Add a slight offset to make it look like it hits just below the peg center
        // targetTop += PEG_DIAMETER / 2;

        ballElement.style.top = `${targetTop}px`;
        // --- End Y-Axis ---

        step++;
        currentTimeoutId = setTimeout(nextStep, ANIMATION_STEP_DURATION);
      } else {
        // --- Final step: Animate into the winning slot ---
        // Ensure winningIndex is valid for the *current* slotElements array
        if (winningIndex < 0 || winningIndex >= slotElements.length) {
          console.error(
            "Calculated winning index is out of bounds for current slots:",
            winningIndex
          );
          finalizeDrop(ballElement, -1, betAmount); // Indicate error with -1 index
          return;
        }
        const winningSlotElement = slotElements[winningIndex];

        // Calculate position to center the ball in the slot
        const slotRect = winningSlotElement.getBoundingClientRect();
        const containerRect = plinkoBoardContainer.getBoundingClientRect(); // Use board container for relative positioning
        const ballWidth = ballElement.offsetWidth;
        const ballHeight = ballElement.offsetHeight;

        // Calculate target center X relative to the container
        const targetCenterX =
          slotRect.left - containerRect.left + slotRect.width / 2;
        // Calculate target center Y relative to the container
        const targetCenterY =
          slotRect.top - containerRect.top + slotRect.height / 2;

        // Calculate final top/left for the ball's top-left corner
        const finalLeft = targetCenterX - ballWidth / 2;
        const finalTop = targetCenterY - ballHeight / 2;

        // Ensure transform is none before final move
        ballElement.style.transform = "none";
        ballElement.style.left = `${finalLeft}px`;
        ballElement.style.top = `${finalTop}px`;

        // Wait for the CSS transition to finish before finalizing
        currentTimeoutId = setTimeout(() => {
          // Check again if element exists before finalizing (could be reset)
          if (ballElement && ballElement.parentElement) {
            finalizeDrop(ballElement, winningIndex, betAmount);
          } else {
            // If ball was removed before finalize timeout (e.g., by reset)
            // We need to ensure the counter is decremented if finalizeDrop isn't called
            activeAnimations--; // Decrement counter
            window.updatePlinkoControls(); // Re-enable controls if counter is 0
          }
        }, CSS_TRANSITION_DURATION_MS);
      }
    }
    // Start the first animation step for *this* ball
    currentTimeoutId = setTimeout(nextStep, 50); // Small delay before first move
  }

  // --- Finalize a SINGLE ball ---
  function finalizeDrop(ballElement, winningIndex, betAmount) {
    // Ensure index is valid before accessing elements/multipliers
    // Check against dynamically generated slotElements and slotMultipliers
    if (
      winningIndex < 0 ||
      !slotElements ||
      winningIndex >= slotElements.length ||
      !slotMultipliers ||
      winningIndex >= slotMultipliers.length
    ) {
      console.error("Invalid winning index in finalizeDrop:", winningIndex);
      window.setResult(
        plinkoResultDisplay,
        `Error: Invalid slot. Bet ${betAmount} lost.`,
        "loss"
      );
      // Don't award winnings
    } else {
      // Valid index, calculate result
      const winningSlotElement = slotElements[winningIndex];

      // Briefly highlight the winning slot
      winningSlotElement.classList.add("win");
      setTimeout(() => winningSlotElement.classList.remove("win"), 400); // Remove highlight after short delay

      const multiplier = slotMultipliers[winningIndex];
      const winnings = betAmount * multiplier;

      let message = "";
      let resultType = "loss";

      if (winnings > 0) {
        window.awardWinnings(winnings); // Update global coins
        message = `+${winnings.toFixed(0)} (Bet: ${betAmount}, ${multiplier}x)`;
        resultType = "win";
      } else {
        // Lost the bet amount (already deducted by placeBet)
        message = `Lost ${betAmount} (${multiplier}x)`;
        resultType = "loss";
      }
      // Update the shared result display (will be overwritten by next ball finishing)
      window.setResult(plinkoResultDisplay, message, resultType);
    }

    // --- Crucially: Remove the ball element from the DOM ---
    ballElement?.remove(); // Safely remove the ball element

    activeAnimations--; // Decrement animation counter *after* processing result
    window.updatePlinkoControls(); // Update controls (may re-enable config/drop button)
  }

  // --- Control Updates ---
  window.updatePlinkoControls = () => {
    // Ensure elements exist before trying to access properties or modify them
    if (!plinkoBetInput || !plinkoDropButton || !rowsSelect || !riskSelect) {
      console.warn(
        "updatePlinkoControls called before elements were initialized."
      );
      return;
    }

    const betAmount = parseInt(plinkoBetInput.value || "0");
    // Check if user has enough coins for the current bet amount
    // Assumes window.currentCoins is globally available and updated
    const canAffordBet =
      window.currentCoins > 0 &&
      betAmount > 0 &&
      betAmount <= window.currentCoins;

    // --- MODIFICATION START ---
    // Drop button disabled ONLY if user can't afford the bet.
    // It's no longer disabled just because activeAnimations > 0.
    const dropDisabled = !canAffordBet;

    // Config controls (rows, risk) and bet input ARE still disabled if any balls are animating.
    // This prevents changing the board or bet size while balls are in motion.
    const configDisabled = activeAnimations > 0;
    // --- MODIFICATION END ---

    plinkoDropButton.disabled = dropDisabled;

    // Also disable bet input during animation to prevent changing bet mid-drop sequence
    // Also disable if user has no coins.
    plinkoBetInput.disabled = configDisabled || window.currentCoins <= 0;

    rowsSelect.disabled = configDisabled;
    riskSelect.disabled = configDisabled;

    // Optional: Add visual cues for disabled state if needed via CSS classes
    // plinkoDropButton.classList.toggle('disabled', dropDisabled);
    // plinkoBetInput.classList.toggle('disabled', configDisabled || window.currentCoins <= 0);
    // rowsSelect.classList.toggle('disabled', configDisabled);
    // riskSelect.classList.toggle('disabled', configDisabled);
  };

  // --- Reset ---
  window.resetPlinko = reason => {
    console.log(`Plinko reset triggered by: ${reason}`);

    // Clear any currently falling balls forcefully
    const fallingBalls = plinkoBoardContainer?.querySelectorAll(
      ".plinko-ball-instance"
    );
    fallingBalls?.forEach(ball => ball.remove());
    activeAnimations = 0; // Reset animation counter

    // Reset result display and update controls
    if (plinkoResultDisplay)
      window.setResult(
        plinkoResultDisplay,
        "Select rows/risk, place bet!",
        "info"
      );
    window.updatePlinkoControls(); // Ensure controls are correctly enabled/disabled
  };

  // --- Registration ---
  // Assumes a global 'window.registerGame' function exists as defined previously
  window.registerGame("plinko", initPlinko);
})();
