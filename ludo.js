// ===========================
// Firebase SDK Imports
// ===========================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// ===========================
// Firebase Configuration
// ===========================
const firebaseConfig = {
    apiKey: "AIzaSyCjU48-MYfwQLDPc7C04lcyROT6s5cLH-8",
    authDomain: "chat-f5b70.firebaseapp.com",
    projectId: "chat-f5b70",
    storageBucket: "chat-f5b70.firebasestorage.app",
    messagingSenderId: "158106000000",
    appId: "1:158106000000:web:6cd2c27cdd676d306da465",
    measurementId: "G-6H096XKK6S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===========================
// Global State
// ===========================
let currentUser = null;
let currentUserData = null;
let roomId = null;
let gameMode = null; // 'host' or 'join'
let currentPlayer = 'red'; // 'red' or 'yellow'
let opponentData = null;

// Game pieces: [{id: 'r1', pos: -1}, ...]
let redPieces = [
    { id: 'r1', pos: -1 },
    { id: 'r2', pos: -1 },
    { id: 'r3', pos: -1 },
    { id: 'r4', pos: -1 }
];

let yellowPieces = [
    { id: 'y1', pos: -1 },
    { id: 'y2', pos: -1 },
    { id: 'y3', pos: -1 },
    { id: 'y4', pos: -1 }
];

let diceResult = 0;
let gameActive = false;
let gameOver = false;
let winner = null;

// ===========================
// DOM Elements
// ===========================
const globalLoading = document.getElementById('global-loading');
const ludoContainer = document.getElementById('ludo-container');
const loginModal = document.getElementById('login-modal');
const backToChatBtn = document.getElementById('back-to-chat-btn');
const backToChatFromModalBtn = document.getElementById('back-to-chat-from-modal-btn');
const goToLoginBtn = document.getElementById('go-to-login-btn');
const dice = document.getElementById('dice');
const rollDiceBtn = document.getElementById('roll-dice-btn');
const turnDisplay = document.getElementById('turn-display');
const diceResult_el = document.getElementById('dice-result');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');
const redAvatar = document.getElementById('red-avatar');
const redName = document.getElementById('red-name');
const redTurn = document.getElementById('red-turn');
const yellowAvatar = document.getElementById('yellow-avatar');
const yellowName = document.getElementById('yellow-name');
const yellowTurn = document.getElementById('yellow-turn');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const pathGrid = document.getElementById('path-grid');
const redHome = document.getElementById('red-home');
const yellowHome = document.getElementById('yellow-home');

// ===========================
// Ludo Path System
// ===========================
// 52 cells in main path (0-51)
// Red starts at 0, Yellow starts at 26
const PATH_LENGTH = 52;
const RED_START = 0;
const YELLOW_START = 26;
const HOME_LENGTH = 6;

// Path coordinates (simplified grid positions)
const pathMap = generatePathCoordinates();

function generatePathCoordinates() {
    const path = [];
    // This is a simplified path - in real Ludo, it follows the board edges
    for (let i = 0; i < PATH_LENGTH; i++) {
        path.push({ x: i % 13, y: Math.floor(i / 13) });
    }
    return path;
}

// ===========================
// Utility Functions
// ===========================
function showLoading(text = 'Loading...') {
    if (globalLoading) {
        const loadingText = globalLoading.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
        globalLoading.classList.remove('hidden');
    }
}

function hideLoading() {
    if (globalLoading) {
        globalLoading.classList.add('hidden');
    }
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1);
}

function applyAvatarToElement(element, userData) {
    if (!element || !userData) return;
    
    const initials = getInitials(userData.displayName || userData.email || '?');
    element.textContent = initials;
    
    if (userData.photoURL && userData.photoURL.startsWith('http')) {
        element.style.backgroundImage = `url(${userData.photoURL})`;
        element.classList.add('has-image');
    } else {
        element.style.backgroundImage = '';
        element.classList.remove('has-image');
    }
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        roomId: params.get('roomId'),
        mode: params.get('mode')
    };
}

// ===========================
// Dice System
// ===========================
function rollDice() {
    if (!gameActive || currentPlayer !== (gameMode === 'host' ? 'red' : 'yellow')) {
        return;
    }

    rollDiceBtn.disabled = true;
    dice.classList.add('rolling');

    setTimeout(() => {
        diceResult = Math.floor(Math.random() * 6) + 1;
        dice.textContent = diceResult;
        dice.classList.remove('rolling');
        diceResult_el.textContent = `Rolled: ${diceResult}`;

        // Sync to opponent
        saveDiceRoll(diceResult);
        
        rollDiceBtn.disabled = false;
    }, 600);
}

async function saveDiceRoll(result) {
    try {
        await setDoc(doc(db, 'games', roomId), {
            lastDiceRoll: result,
            currentPlayer: currentPlayer,
            updatedAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving dice roll:', error);
    }
}

// ===========================
// Piece Movement
// ===========================
function canMovePiece(piece, diceValue) {
    // Can move if piece is in base and rolled 6
    if (piece.pos === -1 && diceValue === 6) return true;
    // Can move if piece is on board
    if (piece.pos >= 0 && piece.pos < PATH_LENGTH + HOME_LENGTH) return true;
    return false;
}

function movePiece(piece, diceValue) {
    if (!canMovePiece(piece, diceValue)) return false;

    let newPos = piece.pos;

    // Move from base to start
    if (piece.pos === -1 && diceValue === 6) {
        newPos = currentPlayer === 'red' ? RED_START : YELLOW_START;
    } else if (piece.pos >= 0) {
        newPos = piece.pos + diceValue;
    }

    // Check if reached home
    if (newPos >= PATH_LENGTH) {
        newPos = PATH_LENGTH + (newPos - PATH_LENGTH); // Enter home straight
    }

    // Check win condition
    if (newPos >= PATH_LENGTH + HOME_LENGTH) {
        newPos = PATH_LENGTH + HOME_LENGTH - 1; // Cap at home
    }

    piece.pos = newPos;
    return true;
}

function checkCapture(piece) {
    if (piece.pos < 0 || piece.pos >= PATH_LENGTH) return; // Not on main path

    const opponentPieces = currentPlayer === 'red' ? yellowPieces : redPieces;
    
    for (let opp of opponentPieces) {
        if (opp.pos === piece.pos && !isSafeZone(piece.pos)) {
            opp.pos = -1; // Send back to base
        }
    }
}

function isSafeZone(pos) {
    // Safe zones at positions 0, 8, 13, 21, 26, 34, 39, 47
    const safeZones = [0, 8, 13, 21, 26, 34, 39, 47];
    return safeZones.includes(pos);
}

function checkWinCondition() {
    const pieces = currentPlayer === 'red' ? redPieces : yellowPieces;
    return pieces.every(p => p.pos >= PATH_LENGTH + HOME_LENGTH - 1);
}

// ===========================
// UI Updates
// ===========================
function updatePlayerInfo() {
    if (gameMode === 'host') {
        applyAvatarToElement(redAvatar, currentUserData);
        redName.textContent = currentUserData?.displayName || 'You';
        
        if (opponentData) {
            applyAvatarToElement(yellowAvatar, opponentData);
            yellowName.textContent = opponentData.displayName || 'Opponent';
        }
    } else {
        applyAvatarToElement(yellowAvatar, currentUserData);
        yellowName.textContent = currentUserData?.displayName || 'You';
        
        if (opponentData) {
            applyAvatarToElement(redAvatar, opponentData);
            redName.textContent = opponentData.displayName || 'Opponent';
        }
    }
}

function updateTurnDisplay() {
    const playerName = currentPlayer === 'red' ? 'Red' : 'Yellow';
    turnDisplay.textContent = `${playerName}'s Turn`;
    
    redTurn.textContent = currentPlayer === 'red' ? 'Your Turn' : 'Waiting...';
    yellowTurn.textContent = currentPlayer === 'yellow' ? 'Your Turn' : 'Waiting...';
}

function renderBoard() {
    // Clear and render path grid
    pathGrid.innerHTML = '';
    for (let i = 0; i < PATH_LENGTH; i++) {
        const cell = document.createElement('div');
        cell.className = 'path-cell';
        if (isSafeZone(i)) cell.classList.add('safe-zone');
        if (i < RED_START + 13) cell.classList.add('red-path');
        if (i >= YELLOW_START && i < YELLOW_START + 13) cell.classList.add('yellow-path');
        pathGrid.appendChild(cell);
    }

    // Render home straights
    renderHomeStraight(redHome, 'red');
    renderHomeStraight(yellowHome, 'yellow');

    // Render pieces
    renderPieces();
}

function renderHomeStraight(container, color) {
    container.innerHTML = '';
    for (let i = 0; i < HOME_LENGTH; i++) {
        const cell = document.createElement('div');
        cell.className = 'home-cell';
        container.appendChild(cell);
    }
}

function renderPieces() {
    // Render red pieces
    redPieces.forEach(piece => {
        const element = document.querySelector(`[data-token="${piece.id}"]`);
        if (element) {
            if (piece.pos === -1) {
                element.classList.remove('on-board');
            } else {
                element.classList.add('on-board');
                // Position on board (simplified)
                const pos = piece.pos % PATH_LENGTH;
                const x = (pos % 13) * 30;
                const y = Math.floor(pos / 13) * 30;
                element.style.left = x + 'px';
                element.style.top = y + 'px';
            }
        }
    });

    // Render yellow pieces
    yellowPieces.forEach(piece => {
        const element = document.querySelector(`[data-token="${piece.id}"]`);
        if (element) {
            if (piece.pos === -1) {
                element.classList.remove('on-board');
            } else {
                element.classList.add('on-board');
                const pos = piece.pos % PATH_LENGTH;
                const x = (pos % 13) * 30;
                const y = Math.floor(pos / 13) * 30;
                element.style.left = x + 'px';
                element.style.top = y + 'px';
            }
        }
    });
}

// ===========================
// Chat System
// ===========================
const displayedMessages = new Set();

async function sendChatMessage(text) {
    if (!text.trim()) return;

    try {
        await addDoc(collection(db, 'games', roomId, 'chat'), {
            playerId: currentUser.uid,
            playerName: currentUserData?.displayName || 'Player',
            text: text,
            timestamp: new Date(),
            isSystem: false
        });
    } catch (error) {
        console.error('Error sending chat message:', error);
    }
}

function displayChatMessage(messageData, isOwn = false) {
    const messageId = messageData.id;
    if (displayedMessages.has(messageId)) return;
    displayedMessages.add(messageId);

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'opponent'}`;
    messageDiv.textContent = messageData.text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function listenForChatMessages() {
    const chatQuery = query(
        collection(db, 'games', roomId, 'chat'),
        orderBy('timestamp', 'asc')
    );

    onSnapshot(chatQuery, (querySnap) => {
        querySnap.docs.forEach((doc) => {
            const messageData = { id: doc.id, ...doc.data() };
            const isOwn = messageData.playerId === currentUser.uid;
            displayChatMessage(messageData, isOwn);
        });
    });
}

// ===========================
// Game Initialization
// ===========================
async function initializeGame() {
    const params = getUrlParams();
    roomId = params.roomId;
    gameMode = params.mode;

    console.log('Initializing Ludo game:', roomId, gameMode);

    if (!roomId || !gameMode) {
        console.error('Invalid game parameters');
        return;
    }

    if (gameMode === 'host') {
        currentPlayer = 'red';
        try {
            const hostData = {
                uid: currentUser.uid,
                displayName: currentUserData?.displayName || 'Host',
                photoURL: currentUserData?.photoURL || '',
                joinedAt: new Date()
            };
            await setDoc(doc(db, 'games', roomId, 'players', 'host'), hostData);
        } catch (error) {
            console.error('Error registering host:', error);
        }
        listenForGuestJoin();
    } else {
        currentPlayer = 'yellow';
        try {
            const guestData = {
                uid: currentUser.uid,
                displayName: currentUserData?.displayName || 'Guest',
                photoURL: currentUserData?.photoURL || '',
                joinedAt: new Date()
            };
            await setDoc(doc(db, 'games', roomId, 'players', 'guest'), guestData);
        } catch (error) {
            console.error('Error registering guest:', error);
        }
        listenForHostPresence();
    }

    updatePlayerInfo();
    renderBoard();
    listenForChatMessages();
    listenForGameStateChanges();
}

function listenForGuestJoin() {
    onSnapshot(doc(db, 'games', roomId, 'players', 'guest'), (docSnap) => {
        if (docSnap.exists()) {
            const guestData = docSnap.data();
            opponentData = {
                uid: guestData.uid,
                displayName: guestData.displayName,
                photoURL: guestData.photoURL
            };
            updatePlayerInfo();
            startGame();
        }
    });
}

function listenForHostPresence() {
    onSnapshot(doc(db, 'games', roomId, 'players', 'host'), (docSnap) => {
        if (docSnap.exists()) {
            const hostData = docSnap.data();
            opponentData = {
                uid: hostData.uid,
                displayName: hostData.displayName,
                photoURL: hostData.photoURL
            };
            updatePlayerInfo();
            startGame();
        }
    });
}

function listenForGameStateChanges() {
    onSnapshot(doc(db, 'games', roomId), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.currentPlayer && data.currentPlayer !== currentPlayer) {
                currentPlayer = data.currentPlayer;
                updateTurnDisplay();
            }
            if (data.lastDiceRoll) {
                diceResult = data.lastDiceRoll;
                dice.textContent = diceResult;
            }
        }
    });
}

function startGame() {
    gameActive = true;
    gameOver = false;
    updateTurnDisplay();
    rollDiceBtn.disabled = false;
}

async function resetGame() {
    redPieces = [
        { id: 'r1', pos: -1 },
        { id: 'r2', pos: -1 },
        { id: 'r3', pos: -1 },
        { id: 'r4', pos: -1 }
    ];

    yellowPieces = [
        { id: 'y1', pos: -1 },
        { id: 'y2', pos: -1 },
        { id: 'y3', pos: -1 },
        { id: 'y4', pos: -1 }
    ];

    diceResult = 0;
    gameActive = true;
    gameOver = false;
    winner = null;
    currentPlayer = 'red';

    renderBoard();
    updateTurnDisplay();

    try {
        await setDoc(doc(db, 'games', roomId), {
            gameState: 'active',
            currentPlayer: 'red',
            redPieces: redPieces,
            yellowPieces: yellowPieces,
            updatedAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error resetting game:', error);
    }
}

// ===========================
// Event Listeners
// ===========================
rollDiceBtn.addEventListener('click', rollDice);

playAgainBtn.addEventListener('click', async () => {
    gameOverModal.classList.add('hidden');
    await resetGame();
});

backToChatBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

backToChatFromModalBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

goToLoginBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

sendChatBtn.addEventListener('click', async () => {
    const text = chatInput.value;
    if (text.trim()) {
        await sendChatMessage(text);
        chatInput.value = '';
        chatInput.focus();
    }
});

chatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = chatInput.value;
        if (text.trim()) {
            await sendChatMessage(text);
            chatInput.value = '';
        }
    }
});

// ===========================
// Authentication
// ===========================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }

        ludoContainer.classList.remove('hidden');
        loginModal.classList.add('hidden');
        hideLoading();

        await initializeGame();
    } else {
        ludoContainer.classList.add('hidden');
        loginModal.classList.remove('hidden');
        hideLoading();
    }
});
