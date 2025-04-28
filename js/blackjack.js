(() => {
    // Declare variables
    let blackjackBetInput;
    let blackjackDealButton;
    let blackjackPlayerButtons;
    let blackjackHitButton;
    let blackjackStandButton;
    let blackjackDealerCardsDiv;
    let blackjackPlayerCardsDiv;
    let blackjackDealerTotalSpan;
    let blackjackPlayerTotalSpan;
    let blackjackResultDiv;

    let blackjackDeck = [];
    let blackjackPlayerHand = [];
    let blackjackDealerHand = [];
    let blackjackGameActive = false; // Is a hand currently being played?
    let blackjackDealerTurnTimeout = null;
    let blackjackCurrentBet = 0;

    const createDeck = () => {
        const suits = ['♥', '♦', '♣', '♠'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank });
            }
        }
        return deck;
    };

    const shuffleDeck = (deck) => {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap
        }
    };

    const getCardValue = (card) => {
        if (['J', 'Q', 'K', '10'].includes(card.rank)) return 10;
        if (card.rank === 'A') return 11; // Return 11 for Ace initially
        return parseInt(card.rank);
    };

    const calculateHandTotal = (hand) => {
        let total = 0;
        let aces = 0;
        hand.forEach(card => {
            if (card.rank === 'A') aces++;
            total += getCardValue(card);
        });
        // Adjust for Aces if total > 21
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    };

    const renderCard = (card, hidden = false) => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (hidden) {
            cardDiv.classList.add('hidden');
            cardDiv.textContent = '?';
        } else {
            cardDiv.textContent = `${card.rank}${card.suit}`;
            if (['♥', '♦'].includes(card.suit)) cardDiv.classList.add('red');
            else cardDiv.classList.add('black');
        }
        return cardDiv;
    };

    const updateBlackjackUI = (revealDealer = false) => {
        if (!blackjackPlayerCardsDiv || !blackjackDealerCardsDiv || !blackjackPlayerTotalSpan || !blackjackDealerTotalSpan) return;

        // Player Hand
        blackjackPlayerCardsDiv.innerHTML = '';
        blackjackPlayerHand.forEach(card => blackjackPlayerCardsDiv.appendChild(renderCard(card)));
        const playerTotal = calculateHandTotal(blackjackPlayerHand);
        blackjackPlayerTotalSpan.textContent = playerTotal;

        // Dealer Hand
        blackjackDealerCardsDiv.innerHTML = '';
        let dealerTotal = 0;
        if (blackjackDealerHand.length > 0) {
             blackjackDealerHand.forEach((card, index) => {
                 blackjackDealerCardsDiv.appendChild(renderCard(card, index === 0 && !revealDealer && blackjackGameActive));
             });
             dealerTotal = calculateHandTotal(blackjackDealerHand);
        }

        // Show dealer total only if revealed or player busted or game not active
        const showDealerTotal = revealDealer || playerTotal > 21 || !blackjackGameActive;
        blackjackDealerTotalSpan.textContent = showDealerTotal ? dealerTotal : '?';

        window.updateBlackjackControls(); // Update button visibility/state
    };

    const dealBlackjack = () => {
        if (blackjackGameActive) return;

        const betResult = window.placeBet(blackjackBetInput);
        if (!betResult.success) {
            window.setResult(blackjackResultDiv, betResult.message, 'loss');
            return;
        }
        blackjackCurrentBet = betResult.amount;
        blackjackGameActive = true;

        blackjackDeck = createDeck();
        shuffleDeck(blackjackDeck);
        blackjackPlayerHand = [blackjackDeck.pop(), blackjackDeck.pop()];
        blackjackDealerHand = [blackjackDeck.pop(), blackjackDeck.pop()];

        window.setResult(blackjackResultDiv, "Your turn. Hit or Stand?", 'info');
        updateBlackjackUI();

        // Check for immediate player Blackjack
        if (calculateHandTotal(blackjackPlayerHand) === 21) {
            // Player Blackjack - Dealer checks for Blackjack too
            const dealerTotal = calculateHandTotal(blackjackDealerHand);
            if (dealerTotal === 21) {
                 // Push on double Blackjack
                 determineBlackjackWinner();
            } else {
                 // Player wins with Blackjack (usually pays 3:2, here 1.5x bet + original bet)
                 const winnings = blackjackCurrentBet * 2.5;
                 window.awardWinnings(winnings);
                 window.setResult(blackjackResultDiv, `Blackjack! You win ${winnings.toFixed(0)} coins!`, 'win');
                 blackjackGameActive = false;
                 updateBlackjackUI(true); // Reveal dealer hand
            }
        }
    };

    const hitBlackjack = () => {
        if (!blackjackGameActive) return;
        blackjackPlayerHand.push(blackjackDeck.pop());
        const playerTotal = calculateHandTotal(blackjackPlayerHand);
        updateBlackjackUI();

        if (playerTotal > 21) {
            window.setResult(blackjackResultDiv, `Busted with ${playerTotal}! You lost ${blackjackCurrentBet} coins.`, 'loss');
            blackjackGameActive = false;
            updateBlackjackUI(true); // Reveal dealer card on bust
        }
    };

    const standBlackjack = () => {
        if (!blackjackGameActive) return;
        // Player turn ends, disable hit/stand immediately
        blackjackGameActive = true; // Keep game active during dealer turn
        if (blackjackPlayerButtons) {
            blackjackPlayerButtons.style.display = 'none';
        }

        // Dealer's turn
        updateBlackjackUI(true); // Reveal dealer's hidden card
        window.setResult(blackjackResultDiv, "Dealer's turn...", 'info');

        if (blackjackDealerTurnTimeout) clearTimeout(blackjackDealerTurnTimeout);

        function dealerTurn() {
            const dealerTotal = calculateHandTotal(blackjackDealerHand);
            if (dealerTotal < 17) {
                blackjackDealerTurnTimeout = setTimeout(() => {
                    blackjackDealerHand.push(blackjackDeck.pop());
                    updateBlackjackUI(true);
                    dealerTurn(); // Recursive call until dealer stands or busts
                }, 800); // Delay for dealer hit visibility
            } else {
                // Dealer stands or busts - determine winner
                determineBlackjackWinner();
            }
        }
        blackjackDealerTurnTimeout = setTimeout(dealerTurn, 500); // Initial delay before dealer starts hitting
    };

    const determineBlackjackWinner = () => {
        blackjackGameActive = false; // Game is now over
        if (blackjackDealerTurnTimeout) clearTimeout(blackjackDealerTurnTimeout);

        const dealerTotal = calculateHandTotal(blackjackDealerHand);
        const playerTotal = calculateHandTotal(blackjackPlayerHand);
        updateBlackjackUI(true); // Ensure final state is shown

        let message = "";
        let resultType = 'info';

        // Player already busted (handled in hitBlackjack)
        if (playerTotal > 21) {
             message = `Player busts with ${playerTotal}! Lost ${blackjackCurrentBet} coins.`;
             resultType = 'loss';
        } else if (dealerTotal > 21) {
            message = `Dealer busts with ${dealerTotal}! You win ${blackjackCurrentBet * 2} coins!`;
            window.awardWinnings(blackjackCurrentBet * 2); // Win 1:1 + original bet back
            resultType = 'win';
        } else if (dealerTotal === playerTotal) {
            message = `Push! Both have ${playerTotal}. Bet of ${blackjackCurrentBet} returned.`;
            window.awardWinnings(blackjackCurrentBet); // Return original bet
            resultType = 'push';
        } else if (dealerTotal > playerTotal) {
            message = `Dealer wins (${dealerTotal} vs ${playerTotal}). Lost ${blackjackCurrentBet} coins.`;
            resultType = 'loss';
        } else { // Player total > Dealer total
            message = `You win! (${playerTotal} vs ${dealerTotal}). Won ${blackjackCurrentBet * 2} coins!`;
            window.awardWinnings(blackjackCurrentBet * 2); // Win 1:1 + original bet back
            resultType = 'win';
        }

        window.setResult(blackjackResultDiv, message, resultType);
        blackjackCurrentBet = 0;
        window.updateBlackjackControls(); // Update controls for new game availability
    };

    window.resetBlackjack = (reason) => {
        console.log(`Blackjack reset triggered by: ${reason}`);
        if (blackjackDealerTurnTimeout) clearTimeout(blackjackDealerTurnTimeout);
        blackjackDealerTurnTimeout = null;

        // If a game was active and reset (e.g., switching games), the bet is lost
        if (blackjackGameActive && blackjackCurrentBet > 0) {
            console.log(`Blackjack game ended prematurely. Bet of ${blackjackCurrentBet} lost.`);
            // Balance already reflects the bet placement
        }

        blackjackPlayerHand = [];
        blackjackDealerHand = [];
        blackjackGameActive = false;
        blackjackCurrentBet = 0;
        if(blackjackPlayerCardsDiv) blackjackPlayerCardsDiv.innerHTML = '';
        if(blackjackDealerCardsDiv) blackjackDealerCardsDiv.innerHTML = '';
        if(blackjackPlayerTotalSpan) blackjackPlayerTotalSpan.textContent = '0';
        if(blackjackDealerTotalSpan) blackjackDealerTotalSpan.textContent = '0';
        if(blackjackResultDiv) window.setResult(blackjackResultDiv, "Place your bet and click Deal.", 'info');
        window.updateBlackjackControls();
    }

    window.updateBlackjackControls = () => {
        if (!blackjackDealButton || !blackjackPlayerButtons || !blackjackBetInput) return;

        const dealDisabled = blackjackGameActive || window.currentCoins <= 0;
        blackjackDealButton.disabled = dealDisabled;
        blackjackBetInput.disabled = blackjackGameActive;

        // Show/hide player buttons (Hit/Stand)
        blackjackPlayerButtons.style.display = blackjackGameActive ? 'inline-block' : 'none';
        if (blackjackGameActive) {
             // Hit/Stand should be enabled if game is active and player hasn't busted
             const playerTotal = calculateHandTotal(blackjackPlayerHand);
             const buttonsDisabled = playerTotal > 21;
             if(blackjackHitButton) blackjackHitButton.disabled = buttonsDisabled;
             if(blackjackStandButton) blackjackStandButton.disabled = buttonsDisabled;
        }
    }

    function initBlackjack() {
        // Get elements inside init
        blackjackBetInput = document.getElementById('blackjack-bet');
        blackjackDealButton = document.getElementById('blackjack-deal-button');
        blackjackPlayerButtons = document.getElementById('blackjack-player-buttons');
        blackjackHitButton = document.getElementById('blackjack-hit-button');
        blackjackStandButton = document.getElementById('blackjack-stand-button');
        blackjackDealerCardsDiv = document.getElementById('blackjack-dealer-cards');
        blackjackPlayerCardsDiv = document.getElementById('blackjack-player-cards');
        blackjackDealerTotalSpan = document.getElementById('blackjack-dealer-total');
        blackjackPlayerTotalSpan = document.getElementById('blackjack-player-total');
        blackjackResultDiv = document.getElementById('blackjack-result');

        if (!blackjackDealButton || !blackjackHitButton || !blackjackStandButton) {
            console.error("Blackjack elements not found even after init!");
            return;
        }
        blackjackDealButton.addEventListener('click', dealBlackjack);
        blackjackHitButton.addEventListener('click', hitBlackjack);
        blackjackStandButton.addEventListener('click', standBlackjack);
        window.resetBlackjack("Initial load");
    }

    window.registerGame('blackjack', initBlackjack);

})(); 