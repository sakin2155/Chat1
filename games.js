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
    getDoc
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

// Initialize Firebase
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
let playerSymbol = null; // 'X' or 'O'
let opponentSymbol = null;
let opponentData = null;
let gameState = ['', '', '', '', '', '', '', '', '']; // 3x3 board
let currentTurn = 'X'; // X always goes first
let gameActive = false;
let gameOver = false;
let socket = null;

// ===========================
// DOM Elements
// ===========================
const globalLoading = document.getElementById('global-loading');
const gameContainer = document.getElementById('game-container');
const loginModal = document.getElementById('login-modal');
const backToChatBtn = document.getElementById('back-to-chat-btn');
const backToChatFromModalBtn = document.getElementById('back-to-chat-from-modal-btn');
const goToLoginBtn = document.getElementById('go-to-login-btn');
const waitingScreen = document.getElementById('waiting-screen');
const gameBoard = document.getElementById('game-board');
const boardCells = document.querySelectorAll('.board-cell');
const turnIndicator = document.getElementById('turn-indicator');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');
const playerXAvatar = document.getElementById('player-x-avatar');
const playerXName = document.getElementById('player-x-name');
const playerXStatus = document.getElementById('player-x-status');
const playerOAvatar = document.getElementById('player-o-avatar');
const playerOName = document.getElementById('player-o-name');
const playerOStatus = document.getElementById('player-o-status');

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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

function generateRoomId() {
    return 'game_' + Math.random().toString(36).substr(2, 9);
}

// ===========================
// URL Parameter Parsing
// ===========================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        roomId: params.get('roomID'),
        mode: params.get('mode')
    };
}

// ===========================
// WebSocket Connection
// ===========================
function initializeSocket() {
    // For production, use your actual server URL
    // For now, we'll use a simple approach with Firestore real-time listeners
    console.log('Socket initialization ready for real-time sync');
}

// ===========================
// Game Logic
// ===========================
const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

function checkWinner(board) {
    for (let combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function isBoardFull(board) {
    return board.every(cell => cell !== '');
}

function makeMove(index) {
    if (!gameActive || gameOver) return false;
    if (gameState[index] !== '') return false;
    
    // Check if it's the current player's turn
    if (playerSymbol !== currentTurn) {
        console.log('Not your turn!');
        return false;
    }

    // Make the move
    gameState[index] = playerSymbol;
    updateBoardUI();

    // Check for winner
    const winner = checkWinner(gameState);
    if (winner) {
        gameOver = true;
        gameActive = false;
        showGameOverModal(winner);
        return true;
    }

    // Check for draw
    if (isBoardFull(gameState)) {
        gameOver = true;
        gameActive = false;
        showGameOverModal('draw');
        return true;
    }

    // Switch turn
    currentTurn = currentTurn === 'X' ? 'O' : 'X';
    updateTurnIndicator();

    // Emit move to opponent via socket
    if (socket) {
        socket.emit('make_move', {
            roomId: roomId,
            index: index,
            symbol: playerSymbol,
            gameState: gameState,
            currentTurn: currentTurn
        });
    }

    return true;
}

function updateBoardUI() {
    boardCells.forEach((cell, index) => {
        cell.textContent = gameState[index];
        cell.classList.remove('x', 'o');
        if (gameState[index] === 'X') {
            cell.classList.add('x');
        } else if (gameState[index] === 'O') {
            cell.classList.add('o');
        }
    });
}

function updateTurnIndicator() {
    if (playerSymbol === currentTurn) {
        turnIndicator.textContent = 'Your Turn';
        turnIndicator.style.color = '#667eea';
        boardCells.forEach(cell => {
            if (cell.textContent === '') {
                cell.style.cursor = 'pointer';
            }
        });
    } else {
        turnIndicator.textContent = `${opponentData?.displayName || 'Opponent'}'s Turn`;
        turnIndicator.style.color = '#999';
        boardCells.forEach(cell => {
            cell.style.cursor = 'not-allowed';
        });
    }
}

function resetBoard() {
    gameState = ['', '', '', '', '', '', '', '', ''];
    currentTurn = 'X';
    gameActive = true;
    gameOver = false;
    updateBoardUI();
    updateTurnIndicator();
}

function showGameOverModal(result) {
    if (result === 'draw') {
        gameOverMessage.textContent = '🤝 It\'s a Draw!';
    } else if (result === playerSymbol) {
        gameOverMessage.textContent = '🏆 You Won!';
    } else {
        gameOverMessage.textContent = `😢 ${opponentData?.displayName || 'Opponent'} Won!`;
    }
    gameOverModal.classList.remove('hidden');
}

function closeGameOverModal() {
    gameOverModal.classList.add('hidden');
}

// ===========================
// UI Updates
// ===========================
function updatePlayerInfo() {
    // Update current player info
    if (playerSymbol === 'X') {
        applyAvatarToElement(playerXAvatar, currentUserData);
        playerXName.textContent = currentUserData?.displayName || 'You';
        playerXStatus.textContent = 'Your Turn';
        
        if (opponentData) {
            applyAvatarToElement(playerOAvatar, opponentData);
            playerOName.textContent = opponentData.displayName || 'Opponent';
            playerOStatus.textContent = 'Waiting...';
        }
    } else {
        applyAvatarToElement(playerOAvatar, currentUserData);
        playerOName.textContent = currentUserData?.displayName || 'You';
        playerOStatus.textContent = 'Your Turn';
        
        if (opponentData) {
            applyAvatarToElement(playerXAvatar, opponentData);
            playerXName.textContent = opponentData.displayName || 'Opponent';
            playerXStatus.textContent = 'Waiting...';
        }
    }
}

function showWaitingScreen() {
    waitingScreen.classList.remove('hidden');
    gameBoard.classList.add('hidden');
}

function hideWaitingScreen() {
    waitingScreen.classList.add('hidden');
    gameBoard.classList.remove('hidden');
    gameActive = true;
    updateTurnIndicator();
}

// ===========================
// Game Initialization
// ===========================
async function initializeGame() {
    const params = getUrlParams();
    roomId = params.roomId;
    gameMode = params.mode;

    if (!roomId || !gameMode) {
        console.error('Invalid game parameters');
        return;
    }

    if (gameMode === 'host') {
        playerSymbol = 'X';
        opponentSymbol = 'O';
        showWaitingScreen();
    } else if (gameMode === 'join') {
        playerSymbol = 'O';
        opponentSymbol = 'X';
        showWaitingScreen();
    }

    updatePlayerInfo();
    initializeSocket();
}

// ===========================
// Event Listeners
// ===========================
boardCells.forEach(cell => {
    cell.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        makeMove(index);
    });
});

playAgainBtn.addEventListener('click', () => {
    closeGameOverModal();
    resetBoard();
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

// ===========================
// Authentication
// ===========================
onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            currentUser = user;
            
            // Fetch user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
            }

            // Hide login modal and show game container
            loginModal.classList.add('hidden');
            gameContainer.classList.remove('hidden');

            // Initialize the game
            await initializeGame();
        } else {
            // Show login modal
            loginModal.classList.remove('hidden');
            gameContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Auth error:', error);
    } finally {
        hideLoading();
    }
});

// ===========================
// Simulate Opponent Join (for testing)
// ===========================
// In a real implementation, this would be handled by WebSocket/Firestore listeners
// For now, we'll add a test button to simulate opponent joining
window.simulateOpponentJoin = async function() {
    if (gameMode === 'host') {
        // Simulate opponent data
        opponentData = {
            displayName: 'Test Opponent',
            email: 'opponent@test.com',
            photoURL: ''
        };
        updatePlayerInfo();
        hideWaitingScreen();
    }
};

// Auto-join simulation for testing (remove in production)
if (gameMode === 'join') {
    setTimeout(() => {
        opponentData = {
            displayName: 'Test Host',
            email: 'host@test.com',
            photoURL: ''
        };
        updatePlayerInfo();
        hideWaitingScreen();
    }, 2000);
}
