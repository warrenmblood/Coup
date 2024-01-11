// select divs
const playerMats = [...document.querySelectorAll('.mat')];
const playerNames = playerMats.map((mat) => mat.querySelector('.name') );
const playerCoins = playerMats.map((mat) => mat.querySelector('.coins') );
const playerCards = playerMats.map((mat) => [...mat.querySelectorAll('.card')]);
const playerCardFronts = playerCards.map((cardArr)  => cardArr.map((card) => card.querySelector('.front')));
const message = document.querySelector('.message');
const buttons = [...document.querySelectorAll('.button')];
const bottomBtn = document.querySelector('.bottomBtn');
const exchangeCardDivs = [...document.querySelectorAll('.cardOption')];
const exchangeCardFronts = exchangeCardDivs.map((card) => card.querySelector('.front'));

// game state variabes
let nPlayers; // number of players (active and eliminated)
let acting = 0; // index (in players) of player currently acting
let currentAction; // action currently being attempted by players[acting]
let counteracting; // index (in players) of player currently counteracting currentAction (if applicable)
let currentInfluence; // name of influence currently being used for action or counteraction
let currentMsg; // main message to be displayed
let targetPlayer; // index (in players) of player who is currently the target of an elimination or coup
let blocked = false; // whether an action is currently being blocked
let challenged = false; // whether an action or counteraction is currently being challenged
let targetWonChallenge; // whether target of a challenge won
let activeBtns = []; // class names of buttons available to select
let exchangeOptions = []; // influence objects a player can select from during an exchange
let showCard; // card div to be shown to all players after challenge

// button info (class name: text displayed on button)
const actions = ['income', 'foreignAid', 'coup', 'tax', 'assassinate', 'exchange', 'steal'];
const actionsText = ['Income', 'Foreign Aid', 'Coup (7)', 'Tax', 'Assassinate (3)', 'Exchange', 'Steal'];
const counteractions = ['accept', 'challenge', 'block-Duke', 'block-Captain', 'block-Ambassador', 'block-Contessa'];
const counteractionsText = ['Accept', 'Challenge', 'Block: Duke', 'Block: Captain', 'Block: Ambassador', 'Block: Contessa'];
const coupOptions = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
const coupOptionsText = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];

// messages
const counteractPrompt = 'Select player to Counteract:'

// player object
const Player = {
    name: '',
    coins: 2,
    active: true
};

// influence object
const Influence = {
    name: '',
    eliminated: false
};

const players = []; // array of all players
const deck = []; // deck (array) of influence cards

// helper function: shuffle array
function shuffle(array) {
    for(let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// player action: take 1 coin. Cannot be blocked or challenged
function income() {
    players[acting].coins += 1;
    currentMsg = `${players[acting].name} takes INCOME (1 coin).`;
    completeTurn();
}

// player action: take 2 coins. Cannot be challenged
function foreignAid() {
    players[acting].coins += 2;
    currentMsg += `${players[acting].name} takes FOREIGN AID (2 coins).`;
    completeTurn();
}

// player action: eliminate 1 of target's influences if correctly specified. Cannot be blocked or challenged
function coup(e) {
    const pause = 1500; // miliseconds before coup result is displayed
    const influenceName = e.target.classList[1];
    const target = players[targetPlayer];
    resetBtns();
    currentMsg = `${players[acting].name} COUPS ${target.name}'s ${influenceName}.`;
    updateMessage(currentMsg);
    if(target.influences.some((c) => (!c.eliminated) && (c.name === influenceName))) { // target has specified influence
        const idx = target.influences.findIndex((c) => (!c.eliminated) && (c.name === influenceName));
        currentMsg = `COUP successful: ${players[acting].name} eliminates ${target.name}'s ${influenceName}.\r\n`;
        setTimeout(() => eliminate(targetPlayer, idx), pause);
    } else {
        currentMsg = `COUP unsuccessful: ${target.name} doesn't have ${influenceName}.\r\n`;
    }
    setTimeout(completeTurn, pause);
}

// player action: take 3 coins. Cannot be blocked
function tax() {
    players[acting].coins += 3;
    currentMsg += `${players[acting].name} takes TAX (3 coins).`;
    completeTurn();
}

// player action: choose player and eliminate 1 of their influences
function assassinate() {
    if(players[counteracting].influences.some((c) => (!c.eliminated))) { // target (counteracting) has an influence left to eliminate
        currentMsg += `${players[acting].name} ASSASSINATES ${players[counteracting].name}.\r\n${players[counteracting].name} loses an Influence.\r\n`;
        eliminateFromHand(counteracting);
    } else {
        completeTurn();
    }
}

// player action (part 1): prompt player to choose cards to keep between their currently active one(s) and 2 drawn from deck.
// # of active cards in player's hand should be the same before and after the exchange. Cannot be blocked
function setExchange() {
    hideAllCards();
    resetBtns();
    deactivateBottomBtn();
    bottomBtn.textContent = 'Select';
    const active = players[acting].influences.filter((c) => !c.eliminated); // player's currently active cards
    exchangeOptions = [];
    exchangeOptions = exchangeOptions.concat(active); // add currently active cards to options
    exchangeOptions.push(deck.pop(), deck.pop()); // add 2 cards drawn from deck to options
    // hide active cards on mat and replace influence with a placeholder
    active.forEach((c) => { 
        const idx = players[acting].influences.indexOf(c);
        fadeOut.call(playerCards[acting][idx]);
        players[acting].influences.splice(idx, 1, 'exchange');
    });
    // display exchange option cards at bottom of window
    for(let i = 0; i < exchangeOptions.length; i++) {
        exchangeCardFronts[i].innerHTML = `<img src="images/${exchangeOptions[i].name}.png" alt="${exchangeOptions[i].name}">`;
        exchangeCardDivs[i].classList.remove('hidden');
        activateCardOption(exchangeCardFronts[i]);
        exchangeCardDivs[i].classList.toggle('flipCard');
        exchangeCardFronts[i].addEventListener('click', selectCard);
    }
    updateMessage(`(${players[acting].name}) Select ${active.length} Influence(s) to keep:`);
}

// select chosen card for exchange if max # has not been reached. Activate select button if max # reached with this selection
function selectCard(e) {
    const numSelected = exchangeCardFronts.reduce((a, b) => a + b.classList.contains('selectedCard'), 0); // # cards already selected
    if(numSelected >= exchangeOptions.length - 2) { // numCards already at max
        return;
    } else if (numSelected >= exchangeOptions.length - 3) { // numCards reaches max with this selection
        activateBottomBtn();
    }
    const selected = e.target.parentElement;
    deactivateCardOption(selected);
    selected.classList.add('selectedCard');
    selected.removeEventListener('click', selectCard);
    selected.addEventListener('click', deselectCard);
}

// deselect card that is currently selected from exchange card options. deactivate select button if active
function deselectCard(e) {
    const numSelected = exchangeCardFronts.reduce((a, b) => a + b.classList.contains('selectedCard'), 0); // # cards already selected
    if(numSelected >= exchangeOptions.length - 2) { //numCards currently at max
        deactivateBottomBtn();
    }
    const selected = e.target.parentElement;
    activateCardOption(selected);
    selected.classList.remove('selectedCard');
    selected.removeEventListener('click', deselectCard);
    selected.addEventListener('click', selectCard);
}

// player action (part 2): update player's hands once cards are selected for EXCHANGE
function executeExchange() {
    deactivateBottomBtn();
    setTimeout(() => {
        bottomBtn.textContent = 'New Game';
        bottomBtn.classList.remove('inactive');
        bottomBtn.addEventListener('mouseenter', addHighlightBtn);
        bottomBtn.addEventListener('mouseleave', removeHighlightBtn);
        bottomBtn.addEventListener('click', startGame);
    }, 4000);
    const selected = [];
    const discarded = [];
    exchangeCardFronts.forEach((c) => {
        const idx = exchangeCardFronts.indexOf(c);
        if(c.classList.contains('selectedCard')) {
            selected.push(exchangeOptions[idx]);
            c.classList.remove('selectedCard');
            c.removeEventListener('click', deselectCard);
        } else {
            discarded.push(exchangeOptions[idx]);
        }
    });
    exchangeCardDivs.forEach((c) => {
        if(c.classList.contains('flipCard')) c.classList.toggle('flipCard');
        c.classList.add('hidden');
    });
    discarded.forEach((c) => deck.push(c));
    shuffle(deck);
    selected.forEach((c) => players[acting].influences.splice(players[acting].influences.indexOf('exchange'), 1, c));
    playerCards[acting].forEach((c) => c.classList.remove('fade-out'));
    currentMsg += `${players[acting].name} EXCHANGES.`;
    completeTurn();
}

// activate bottom button for selecting exchange cards
function activateBottomBtn() {
    bottomBtn.classList.remove('inactive');
    bottomBtn.addEventListener('mouseenter', addHighlightBtn);
    bottomBtn.addEventListener('mouseleave', removeHighlightBtn);
    bottomBtn.addEventListener('click', executeExchange);
}

// deactivate bottom button for selecting exchange cards
function deactivateBottomBtn() {
    bottomBtn.classList.remove('highlightedBtn');
    bottomBtn.classList.add('inactive');
    bottomBtn.removeEventListener('mouseenter', addHighlightBtn);
    bottomBtn.removeEventListener('mouseleave', removeHighlightBtn);
    bottomBtn.removeEventListener('click', executeExchange);
    bottomBtn.removeEventListener('click', startGame);
}

// player action: steal 2 coins from another player
function steal() {
    const coins = Math.min(players[counteracting].coins, 2);
    players[acting].coins += coins;
    players[counteracting].coins -= coins;
    const coinsText = (coins === 1) ? `${coins} coin` : `${coins} coins`;
    currentMsg += `${players[acting].name} STEALS ${coinsText} from ${players[counteracting].name}.`;
    completeTurn();
}

/* execute a challenge: determine if target won challenge. If yes, exchange target's influence
challenger: player doing the challenge
target: player being challenged
influenceName (string): specified influence name */
function challenge(challengerIdx, targetIdx, influenceName) {
    challenged = true;
    const challenger = players[challengerIdx];
    const target = players[targetIdx];
    currentMsg = `${challenger.name} challenges ${target.name}'s ${influenceName}.\r\n`;
    updateMessage(currentMsg);
    if(target.influences.some((c) => (!c.eliminated) && (c.name === influenceName))) { // target has specified influence
        targetWonChallenge = true;
        currentMsg = `Challenge unsuccessful (${target.name} has ${influenceName}).\r\n${target.name} exchanges ${influenceName}.\r\n${challenger.name} loses an Influence.\r\n`;
        const idx = target.influences.findIndex((c) => (!c.eliminated) && (c.name === influenceName));
        showCard = playerCards[targetIdx][idx];
        // exchange target's influence
        deck.push(target.influences.splice(idx, 1)[0]); // remove card from player and add to deck
        shuffle(deck);
        target.influences.splice(idx, 0, deck.pop()); // remove last card from deck and add to player's hand at index
    } else { // target does not have specified influence
        targetWonChallenge = false;
        currentMsg = `Challenge successful (${target.name} doesn't have ${influenceName}).\r\n${challenger.name} eliminates ${target.name}'s Influence.\r\n`;
    }
}

// activate appropriate buttons after a player blocks an action
function block() {
    hideAllCards();
    blocked = true;
    resetBtns();
    activeBtns = ['accept', 'challenge'];
    for(let i = 0; i < activeBtns.length; i++) {
        buttons[i].classList.remove('hidden');
        buttons[i].classList.add(activeBtns[i]);
        activateBtn(buttons[i]);
        buttons[i].addEventListener('click', executeCounteraction);
    }
    showPlayerCards(acting);
    currentMsg += `${players[counteracting].name} (with ${currentInfluence}) blocks.\r\n`;
    updateMessage(currentMsg);
}

// add highlight to button
function addHighlightBtn() {
    this.classList.add('highlightedBtn');
}

// remove highlight from button
function removeHighlightBtn() {
    this.classList.remove('highlightedBtn');
}

// add highlight to player mat
function addHighlightMat(e) {
    const playerIndex = playerNames.indexOf(e.target);
    playerMats[playerIndex].classList.add('highlightedBtn');
}

// remove highlight from player mat
function removeHighlightMat(e) {
    const playerIndex = playerNames.indexOf(e.target);
    playerMats[playerIndex].classList.remove('highlightedBtn');
}

// add highlight to card
function addHighlightCard() {
    this.classList.remove('inactive');
}

// add highlight to card
function removeHighlightCard() {
    this.classList.add('inactive');
}

// add hover highlight effect for a card that can be selected
function activateCardOption(card) {
    card.classList.add('inactive');
    card.addEventListener('mouseenter', addHighlightCard);
    card.addEventListener('mouseleave', removeHighlightCard);
}

// remove hover highlight effect for a card that cannot be selected
function deactivateCardOption(card) {
    card.classList.remove('inactive');
    card.removeEventListener('mouseenter', addHighlightCard);
    card.removeEventListener('mouseleave', removeHighlightCard);
}

// card flip animation
function flipCard() {
    this.classList.toggle('flipCard');
}

// update displayed message
function updateMessage(text) {
    message.textContent = text;
}

// disappearing animation
function fadeOut() {
    this.classList.add('fade-out');
}

/* eliminate a card from player's hand
if both remaining cards in hand are active, prompt player to select card to be eliminated
if only one active card remains, eliminate player */
function eliminateFromHand(playerIdx) {
    if(players[playerIdx].influences.some((c) => c.eliminated) || 
        ((currentAction === assassinate) && 
        ((blocked && challenged && !targetWonChallenge) ||  // blocked with contessa. target lost challenge
        (!blocked && challenged && targetWonChallenge)))) // challenged assassin. target won challenge
        {
    // only 1 possible card to eliminate, or both are eliminated on this turn. player is eliminated
        const idx = players[playerIdx].influences.findIndex((c) => !c.eliminated);
        eliminate(playerIdx, idx);
        if(!(challenged && (blocked !== targetWonChallenge))) {
            completeTurn();
        } else {
            currentAction.call();
        }
    } else {
        selectFromHand(playerIdx);
    }
}

// prompt player to choose a card from their hand to be eliminated. activate appropriate buttons
function selectFromHand(playerIdx) {
    targetPlayer = playerIdx;
    resetBtns();
    hideAllCards();
    playerCardFronts[playerIdx].forEach((front) => {
        activateCardOption(front);
        front.addEventListener('click', eliminateSelected);
    });
    showPlayerCards(playerIdx);
    const msg = `(${players[targetPlayer].name}) Choose Influence to be eliminated:`;
    updateMessage(msg);
}

// eliminate a card that a player has selected
function eliminateSelected(e) {
    const elimIdx = playerCardFronts[targetPlayer].indexOf(e.target.parentElement);
    eliminate(targetPlayer, elimIdx);
    playerCardFronts[targetPlayer].forEach((front) => {
        deactivateCardOption(front);
        front.removeEventListener('click', eliminateSelected);
    });
    if(!(challenged && (blocked !== targetWonChallenge))) {
        completeTurn();
    } else {
        currentAction.call();
    }
}

// eliminate a player's influence: update eliminated property and flip card if not already face up
function eliminate(playerIdx, cardIdx) {
    players[playerIdx].influences[cardIdx].eliminated = true;
    const elimCard =  playerCards[playerIdx][cardIdx];
    elimCard.querySelector('.front').classList.add('eliminated');
    if(!elimCard.classList.contains('flipCard')){
        elimCard.classList.toggle('flipCard');
    }
}

// update player mats: card images, active status, and coins
function updatePlayers() {
    for(let i=0; i < nPlayers; i++) { // loop through all players
        const cardNames = players[i].influences.map((influence) => influence.name); // names of each card player has
        for(let j = 0; j < cardNames.length; j++) { // loop through player's cards
            playerCardFronts[i][j].innerHTML = `<img src="images/${cardNames[j]}.png" alt="${cardNames[j]}">`; // update card image
        }
        if(!players[i].active || !players[i].influences.some((c) => (!c.eliminated))) { // player is eliminated
            playerCoins[i].textContent = `Coins: -`;
            playerNames[i].classList.add('eliminated');
            playerCoins[i].classList.add('eliminated');
            players[i].active = false;
        } else {
            playerCoins[i].textContent = `Coins: ${players[i].coins}`; // update coins
        }
    }
}

// place a given player's cards face up
function showPlayerCards(playerIdx) {
    playerCards[playerIdx].forEach(card => {
        if(!card.classList.contains('flipCard')) {
            card.classList.toggle('flipCard');
        }
    });
}

// turn all (non-eliminated) cards facedown
function hideAllCards() {
    for(let i = 0; i < playerCards.length; i++) {
        for(let j = 0; j < 2; j++) {
            if(!players[i].influences[j].eliminated && playerCards[i][j].classList.contains('flipCard')) {
                playerCards[i][j].classList.toggle('flipCard');
            }
        }
    }
}

// start next player's turn
function startNextTurn() {
    showPlayerCards(acting);
    if(players[acting].coins < 10) {
        activeBtns.push('income', 'foreignAid', 'tax', 'exchange', 'steal');
        if(players[acting].coins > 2) {
            activeBtns.push('assassinate');
        }
    }
    if(players[acting].coins > 6) {
        activeBtns.push('coup');
    }
    displayActions();
}

// display action screen and activate appropriate buttons
function displayActions() {
    for(let i = 0; i < actions.length; i++) {
        buttons[i].classList.remove('hidden');
        buttons[i].classList.add(actions[i]);
        buttons[i].classList.add('inactive');
        buttons[i].textContent = actionsText[i];
        if(activeBtns.includes(actions[i])) {
            activateBtn(buttons[i]);
            buttons[i].addEventListener('click', executeAction);
        }
    }
    currentMsg = `${players[acting].name}'s turn. Select action:`;
    updateMessage(currentMsg);
}

// update appearance and add hover highlight for a button that can be pressed
function activateBtn(btn) {
    btn.classList.remove('hidden');
    btn.classList.remove('inactive');
    btn.addEventListener('mouseenter', addHighlightBtn);
    btn.addEventListener('mouseleave', removeHighlightBtn);
}

// update appearance and remove all event listeners for a button that cannot be pressed
function deactivateBtn(btn) {
    let hidden = false;
    if(btn.classList.contains('hidden')) hidden = true;
    btn.classList.remove(...btn.classList);
    btn.classList.add('button');
    if(hidden) {
        btn.classList.add('hidden');
    } else {
        btn.classList.add('inactive');
    }
    btn.removeEventListener('mouseenter', addHighlightBtn);
    btn.removeEventListener('mouseleave', removeHighlightBtn);
    btn.removeEventListener('click', executeAction);
    btn.removeEventListener('click', executeCounteraction);
    btn.removeEventListener('click', coup);
}

// deactivate all buttons and empty activeBtns
function resetBtns() {
    buttons.forEach(btn => deactivateBtn(btn));
    activeBtns = [];
}

// hide all button divs
function hideBtns() {
    buttons.forEach((btn) => btn.classList.add('hidden'));
}

// initiate action corresponding to button clicked
function executeAction(e) {
    const actionName = e.target.classList[1];
    if(actionName === 'income') {
        currentAction = income;
        income();
    } else if(actionName === 'foreignAid') {
        currentAction = foreignAid;
        currentMsg = `${players[acting].name} takes FOREIGN AID (2 coins).\r\n${counteractPrompt}`;
        selectPlayer();
    } else if(actionName === 'coup') {
        currentAction = coup;
        players[acting].coins -= 7; // costs 7 coins
        currentMsg = `(${players[acting].name}) Select player to COUP:`;
        selectPlayer();
    } else if(actionName === 'tax') {
        currentAction = tax;
        currentInfluence = 'Duke';
        currentMsg = `${players[acting].name} (with Duke) takes TAX (3 coins).\r\n${counteractPrompt}`;
        selectPlayer();
    } else if(actionName === 'assassinate') {
        currentAction = assassinate;
        players[acting].coins -= 3; // costs 3 coins
        currentInfluence = 'Assassin';
        currentMsg = `(${players[acting].name}) Select player to ASSASSINATE:`;
        selectPlayer();
    } else if(actionName === 'exchange') {
        currentAction = setExchange;
        currentInfluence = 'Ambassador';
        currentMsg = `${players[acting].name} (with Ambassador) EXCHANGES.\r\n${counteractPrompt}`;
        selectPlayer();
    } else if(actionName === 'steal') {
        currentAction = steal;
        currentInfluence = 'Captain';
        currentMsg = `(${players[acting].name}) Select player to STEAL from:`;
        selectPlayer();
    }
}

// activate buttons to select from all relevant players
function selectPlayer() {
    resetBtns();
    hideAllCards();
    for(let i = 0; i < players.length; i++) {
        if(i !== acting && players[i].active) {
            playerNames[i].addEventListener('mouseenter', addHighlightMat);
            playerNames[i].addEventListener('mouseleave', removeHighlightMat);
            if(currentAction === coup) { 
                playerNames[i].addEventListener('click', selectCoupInfluence);
            } else {
                playerNames[i].addEventListener('click', counteraction);
            }
        }
    }
    updateMessage(currentMsg);
}

// activate buttons to select an Influence name for Coup of target player
function selectCoupInfluence(e) {
    playerNames.forEach((p) => {
        const idx = playerNames.indexOf(p);
        playerMats[idx].classList.remove('highlightedBtn');
        p.removeEventListener('mouseenter', addHighlightMat);
        p.removeEventListener('mouseleave', removeHighlightMat);
        p.removeEventListener('click', selectCoupInfluence);
    });
    hideBtns();
    targetPlayer = playerNames.indexOf(e.target);
    for(let i = 0; i < coupOptions.length; i++) {
        const j = (i === 4) ? 5 : i; // display 5th coup option on 6th button
        activeBtns.push(coupOptions[i]);
        buttons[j].classList.remove('hidden');
        buttons[j].classList.add(coupOptions[i]);
        buttons[j].textContent = coupOptionsText[i];
        activateBtn(buttons[j]);
        buttons[j].addEventListener('click', coup);
    }
    currentMsg = `(${players[acting].name}) Select Influence to COUP ${players[targetPlayer].name}:`;
    updateMessage(currentMsg);
}

// display counteraction screen and activate appropriate buttons
function counteraction(e) {
    // remove event listeners from player mats
    playerNames.forEach((p) => {
        const idx = playerNames.indexOf(p);
        playerMats[idx].classList.remove('highlightedBtn');
        p.removeEventListener('mouseenter', addHighlightMat);
        p.removeEventListener('mouseleave', removeHighlightMat);
        p.removeEventListener('click', counteraction);
    });
    counteracting = playerNames.indexOf(e.target);
    hideBtns();
    hideAllCards();
    showPlayerCards(counteracting);
    activeBtns.push('accept');
    if(currentAction === foreignAid) {
        activeBtns.push('block-Duke');
    } else if(currentAction === assassinate) {
        activeBtns.push('block-Contessa');
        activeBtns.push('challenge');
    } else if(currentAction === steal) {
        activeBtns.push('block-Ambassador');
        activeBtns.push('block-Captain');
        activeBtns.push('challenge');
    } else {
        activeBtns.push('challenge');
    }
    for(let i = 0; i < counteractions.length; i++) {
        buttons[i].classList.remove('hidden');
        buttons[i].classList.add(counteractions[i]);
        buttons[i].classList.add('inactive');
        buttons[i].textContent = counteractionsText[i];
        if(activeBtns.includes(counteractions[i])) {
            activateBtn(buttons[i]);
            buttons[i].addEventListener('click', executeCounteraction);
        }
    }
    currentMsg = currentMsg.replace(counteractPrompt,'');
    if(currentAction === steal) {
        currentMsg = `${players[acting].name} (with Captain) STEALS from ${players[counteracting].name}.\r\n`;
    } else if(currentAction === assassinate) {
        currentMsg = `${players[acting].name} (with Assassin) ASSASSINATES ${players[counteracting].name}.\r\n`;
    }
    updateMessage(currentMsg);
}

// initiate counteraction corresponding to button clicked
function executeCounteraction(e) {
    const actionName = e.target.classList[1];
    if(actionName==='accept') {
        if(blocked) {
            completeTurn();
        } else {
            currentMsg = '';
            currentAction.call();
        }
    } else if(actionName.includes('block')) {
        currentInfluence = actionName.split('-')[1];
        block();
    } else if(actionName === 'challenge') {
        if(blocked) {
            challenge(acting, counteracting, currentInfluence);
        } else {
            challenge(counteracting, acting, currentInfluence);
        }
        resetBtns();
        setTimeout(() => {
            if(targetWonChallenge && !showCard.classList.contains('flipCard')) {
                showCard.classList.toggle('flipCard');  // display showCard
                setTimeout(eliminateLosingPlayer, 2000);
            } else {
                eliminateLosingPlayer();
            }
        }, 1500);
    }
}

// find player whose influence needs to be eliminated as the result of a challenge. Then, eliminate influence from their hand
function eliminateLosingPlayer() {
    if(blocked === targetWonChallenge) {
        eliminateFromHand(acting);
    } else {
        eliminateFromHand(counteracting);
    }
}

// update acting to next active player
function updateActing() {
    acting = (acting > players.length - 2) ? 0 : acting + 1;
    if(!players[acting].active) updateActing(); // skip if player is not active
}

// update message, player mats, and game state variables for end of player's turn. calculate if game should end. If not, start next turn
function completeTurn() {
    updateMessage(currentMsg);
    updatePlayers();
    updateActing();
    hideAllCards();
    resetBtns();
    blocked = false;
    challenged = false;
    const activePlayers = players.reduce((a, b) => a + b.active, 0);
    if(activePlayers > 1) {
        setTimeout(startNextTurn, 4000);
    } else {
        updateMessage(`${players[acting].name} won!`);
    }
}

// start new game
function startGame() {
    players.splice(0, players.length);
    deck.splice(0, deck.length);
    acting = 0;
    blocked = false;
    challenged = false;
    resetBtns();

    // populate deck
    for(let i = 0; i < 3; i++) {
        deck.push(Object.create(Influence, {name:{value:'Ambassador'}}));
        deck.push(Object.create(Influence, {name:{value:'Assassin'}}));
        deck.push(Object.create(Influence, {name:{value:'Captain'}}));
        deck.push(Object.create(Influence, {name:{value:'Contessa'}}));
        deck.push(Object.create(Influence, {name:{value:'Duke'}}));
    }

    // add players to players array
    players.push(Object.create(Player, {name:{value:'player1'}, influences:{value:[]}}));
    players.push(Object.create(Player, {name:{value:'player2'}, influences:{value:[]}}));
    players.push(Object.create(Player, {name:{value:'player3'}, influences:{value:[]}}));
    players.push(Object.create(Player, {name:{value:'player4'}, influences:{value:[]}}));
    players.push(Object.create(Player, {name:{value:'player5'}, influences:{value:[]}}));
    players.push(Object.create(Player, {name:{value:'player6'}, influences:{value:[]}}));

    nPlayers = players.length;

    shuffle(deck);

    // deal 2 cards from deck to each player
    players.forEach((player) => {
        player.influences.push(deck.pop(), deck.pop());
    });

    playerNames.forEach((e) => e.classList.remove('eliminated'));
    playerCoins.forEach((e) => e.classList.remove('eliminated'));
    playerCards.forEach((cardArr) => cardArr.forEach((e) => e.classList.remove('flipCard')));
    playerCardFronts.forEach((cardArr) => cardArr.forEach((e) => {
        e.classList.remove('eliminated');
        e.classList.remove('inactive');
    }));
    exchangeCardDivs.forEach((c) => c.classList.add('hidden'));
    deactivateBottomBtn();
    activateBottomBtn();
    bottomBtn.textContent = 'New Game';
    bottomBtn.removeEventListener('click', executeExchange);
    bottomBtn.addEventListener('click', startGame);

    updatePlayers();
    startNextTurn();
}

startGame();