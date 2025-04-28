(() => {
  // --- DOM Elements ---
  let rbBetInput;
  let rbStartButton;
  let rbChoiceButtonsDiv;
  let rbRedButton;
  let rbBlackButton;
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

    // Reset classes and styles related to flipping/content first
    rbCardElement.classList.remove("flipping", "red", "black", "hidden");
    rbCardElement.style.transform = ""; // Reset flip
    rbCardElement.textContent = ""; // Clear content

    if (hidden) {
      rbCardElement.classList.add("hidden");
      rbCardElement.textContent = "?";
    } else if (card) {
      rbCardElement.textContent = `${card.rank}${card.suit}`;
      const color = getCardColor(card);
      rbCardElement.classList.add(color); // Add 'red' or 'black' class
    }
  };

  const flipCard = card => {
    if (!rbCardElement || !card) return;

    // Add flipping class to trigger animation
    rbCardElement.classList.add("flipping");

    // Wait for the first half of the flip, then change content
    setTimeout(() => {
      renderRedBlackCard(card, false); // Render revealed card content
    }, 300); // Half of the 0.6s transition
  };

  // --- Game Logic ---
  const calculateMultiplier = streak => {
    if (streak <= 0) return 1.0;
    return (
      Math.round((1 / Math.pow(1 / 2, streak) + Number.EPSILON) * 100) / 100
    );
  };

  const updateRedBlackStats = () => {
    rbCurrentMultiplier = calculateMultiplier(rbStreak);
    rbPotentialWinnings = Math.floor(rbCurrentBet * rbCurrentMultiplier); // Winnings are based on initial bet * multiplier

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
    rbStreak = 0; // Reset streak
    rbPotentialWinnings = rbCurrentBet; // Initial potential is just the bet back

    rbDeck = createDeck();
    shuffleDeck(rbDeck);
    rbDrawnCard = null;

    rbGameState = "playing";
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

    // Flip the card visually
    flipCard(rbDrawnCard);

    // Disable choice buttons immediately after choice
    rbRedButton.disabled = true;
    rbBlackButton.disabled = true;

    // Wait for flip animation to mostly complete before showing result/next state
    setTimeout(() => {
      if (choice === actualColor) {
        // Correct guess
        rbStreak++;
        rbGameState = "revealed"; // State where player decides to continue or cash out
        updateRedBlackStats();
        window.setResult(
          rbResultDisplay,
          `Correct! Card was ${actualColor}. Streak: ${rbStreak}. Continue or Cash Out?`,
          "win"
        );
      } else {
        // Incorrect guess
        rbGameState = "betting"; // Game over, back to betting state
        updateRedBlackStats(); // Update stats one last time (though winnings are lost)
        window.setResult(
          rbResultDisplay,
          `Wrong! Card was ${actualColor}. You lost your bet of ${rbCurrentBet} coins.`,
          "loss"
        );
        rbCurrentBet = 0; // Reset bet as it's lost
      }
      window.updateRedBlackControls(); // Update buttons for the new state
    }, 700); // Slightly longer than flip animation
  };

  const cashOutRedBlack = () => {
    if (rbGameState !== "revealed") return;

    window.awardWinnings(rbPotentialWinnings); // Award the calculated potential winnings
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
    // Optionally reset card view
    // renderRedBlackCard(null, true);
  };

  // --- Control Updates & Reset ---
  window.updateRedBlackControls = () => {
    if (
      !rbStartButton ||
      !rbBetInput ||
      !rbChoiceButtonsDiv ||
      !rbCashOutButton ||
      !rbRedButton ||
      !rbBlackButton
    )
      return;

    const canBet = rbGameState === "betting";
    const canChoose = rbGameState === "playing";
    const canCashOut = rbGameState === "revealed";

    // Bet input and Start button
    rbBetInput.disabled = !canBet;
    rbStartButton.disabled = !canBet || window.currentCoins <= 0;

    // Choice buttons (Red/Black)
    rbChoiceButtonsDiv.style.display =
      canChoose || canCashOut ? "inline-block" : "none"; // Show if playing OR revealed (for continue)
    rbRedButton.disabled = !(canChoose || canCashOut); // Only enabled in 'playing' state before choice
    rbBlackButton.disabled = !(canChoose || canCashOut); // Only enabled in 'playing' state before choice

    // Cash Out button
    rbCashOutButton.style.display = canCashOut ? "inline-block" : "none";
    rbCashOutButton.disabled = !canCashOut;
    if (canCashOut) {
      rbCashOutButton.textContent = `Cash Out (${rbPotentialWinnings} Coins)`;
    }
  };

  window.resetRedBlack = reason => {
    console.log(`Red or Black reset triggered by: ${reason}`);

    // If game was active, bet is lost (already deducted by placeBet)
    if (rbGameState !== "betting" && rbCurrentBet > 0) {
      console.log(
        `Red or Black ended prematurely. Bet of ${rbCurrentBet} lost.`
      );
    }

    rbGameState = "betting";
    rbCurrentBet = 0;
    rbStreak = 0;
    rbDrawnCard = null;
    if (rbCardElement) renderRedBlackCard(null, true); // Reset card view
    updateRedBlackStats(); // Reset stats display
    if (rbResultDisplay)
      window.setResult(
        rbResultDisplay,
        "Place your bet and start the round.",
        "info"
      );
    window.updateRedBlackControls();
  };

  // --- Initialization ---
  function initRedBlack() {
    rbBetInput = document.getElementById("redblack-bet");
    rbStartButton = document.getElementById("redblack-start-button");
    rbChoiceButtonsDiv = document.getElementById("redblack-choice-buttons");
    rbRedButton = document.getElementById("redblack-red-button");
    rbBlackButton = document.getElementById("redblack-black-button");
    rbCashOutButton = document.getElementById("redblack-cashout-button");
    rbCardArea = document.getElementById("redblack-card-area");
    rbCardElement = document.getElementById("redblack-card");
    rbStatsDiv = document.getElementById("redblack-stats");
    rbStreakDisplay = document.getElementById("redblack-streak");
    rbMultiplierDisplay = document.getElementById("redblack-multiplier");
    rbPotentialWinningsDisplay = document.getElementById(
      "redblack-potential-winnings"
    );
    rbResultDisplay = document.getElementById("redblack-result");

    if (
      !rbStartButton ||
      !rbRedButton ||
      !rbBlackButton ||
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
    rbCashOutButton.addEventListener("click", cashOutRedBlack);

    window.resetRedBlack("Initial load");
  }

  // --- Registration ---
  window.registerGame("redblack", initRedBlack);
})();
