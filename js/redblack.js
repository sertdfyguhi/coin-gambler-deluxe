(() => {
  // --- DOM Elements ---
  let rbBetInput;
  let rbStartButton;
  let rbChoiceButtonsDiv;
  let rbRedButton;
  let rbBlackButton;
  let rbDecisionButtonsDiv; // Changed from rbCashOutButton
  let rbContinueButton; // Added
  let rbCashOutButton;
  let rbCardArea;
  let rbCardElement;
  let rbStatsDiv;
  let rbStreakDisplay;
  let rbMultiplierDisplay;
  let rbPotentialWinningsDisplay;
  let rbResultDisplay;

  // --- Game State ---
  let rbGameState = "betting"; // 'betting', 'playing', 'revealed'
  let rbCurrentBet = 0;
  let rbStreak = 0;
  let rbCurrentMultiplier = 1.0;
  let rbPotentialWinnings = 0;
  let rbDeck = [];
  let rbDrawnCard = null;

  // --- Deck Functions (Adapted from Blackjack) ---
  const createDeck = () => {
    const suits = ["♥", "♦", "♣", "♠"];
    const ranks = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];
    const deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  };

  const shuffleDeck = deck => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  };

  const getCardColor = card => {
    return ["♥", "♦"].includes(card.suit) ? "red" : "black";
  };

  // --- Rendering ---
  const renderRedBlackCard = (card, hidden = true) => {
    if (!rbCardElement) return;
    rbCardElement.classList.remove("flipping", "red", "black", "hidden");
    rbCardElement.style.transform = "";
    rbCardElement.textContent = "";

    if (hidden) {
      rbCardElement.classList.add("hidden");
      rbCardElement.textContent = "?";
    } else if (card) {
      rbCardElement.textContent = `${card.rank}${card.suit}`;
      const color = getCardColor(card);
      rbCardElement.classList.add(color);
    }
  };

  const flipCard = card => {
    if (!rbCardElement || !card) return;
    rbCardElement.classList.add("flipping");
    setTimeout(() => {
      renderRedBlackCard(card, false);
    }, 300);
  };

  // --- Game Logic ---
  const calculateMultiplier = streak => {
    if (streak <= 0) return 1.0;
    // Original formula: 1 / (0.5^n) is equivalent to 2^n
    return Math.pow(2, streak) * 0.95;
  };

  const updateRedBlackStats = () => {
    rbCurrentMultiplier = calculateMultiplier(rbStreak);
    rbPotentialWinnings = Math.floor(rbCurrentBet * rbCurrentMultiplier);

    if (rbStreakDisplay) rbStreakDisplay.textContent = rbStreak;
    if (rbMultiplierDisplay)
      rbMultiplierDisplay.textContent = rbCurrentMultiplier.toFixed(2);
    if (rbPotentialWinningsDisplay)
      rbPotentialWinningsDisplay.textContent = rbPotentialWinnings;
  };

  const startRedBlackGame = () => {
    if (rbGameState !== "betting") return;

    const betResult = window.placeBet(rbBetInput);
    if (!betResult.success) {
      window.setResult(rbResultDisplay, betResult.message, "loss");
      return;
    }
    rbCurrentBet = betResult.amount;
    rbStreak = 0;
    rbPotentialWinnings = rbCurrentBet;

    rbDeck = createDeck();
    shuffleDeck(rbDeck);
    rbDrawnCard = null;

    rbGameState = "playing"; // Start in playing state
    renderRedBlackCard(null, true); // Show hidden card back
    updateRedBlackStats();
    window.setResult(rbResultDisplay, "Choose Red or Black!", "info");
    window.updateRedBlackControls();
  };

  const makeChoice = choice => {
    // choice is 'red' or 'black'
    if (rbGameState !== "playing") return;

    // Draw card
    if (rbDeck.length === 0) {
      console.log("Deck empty, reshuffling.");
      rbDeck = createDeck();
      shuffleDeck(rbDeck);
    }
    rbDrawnCard = rbDeck.pop();
    const actualColor = getCardColor(rbDrawnCard);

    // Disable choice buttons immediately
    rbRedButton.disabled = true;
    rbBlackButton.disabled = true;

    // Flip the card visually
    flipCard(rbDrawnCard);

    // Wait for flip animation
    setTimeout(() => {
      if (choice === actualColor) {
        // Correct guess
        rbStreak++;
        rbGameState = "revealed"; // State where player decides to continue or cash out
        updateRedBlackStats(); // Update stats *before* showing message
        window.setResult(
          rbResultDisplay,
          `Correct! Card was ${actualColor}. Streak: ${rbStreak}. Continue or Cash Out?`,
          "win"
        );
      } else {
        // Incorrect guess
        rbGameState = "betting"; // Game over, back to betting state
        updateRedBlackStats(); // Update stats (though winnings are lost)
        window.setResult(
          rbResultDisplay,
          `Wrong! Card was ${actualColor}. You lost your bet of ${rbCurrentBet} coins.`,
          "loss"
        );
        rbCurrentBet = 0; // Reset bet
      }
      window.updateRedBlackControls(); // Update buttons for the new state
    }, 700); // Wait for flip + a bit
  };

  // --- NEW FUNCTION ---
  const continueRedBlackRound = () => {
    if (rbGameState !== "revealed") return;

    rbGameState = "playing"; // Go back to the playing state
    renderRedBlackCard(null, true); // Show hidden card back again
    window.setResult(
      rbResultDisplay,
      "Choose Red or Black for the next card!",
      "info"
    );
    window.updateRedBlackControls(); // Update UI for the playing state
  };
  // --- END NEW FUNCTION ---

  const cashOutRedBlack = () => {
    if (rbGameState !== "revealed") return;

    window.awardWinnings(rbPotentialWinnings);
    window.setResult(
      rbResultDisplay,
      `Cashed out ${rbPotentialWinnings} coins! (Multiplier: ${rbCurrentMultiplier.toFixed(
        2
      )}x)`,
      "win"
    );

    rbGameState = "betting";
    rbCurrentBet = 0;
    rbStreak = 0;
    updateRedBlackStats(); // Reset stats display
    window.updateRedBlackControls();
    // renderRedBlackCard(null, true); // Optionally reset card view immediately
  };

  // --- Control Updates & Reset ---
  window.updateRedBlackControls = () => {
    // Add checks for new elements
    if (
      !rbStartButton ||
      !rbBetInput ||
      !rbChoiceButtonsDiv ||
      !rbDecisionButtonsDiv ||
      !rbCashOutButton ||
      !rbContinueButton ||
      !rbRedButton ||
      !rbBlackButton
    )
      return;

    const canBet = rbGameState === "betting";
    const canChoose = rbGameState === "playing";
    const canDecide = rbGameState === "revealed"; // New state check

    // Bet input and Start button
    rbBetInput.disabled = !canBet;
    rbStartButton.disabled = !canBet || window.currentCoins <= 0;

    // Choice buttons (Red/Black)
    rbChoiceButtonsDiv.style.display = canChoose ? "inline-block" : "none"; // ONLY show when choosing
    rbRedButton.disabled = !canChoose;
    rbBlackButton.disabled = !canChoose;

    // Decision buttons (Continue/Cash Out)
    rbDecisionButtonsDiv.style.display = canDecide ? "inline-block" : "none"; // ONLY show when deciding
    rbContinueButton.disabled = !canDecide;
    rbCashOutButton.disabled = !canDecide;
    if (canDecide) {
      // Update cashout button text dynamically
      rbCashOutButton.textContent = `Cash Out (${rbPotentialWinnings} Coins)`;
    }
  };

  window.resetRedBlack = reason => {
    console.log(`Red or Black reset triggered by: ${reason}`);

    if (rbGameState !== "betting" && rbCurrentBet > 0) {
      console.log(
        `Red or Black ended prematurely. Bet of ${rbCurrentBet} lost.`
      );
    }

    rbGameState = "betting";
    rbCurrentBet = 0;
    rbStreak = 0;
    rbDrawnCard = null;
    if (rbCardElement) renderRedBlackCard(null, true);
    updateRedBlackStats();
    if (rbResultDisplay)
      window.setResult(
        rbResultDisplay,
        "Place your bet and start the round.",
        "info"
      );
    window.updateRedBlackControls(); // This will hide choice/decision buttons correctly
  };

  // --- Initialization ---
  function initRedBlack() {
    rbBetInput = document.getElementById("redblack-bet");
    rbStartButton = document.getElementById("redblack-start-button");
    rbChoiceButtonsDiv = document.getElementById("redblack-choice-buttons");
    rbRedButton = document.getElementById("redblack-red-button");
    rbBlackButton = document.getElementById("redblack-black-button");
    rbDecisionButtonsDiv = document.getElementById("redblack-decision-buttons"); // Get the div
    rbContinueButton = document.getElementById("redblack-continue-button"); // Get continue button
    rbCashOutButton = document.getElementById("redblack-cashout-button"); // Get cashout button
    rbCardArea = document.getElementById("redblack-card-area");
    rbCardElement = document.getElementById("redblack-card");
    rbStatsDiv = document.getElementById("redblack-stats");
    rbStreakDisplay = document.getElementById("redblack-streak");
    rbMultiplierDisplay = document.getElementById("redblack-multiplier");
    rbPotentialWinningsDisplay = document.getElementById(
      "redblack-potential-winnings"
    );
    rbResultDisplay = document.getElementById("redblack-result");

    // Add checks for the new elements
    if (
      !rbStartButton ||
      !rbRedButton ||
      !rbBlackButton ||
      !rbDecisionButtonsDiv ||
      !rbContinueButton ||
      !rbCashOutButton ||
      !rbCardElement ||
      !rbResultDisplay
    ) {
      console.error("Red or Black elements not found!");
      return;
    }

    // Add Event Listeners
    rbStartButton.addEventListener("click", startRedBlackGame);
    rbRedButton.addEventListener("click", () => makeChoice("red"));
    rbBlackButton.addEventListener("click", () => makeChoice("black"));
    rbContinueButton.addEventListener("click", continueRedBlackRound); // Add listener for continue
    rbCashOutButton.addEventListener("click", cashOutRedBlack);

    window.resetRedBlack("Initial load");
  }

  // --- Registration ---
  window.registerGame("redblack", initRedBlack);
})();
