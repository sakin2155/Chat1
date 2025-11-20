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
let replyingToMessage = null;
let editingMessageId = null;
let editingOriginalText = null;

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
const replyPreview = document.getElementById('reply-preview');
const cancelReplyBtn = document.getElementById('cancel-reply');

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

    // Reply context
    let replyHtml = '';
    if (messageData.replyTo) {
        const replyName = messageData.replyTo.senderName || 'Unknown';
        const replyText = messageData.replyTo.text || '[Image]';
        replyHtml = `
            <div class="message-reply-context" data-reply-to="${messageData.replyTo.messageId}">
                <div class="reply-context-name">${escapeHtml(replyName)}</div>
                <div class="reply-context-text">${escapeHtml(replyText)}</div>
            </div>
        `;
    }

    const editedLabel = messageData.isEdited ? '<span class="message-edited">(edited)</span>' : '';
    const metaHtml = editedLabel ? `<span class="message-meta">${editedLabel}</span>` : '';

    // Show status for sent messages (only latest will stay visible)
    const statusLabel = messageData.senderId === currentUser.uid
        ? `<div class="message-status">${getStatusText(messageData)}</div>`
        : '';

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
            ${replyHtml}
            ${content}
            ${metaHtml}
            ${reactionsHtml}
            ${statusLabel}
        </div>
    `;

    // Add long press / double click for reactions (only on received messages)
    const bubble = div.querySelector('.message-bubble');
    const isReceivedMessage = messageData.senderId !== currentUser.uid;

    if (isReceivedMessage) {
        // Desktop: double click
        bubble.addEventListener('dblclick', (e) => {
            showReactionPopup(e, messageData.id);
        });

        // Mobile: long press for reactions
        bubble.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                showReactionPopup(e, messageData.id);
            }, 500);
        });

        bubble.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
    } else {
        // For own messages: long press shows edit/delete menu
        bubble.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                showMessageOptions(e.touches[0], messageData.id);
            }, 500);
        });

        bubble.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });

        bubble.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });
    }

    // Swipe to reply functionality
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwiping = false;

    div.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isSwiping = false;
        div.style.transition = 'none';
    });

    div.addEventListener('touchmove', (e) => {
        if (!touchStartX) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // Only allow horizontal swipe if more horizontal than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isSwiping = true;

            // For sent messages (on right), swipe left
            // For received messages (on left), swipe right
            const isSent = messageData.senderId === currentUser.uid;
            const maxSwipe = 80;

            let translateX = 0;
            if (isSent && deltaX < 0) {
                // Swipe left for sent messages
                translateX = Math.max(deltaX, -maxSwipe);
            } else if (!isSent && deltaX > 0) {
                // Swipe right for received messages
                translateX = Math.min(deltaX, maxSwipe);
            }

            if (translateX !== 0) {
                e.preventDefault();
                div.classList.add('swiping');
                div.style.transform = `translateX(${translateX}px)`;
                div.style.opacity = 1 - Math.abs(translateX) / maxSwipe * 0.3;
            }
        }
    });

    div.addEventListener('touchend', (e) => {
        if (!touchStartX || !isSwiping) {
            touchStartX = 0;
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        const swipeThreshold = 50;

        const isSent = messageData.senderId === currentUser.uid;
        let shouldReply = false;

        if (isSent && deltaX < -swipeThreshold) {
            shouldReply = true;
        } else if (!isSent && deltaX > swipeThreshold) {
            shouldReply = true;
        }

        if (shouldReply) {
            // Trigger reply
            triggerSwipeReply(messageData);
        }

        // Reset position
        div.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        div.style.transform = 'translateX(0)';
        div.style.opacity = '1';
        div.classList.remove('swiping');

        touchStartX = 0;
        isSwiping = false;
    });

    // Options menu
    const optionsBtn = div.querySelector('.message-options-trigger');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMessageOptions(e, messageData.id);
        });
    }

    // Click reply context to scroll to original
    const replyCtx = div.querySelector('.message-reply-context');
    if (replyCtx) {
        replyCtx.addEventListener('click', () => {
            const toId = replyCtx.getAttribute('data-reply-to');
            const target = document.querySelector(`.message[data-message-id="${toId}"]`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.classList.add('highlight-replied');
                setTimeout(() => target.classList.remove('highlight-replied'), 1200);
            }
        });
    }

    messagesContainer.appendChild(div);
    updateMessageStatusVisibility();
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

        // Update status (Sent/Seen)
        if (messageData.senderId === currentUser.uid) {
            const bubble = messageEl.querySelector('.message-bubble');
            let statusEl = bubble.querySelector('.message-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.className = 'message-status';
                bubble.appendChild(statusEl);
            }
            statusEl.textContent = getStatusText(messageData);
        }

        updateMessageStatusVisibility();
    }
}

function removeMessage(messageId) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageEl) {
        messageEl.remove();
    }
    updateMessageStatusVisibility();
}

function updateMessageStatusVisibility() {
    const sentMessages = Array.from(messagesContainer.querySelectorAll('.message.sent'));
    sentMessages.forEach((messageEl, index) => {
        const statusEl = messageEl.querySelector('.message-status');
        if (!statusEl) return;
        if (index === sentMessages.length - 1) {
            statusEl.classList.add('visible');
        } else {
            statusEl.classList.remove('visible');
        }
    });
}

function getStatusText(messageData) {
    const baseStatus = messageData.seen ? 'Seen' : 'Sent';
    const timeLabel = formatTime(messageData.timestamp);
    return timeLabel ? `${baseStatus} • ${timeLabel}` : baseStatus;
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
        // Check if we're editing a message
        if (editingMessageId) {
            // Update existing message
            const messageRef = doc(db, 'chats', currentChatId, 'messages', editingMessageId);
            await updateDoc(messageRef, {
                text: text,
                isEdited: true
            });

            messageInput.value = '';
            cancelEdit();
            updateTypingStatus(false);
            return;
        }

        // Create new message
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        const messageData = {
            text: text,
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
            type: 'text',
            seen: false,
            isEdited: false,
            reactions: []
        };

        // Add reply data if replying
        if (replyingToMessage) {
            messageData.replyTo = {
                messageId: replyingToMessage.id,
                senderId: replyingToMessage.senderId,
                senderName: replyingToMessage.senderName,
                text: replyingToMessage.text || '[Image]'
            };
        }

        await addDoc(messagesRef, messageData);

        messageInput.value = '';
        cancelReply();
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
// Reply Functions
// ===========================
function setReplyTo(messageData) {
    replyingToMessage = messageData;
    replyPreview.classList.remove('hidden');

    const replyToName = document.querySelector('.reply-to-name');
    const replyPreviewText = document.querySelector('.reply-preview-text');

    replyToName.textContent = `Replying to ${messageData.senderName}`;
    replyPreviewText.textContent = messageData.text || '[Image]';

    messageInput.focus();
}

function cancelReply() {
    replyingToMessage = null;
    replyPreview.classList.add('hidden');
}

// Edit message functions
function setEditMessage(messageId, messageText) {
    editingMessageId = messageId;
    editingOriginalText = messageText;

    // Cancel any active reply
    cancelReply();

    // Set input value and update preview
    messageInput.value = messageText;
    messageInput.focus();

    // Update reply preview to show "Editing message"
    replyPreview.classList.remove('hidden');
    const replyToName = document.querySelector('.reply-to-name');
    const replyPreviewText = document.querySelector('.reply-preview-text');
    replyToName.textContent = 'Editing message';
    replyPreviewText.textContent = messageText;
}

function cancelEdit() {
    editingMessageId = null;
    editingOriginalText = null;
    replyPreview.classList.add('hidden');
    messageInput.value = '';
}

// Update cancel button to handle both reply and edit
cancelReplyBtn.removeEventListener('click', cancelReply);
cancelReplyBtn.addEventListener('click', () => {
    if (editingMessageId) {
        cancelEdit();
    } else {
        cancelReply();
    }
});

// Swipe to reply handler
async function triggerSwipeReply(messageData) {
    // Get sender name
    let senderName = 'Unknown';
    if (messageData.senderId === currentUser.uid) {
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        senderName = currentUserDoc.data()?.displayName || 'You';
    } else if (currentChatUser) {
        senderName = currentChatUser.displayName;
    }

    setReplyTo({
        id: messageData.id,
        senderId: messageData.senderId,
        senderName: senderName,
        text: messageData.text,
        type: messageData.type
    });
}

cancelReplyBtn.addEventListener('click', cancelReply);

// ===========================
// Reactions
// ===========================
function showReactionPopup(event, messageId) {
    selectedMessageId = messageId;
    reactionPopup.classList.remove('hidden');

    const x = event.clientX || event.touches[0].clientX;
    const y = event.clientY || event.touches[0].clientY;

    // Get popup dimensions
    const popupWidth = 300; // approximate width
    const popupHeight = 60;

    // Calculate position
    let left = x - 150;
    let top = y - 60;

    // Keep within screen bounds
    if (left < 10) left = 10;
    if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10;
    if (top < 10) top = 10;
    if (top + popupHeight > window.innerHeight - 10) top = y - popupHeight - 10;

    reactionPopup.style.left = `${left}px`;
    reactionPopup.style.top = `${top}px`;
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
// Message Options (Edit/Delete/Reply)
// ===========================
function showMessageOptions(event, messageId) {
    selectedMessageId = messageId;

    // Show/hide reply option based on message ownership
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const isOwnMessage = messageEl && messageEl.classList.contains('sent');
    const replyBtn = document.querySelector('.option-btn[data-action="reply"]');

    if (replyBtn) {
        if (isOwnMessage) {
            replyBtn.style.display = 'none';
        } else {
            replyBtn.style.display = 'block';
        }
    }

    messageOptions.classList.remove('hidden');

    const x = event.clientX;
    const y = event.clientY;

    // Get menu dimensions
    const menuWidth = 120;
    const menuHeight = 120; // approximate

    // Calculate position
    let left = x;
    let top = y;

    // Keep within screen bounds
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
    if (top + menuHeight > window.innerHeight - 10) top = window.innerHeight - menuHeight - 10;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    messageOptions.style.left = `${left}px`;
    messageOptions.style.top = `${top}px`;
}

document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        if (!selectedMessageId || !currentChatId) return;

        const messageRef = doc(db, 'chats', currentChatId, 'messages', selectedMessageId);

        try {
            if (action === 'reply') {
                // Get message data for reply
                const messageDoc = await getDoc(messageRef);
                if (messageDoc.exists()) {
                    const messageData = messageDoc.data();
                    // Get sender name
                    let senderName = 'Unknown';
                    if (messageData.senderId === currentUser.uid) {
                        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        senderName = currentUserDoc.data()?.displayName || 'You';
                    } else if (currentChatUser) {
                        senderName = currentChatUser.displayName;
                    }

                    setReplyTo({
                        id: selectedMessageId,
                        senderId: messageData.senderId,
                        senderName: senderName,
                        text: messageData.text,
                        type: messageData.type
                    });
                }
            } else if (action === 'delete') {
                await deleteDoc(messageRef);
            } else if (action === 'edit') {
                const messageDoc = await getDoc(messageRef);
                if (messageDoc.exists() && messageDoc.data().senderId === currentUser.uid) {
                    setEditMessage(selectedMessageId, messageDoc.data().text);
                }
            }

            messageOptions.classList.add('hidden');
        } catch (error) {
            console.error('Error performing message action:', error);
        }
    });
});
