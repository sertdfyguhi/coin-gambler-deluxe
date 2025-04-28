// --- Global State (accessible across scripts) ---
window.updateCoins = () => {
  window.localStorage.setItem("coins", window.currentCoins);
};

window.currentCoins = parseInt(window.localStorage.getItem("coins"));
if (isNaN(window.currentCoins) || window.currentCoins == 0) {
  if (window.currentCoins == 0) alert("saved yo broke ahh");

  window.currentCoins = 1000;
  window.updateCoins();
}

window.activeGame = "dice"; // Default game
const gameInitializationFunctions = {}; // Store game init functions

// --- Game Registration (Needs to be available before DOMContentLoaded) ---
// Games should call this function to register their initialization logic
window.registerGame = (gameId, initFunction) => {
  console.log(`Registering: ${gameId}`);
  gameInitializationFunctions[gameId] = initFunction;
};

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements (Accessed after DOM is ready) ---
  const balanceDisplay = document.getElementById("coin-balance");
  const gameNavButtons = document.querySelectorAll("#game-nav button");
  const mainGameArea = document.getElementById("game-area");
  // Note: allBetInputs will need to be re-queried after loading new HTML

  // --- Utility Functions (Defined after DOM is ready, attached to window) ---
  window.placeBet = betAmountInput => {
    // Ensure the input element is valid before accessing value
    if (!betAmountInput) {
      console.error("placeBet called with invalid input element");
      return { success: false, message: "Internal error: Invalid input." };
    }
    const amount = parseInt(betAmountInput.value);
    if (isNaN(amount) || amount <= 0)
      return { success: false, message: "Invalid bet amount." };
    if (amount > window.currentCoins)
      return { success: false, message: "Not enough coins!" };
    window.currentCoins -= amount;
    window.updateBalanceDisplay();
    return { success: true, amount: amount };
  };

  window.awardWinnings = amount => {
    window.currentCoins += Math.round(amount); // Use round to avoid fractional coins
    window.updateBalanceDisplay();
  };

  window.updateBalanceDisplay = () => {
    window.updateCoins();
    if (balanceDisplay) balanceDisplay.textContent = window.currentCoins;
    // Re-query bet inputs within the *currently loaded* game area
    const currentBetInputs = mainGameArea.querySelectorAll(
      '.controls input[type="number"]'
    );
    currentBetInputs.forEach(input => {
      if (input) input.max = window.currentCoins > 0 ? window.currentCoins : 1;
    });
  };

  window.setResult = (displayElement, message, type = "info") => {
    if (!displayElement) {
      console.warn("setResult called with null displayElement");
      return;
    }
    displayElement.textContent = message;
    displayElement.className = "result"; // Reset classes
    if (type === "win") displayElement.classList.add("win");
    else if (type === "loss") displayElement.classList.add("loss");
    else if (type === "push") displayElement.classList.add("push");
    else displayElement.classList.add("info");
  };

  window.disableControls = (containerId, disable = true) => {
    const container = document.getElementById(containerId);
    if (container) {
      // Select only direct controls within the game container's immediate .controls div
      const controlsDiv = container.querySelector(":scope > .controls");
      if (controlsDiv) {
        controlsDiv
          .querySelectorAll("button, input")
          .forEach(el => (el.disabled = disable));
      }
      // Also handle specific cases like player buttons outside the main .controls
      if (containerId === "blackjack-game") {
        container
          .querySelectorAll("#blackjack-player-buttons button")
          .forEach(el => (el.disabled = disable));
      }
    }
  };

  // --- Game Switching Logic (Fetches HTML and Initializes) ---
  window.setActiveGame = async gameId => {
    console.log(`Attempting to set active game: ${gameId}`);
    if (!mainGameArea) {
      console.error("Main game area not found!");
      return;
    }

    // --- 1. Reset Previous Game ---
    // Call the reset function for the *previously* active game, if it exists
    if (
      window.activeGame &&
      window.activeGame !== gameId &&
      typeof window[
        `reset${
          window.activeGame.charAt(0).toUpperCase() + window.activeGame.slice(1)
        }`
      ] === "function"
    ) {
      try {
        window[
          `reset${
            window.activeGame.charAt(0).toUpperCase() +
            window.activeGame.slice(1)
          }`
        ]("Switched games");
      } catch (error) {
        console.error(
          `Error resetting previous game (${window.activeGame}):`,
          error
        );
      }
    }

    // Update internal state *before* fetching
    window.activeGame = gameId;

    // --- 2. Update Navigation ---
    gameNavButtons.forEach(button => {
      button.classList.toggle("active-nav", button.dataset.game === gameId);
    });

    // --- 3. Load New Game HTML ---
    mainGameArea.innerHTML = `<p style="text-align: center; padding: 2rem; color: #666;">Loading ${gameId}...</p>`; // Show loading message
    const htmlPath = `games/${gameId}.html`;

    try {
      const response = await fetch(htmlPath);
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} loading ${htmlPath}`
        );
      }
      const gameHtml = await response.text();
      mainGameArea.innerHTML = gameHtml; // Inject the new HTML

      // --- 4. Initialize New Game ---
      console.log(`HTML for ${gameId} loaded. Initializing...`);
      if (typeof gameInitializationFunctions[gameId] === "function") {
        try {
          gameInitializationFunctions[gameId]();
          console.log(`${gameId} initialized successfully.`);
        } catch (initError) {
          console.error(
            `Error initializing game ${gameId} after loading HTML:`,
            initError
          );
          mainGameArea.innerHTML = `<p style="color: red; text-align: center;">Error initializing ${gameId}. Check console.</p>`;
        }
      } else {
        console.error(
          `Initialization function for ${gameId} not found/registered!`
        );
        mainGameArea.innerHTML = `<p style="color: red; text-align: center;">Error: ${gameId} script not loaded or registered correctly.</p>`;
      }

      // --- 5. Final UI Updates ---
      window.updateBalanceDisplay(); // Ensure balance/input limits are correct for the new game
      // Note: Control enabling/disabling should be handled by the game's init/updateControls function now.
    } catch (error) {
      console.error(`Failed to load game ${gameId}:`, error);
      mainGameArea.innerHTML = `<p style="color: red; text-align: center;">Failed to load ${gameId}. Please try again or check the console.</p>`;
    }
  };

  // --- Initialization (Runs after DOM is ready) ---

  // Add navigation listeners
  gameNavButtons.forEach(button => {
    const gameId = button.dataset.game;
    if (gameId) {
      button.addEventListener("click", () => window.setActiveGame(gameId));
    }
  });

  // Load the initial game
  if (window.activeGame) {
    console.log(`Loading initial game: ${window.activeGame}`);
    // Use setTimeout to ensure game scripts have had a chance to register
    setTimeout(() => setActiveGame(window.activeGame), 0);
  } else {
    console.error("No initial active game defined.");
    mainGameArea.innerHTML = `<p style="color: red; text-align: center;">Error: No initial game configured.</p>`;
  }

  console.log("Main script DOMContentLoaded setup complete.");
}); // End DOMContentLoaded
