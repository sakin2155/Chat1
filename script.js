// ===========================
// Firebase SDK Imports
// ===========================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
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
// Cloudinary Configuration
// ===========================
const CLOUDINARY_CLOUD_NAME = ""; // Add your Cloudinary cloud name
const CLOUDINARY_UPLOAD_PRESET = ""; // Add your unsigned upload preset

// ===========================
// Global State
// ===========================
let currentUser = null;
let currentChatUser = null;
let currentChatId = null;
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let typingTimeout = null;
let longPressTimer = null;
let selectedMessageId = null;

// ===========================
// DOM Elements
// ===========================
const calculatorView = document.getElementById('calculator-view');
const chatApp = document.getElementById('chat-app');
const loginModal = document.getElementById('login-modal');
const display = document.getElementById('display');
const loginTrigger = document.getElementById('login-trigger');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');
const userList = document.getElementById('user-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageInput = document.getElementById('image-input');
const typingIndicator = document.getElementById('typing-indicator');
const chatWindowContainer = document.getElementById('chat-window-container');
const backToUsersBtn = document.getElementById('back-to-users');
const reactionPopup = document.getElementById('reaction-popup');
const messageOptions = document.getElementById('message-options');

// ===========================
// Calculator Logic
// ===========================
let currentValue = '0';
let previousValue = null;
let operation = null;
let shouldResetDisplay = false;

function updateDisplay(value) {
    display.textContent = value;
}

function handleNumber(num) {
    if (shouldResetDisplay) {
        currentValue = num;
        shouldResetDisplay = false;
    } else {
        currentValue = currentValue === '0' ? num : currentValue + num;
    }
    updateDisplay(currentValue);
}

function handleOperator(op) {
    if (operation && !shouldResetDisplay) {
        calculate();
    }
    previousValue = currentValue;
    operation = op;
    shouldResetDisplay = true;
}

function calculate() {
    if (!previousValue || !operation) return;

    const prev = parseFloat(previousValue);
    const current = parseFloat(currentValue);
    let result;

    switch (operation) {
        case 'add':
            result = prev + current;
            break;
        case 'subtract':
            result = prev - current;
            break;
        case 'multiply':
            result = prev * current;
            break;
        case 'divide':
            result = prev / current;
            break;
        default:
            return;
    }

    currentValue = result.toString();
    operation = null;
    previousValue = null;
    shouldResetDisplay = true;
    updateDisplay(currentValue);
}

function handleFunction(func) {
    switch (func) {
        case 'clear':
            currentValue = '0';
            previousValue = null;
            operation = null;
            shouldResetDisplay = false;
            updateDisplay(currentValue);
            break;
        case 'toggle-sign':
            currentValue = (parseFloat(currentValue) * -1).toString();
            updateDisplay(currentValue);
            break;
        case 'percent':
            currentValue = (parseFloat(currentValue) / 100).toString();
            updateDisplay(currentValue);
            break;
    }
}

// Calculator button event listeners
document.querySelectorAll('.calculator-buttons .btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('number')) {
            handleNumber(btn.dataset.value);
        } else if (btn.classList.contains('operator')) {
            const action = btn.dataset.action;
            if (action === 'equals') {
                handleEquals();
            } else {
                handleOperator(action);
            }
        } else if (btn.classList.contains('function')) {
            handleFunction(btn.dataset.action);
        }
    });
});

// ===========================
// Passcode Check & Unlock
// ===========================
async function handleEquals() {
    if (auth.currentUser) {
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (currentValue === userData.passcode) {
                    // Correct passcode - unlock chat
                    calculatorView.classList.add('hidden');
                    chatApp.classList.remove('hidden');
                    loadUsers();
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking passcode:', error);
        }
    }
    // If not logged in or wrong passcode, just calculate
    calculate();
}

// ===========================
// Authentication
// ===========================
loginTrigger.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    authError.textContent = '';
});

document.getElementById('signup-btn').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    authError.textContent = '';
});

document.getElementById('back-to-login-btn').addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authError.textContent = '';
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginModal.classList.add('hidden');
        authError.textContent = '';
    } catch (error) {
        authError.textContent = error.message;
    }
});

document.getElementById('create-account-btn').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;
    const passcode = document.getElementById('signup-passcode').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: name,
            passcode: passcode,
            photoURL: getInitials(name),
            status: 'online',
            createdAt: serverTimestamp()
        });

        loginModal.classList.add('hidden');
        authError.textContent = '';
    } catch (error) {
        authError.textContent = error.message;
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        if (currentUser) {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                status: 'offline'
            });
        }
        await signOut(auth);
        chatApp.classList.add('hidden');
        calculatorView.classList.remove('hidden');
        currentValue = '0';
        updateDisplay(currentValue);
    } catch (error) {
        console.error('Error logging out:', error);
    }
});

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Update user status to online
        await updateDoc(doc(db, 'users', user.uid), {
            status: 'online'
        });
    } else {
        currentUser = null;
    }
});

// ===========================
// Helper Functions
// ===========================
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===========================
// User List
// ===========================
async function loadUsers() {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    userList.innerHTML = '';

    usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData.uid !== currentUser.uid) {
            const userItem = createUserItem(userData);
            userList.appendChild(userItem);
        }
    });

    // Listen for user status changes
    onSnapshot(collection(db, 'users'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const userData = change.doc.data();
                if (userData.uid !== currentUser.uid) {
                    updateUserStatus(userData);
                }
            }
        });
    });
}

function createUserItem(userData) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = userData.uid;

    div.innerHTML = `
        <div class="user-avatar-container">
            <div class="user-avatar">${userData.photoURL}</div>
            ${userData.status === 'online' ? '<div class="online-indicator"></div>' : ''}
        </div>
        <div class="user-info">
            <div class="user-name">${userData.displayName}</div>
            <div class="user-status">${userData.status}</div>
        </div>
    `;

    div.addEventListener('click', () => {
        openChat(userData);
    });

    return div;
}

function updateUserStatus(userData) {
    const userItem = document.querySelector(`.user-item[data-user-id="${userData.uid}"]`);
    if (userItem) {
        const statusEl = userItem.querySelector('.user-status');
        const avatarContainer = userItem.querySelector('.user-avatar-container');

        statusEl.textContent = userData.status;

        const existingIndicator = avatarContainer.querySelector('.online-indicator');
        if (userData.status === 'online' && !existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'online-indicator';
            avatarContainer.appendChild(indicator);
        } else if (userData.status === 'offline' && existingIndicator) {
            existingIndicator.remove();
        }
    }

    // Update chat header if this is the current chat user
    if (currentChatUser && currentChatUser.uid === userData.uid) {
        document.getElementById('chat-user-status').textContent = userData.status;
    }
}

// ===========================
// Chat Window
// ===========================
async function openChat(userData) {
    currentChatUser = userData;
    currentChatId = getChatId(currentUser.uid, userData.uid);

    // Update UI
    document.getElementById('chat-user-name').textContent = userData.displayName;
    document.getElementById('chat-user-status').textContent = userData.status;
    document.getElementById('chat-user-avatar').textContent = userData.photoURL;

    // Mobile: show chat window
    chatWindowContainer.classList.add('active');

    // Highlight selected user
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.user-item[data-user-id="${userData.uid}"]`)?.classList.add('active');

    // Create chat document if it doesn't exist
    const chatRef = doc(db, 'chats', currentChatId);
    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) {
        await setDoc(chatRef, {
            participants: [currentUser.uid, userData.uid],
            createdAt: serverTimestamp()
        });
    }

    // Load messages
    loadMessages();

    // Listen for typing indicator
    listenForTyping();

    // Mark messages as seen
    markMessagesAsSeen();
}

backToUsersBtn.addEventListener('click', () => {
    chatWindowContainer.classList.remove('active');
});

// ===========================
// Messages
// ===========================
function loadMessages() {
    // Unsubscribe from previous chat
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    messagesContainer.innerHTML = '';

    const messagesRef = collection(db, 'chats', currentChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const messageData = { id: change.doc.id, ...change.doc.data() };
                appendMessage(messageData);
            } else if (change.type === 'modified') {
                updateMessage(change.doc.id, change.doc.data());
            } else if (change.type === 'removed') {
                removeMessage(change.doc.id);
            }
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mark new messages as seen
        markMessagesAsSeen();
    });
}

function appendMessage(messageData) {
    const div = document.createElement('div');
    div.className = `message ${messageData.senderId === currentUser.uid ? 'sent' : 'received'}`;
    div.dataset.messageId = messageData.id;

    let content = '';
    if (messageData.type === 'image') {
        content = `<img src="${messageData.imgUrl}" class="message-image" alt="Image">`;
    } else {
        content = `<span class="message-text">${escapeHtml(messageData.text)}</span>`;
    }

    const editedLabel = messageData.isEdited ? '<span class="message-edited">(edited)</span>' : '';
    const seenLabel = messageData.seen && messageData.senderId === currentUser.uid ? '<div class="message-seen">Seen</div>' : '';

    let reactionsHtml = '';
    if (messageData.reactions && messageData.reactions.length > 0) {
        const reactionCounts = {};
        messageData.reactions.forEach(r => {
            reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        });
        reactionsHtml = '<div class="message-reactions">';
        for (const [emoji, count] of Object.entries(reactionCounts)) {
            reactionsHtml += `<span class="reaction-badge">${emoji} ${count}</span>`;
        }
        reactionsHtml += '</div>';
    }

    const optionsTrigger = messageData.senderId === currentUser.uid
        ? '<button class="message-options-trigger">⋯</button>'
        : '';

    div.innerHTML = `
        <div class="message-bubble">
            ${optionsTrigger}
            ${content}
            ${editedLabel}
            <span class="message-time">${formatTime(messageData.timestamp)}</span>
            ${reactionsHtml}
        </div>
        ${seenLabel}
    `;

    // Add long press / double click for reactions
    const bubble = div.querySelector('.message-bubble');

    // Desktop: double click
    bubble.addEventListener('dblclick', (e) => {
        showReactionPopup(e, messageData.id);
    });

    // Mobile: long press
    bubble.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            showReactionPopup(e, messageData.id);
        }, 500);
    });

    bubble.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });

    // Options menu
    const optionsBtn = div.querySelector('.message-options-trigger');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMessageOptions(e, messageData.id);
        });
    }

    messagesContainer.appendChild(div);
}

function updateMessage(messageId, messageData) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageEl) {
        const textEl = messageEl.querySelector('.message-text');
        if (textEl) {
            textEl.textContent = messageData.text;
        }

        // Update edited label
        const bubble = messageEl.querySelector('.message-bubble');
        if (messageData.isEdited && !bubble.querySelector('.message-edited')) {
            const editedSpan = document.createElement('span');
            editedSpan.className = 'message-edited';
            editedSpan.textContent = '(edited)';
            bubble.insertBefore(editedSpan, bubble.querySelector('.message-time'));
        }

        // Update reactions
        const existingReactions = bubble.querySelector('.message-reactions');
        if (existingReactions) {
            existingReactions.remove();
        }

        if (messageData.reactions && messageData.reactions.length > 0) {
            const reactionCounts = {};
            messageData.reactions.forEach(r => {
                reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
            });
            let reactionsHtml = '<div class="message-reactions">';
            for (const [emoji, count] of Object.entries(reactionCounts)) {
                reactionsHtml += `<span class="reaction-badge">${emoji} ${count}</span>`;
            }
            reactionsHtml += '</div>';
            bubble.insertAdjacentHTML('beforeend', reactionsHtml);
        }

        // Update seen status
        if (messageData.seen && messageData.senderId === currentUser.uid) {
            let seenEl = messageEl.querySelector('.message-seen');
            if (!seenEl) {
                seenEl = document.createElement('div');
                seenEl.className = 'message-seen';
                seenEl.textContent = 'Seen';
                messageEl.appendChild(seenEl);
            }
        }
    }
}

function removeMessage(messageId) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageEl) {
        messageEl.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================
// Send Message
// ===========================
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;

    try {
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        await addDoc(messagesRef, {
            text: text,
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
            type: 'text',
            seen: false,
            isEdited: false,
            reactions: []
        });

        messageInput.value = '';
        updateTypingStatus(false);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// ===========================
// Image Upload (Cloudinary)
// ===========================
imageUploadBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.secure_url) {
            const messagesRef = collection(db, 'chats', currentChatId, 'messages');
            await addDoc(messagesRef, {
                imgUrl: data.secure_url,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                type: 'image',
                seen: false,
                reactions: []
            });
        }

        imageInput.value = '';
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please check your Cloudinary configuration.');
    }
});

// ===========================
// Typing Indicator
// ===========================
messageInput.addEventListener('input', () => {
    updateTypingStatus(true);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        updateTypingStatus(false);
    }, 2000);
});

async function updateTypingStatus(isTyping) {
    if (!currentChatId) return;

    try {
        const typingRef = doc(db, 'chats', currentChatId, 'typing', currentUser.uid);
        if (isTyping) {
            await setDoc(typingRef, { typing: true, timestamp: serverTimestamp() });
        } else {
            await deleteDoc(typingRef);
        }
    } catch (error) {
        console.error('Error updating typing status:', error);
    }
}

function listenForTyping() {
    if (unsubscribeTyping) {
        unsubscribeTyping();
    }

    const typingRef = doc(db, 'chats', currentChatId, 'typing', currentChatUser.uid);
    unsubscribeTyping = onSnapshot(typingRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().typing) {
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    });
}

// ===========================
// Mark Messages as Seen
// ===========================
async function markMessagesAsSeen() {
    if (!currentChatId) return;

    try {
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        const q = query(messagesRef, where('senderId', '==', currentChatUser.uid), where('seen', '==', false));
        const snapshot = await getDocs(q);

        snapshot.forEach(async (docSnap) => {
            await updateDoc(docSnap.ref, { seen: true });
        });
    } catch (error) {
        console.error('Error marking messages as seen:', error);
    }
}

// ===========================
// Reactions
// ===========================
function showReactionPopup(event, messageId) {
    selectedMessageId = messageId;
    reactionPopup.classList.remove('hidden');

    const x = event.clientX || event.touches[0].clientX;
    const y = event.clientY || event.touches[0].clientY;

    reactionPopup.style.left = `${x - 150}px`;
    reactionPopup.style.top = `${y - 60}px`;
}

document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const emoji = btn.dataset.emoji;
        if (!selectedMessageId || !currentChatId) return;

        try {
            const messageRef = doc(db, 'chats', currentChatId, 'messages', selectedMessageId);
            const messageDoc = await getDoc(messageRef);

            if (messageDoc.exists()) {
                const reactions = messageDoc.data().reactions || [];
                reactions.push({ emoji, userId: currentUser.uid });
                await updateDoc(messageRef, { reactions });
            }

            reactionPopup.classList.add('hidden');
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    });
});

// Hide reaction popup when clicking outside
document.addEventListener('click', (e) => {
    if (!reactionPopup.contains(e.target) && !e.target.closest('.message-bubble')) {
        reactionPopup.classList.add('hidden');
    }
    if (!messageOptions.contains(e.target) && !e.target.closest('.message-options-trigger')) {
        messageOptions.classList.add('hidden');
    }
});

// ===========================
// Message Options (Edit/Delete)
// ===========================
function showMessageOptions(event, messageId) {
    selectedMessageId = messageId;
    messageOptions.classList.remove('hidden');

    const x = event.clientX;
    const y = event.clientY;

    messageOptions.style.left = `${x}px`;
    messageOptions.style.top = `${y}px`;
}

document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        if (!selectedMessageId || !currentChatId) return;

        const messageRef = doc(db, 'chats', currentChatId, 'messages', selectedMessageId);

        try {
            if (action === 'delete') {
                await deleteDoc(messageRef);
            } else if (action === 'edit') {
                const newText = prompt('Edit message:');
                if (newText && newText.trim()) {
                    await updateDoc(messageRef, {
                        text: newText.trim(),
                        isEdited: true
                    });
                }
            }

            messageOptions.classList.add('hidden');
        } catch (error) {
            console.error('Error performing message action:', error);
        }
    });
});
