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
    Timestamp,
    arrayUnion,
    arrayRemove
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
const CLOUDINARY_CLOUD_NAME = "dxhn3fzfu";
const CLOUDINARY_UPLOAD_PRESET = "chat123";

const PRESENCE_TIMEOUT = 15000; // 15 seconds
const PRESENCE_UPDATE_INTERVAL = 5000; // 5 seconds
const STORY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORY_AUTO_ADVANCE_MS = 6000;

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
let presenceInterval = null;
let currentUserData = null;
let unsubscribeCurrentUser = null;
let profileAvatarTempUrl = null;
let avatarUploadInProgress = false;
let unsubscribeStories = null;
let storiesByUser = new Map();
let activeStorySequence = [];
let activeStoryIndex = 0;
let activeStoryUserId = null;
let storyUploadInProgress = false;
let storyProgressRaf = null;
let storyProgressStart = null;
let storyProgressFillEl = null;

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
const currentUserNameEl = document.getElementById('current-user-name');
const currentUserEmailEl = document.getElementById('current-user-email');
const currentUserAvatarEl = document.getElementById('current-user-avatar');
const currentUserStatusEl = document.getElementById('current-user-status');
const currentUserIndicatorEl = document.getElementById('current-user-indicator');
const currentUserTaglineEl = document.getElementById('current-user-tagline');
const imageViewer = document.getElementById('image-viewer');
const imageViewerImg = document.getElementById('image-viewer-img');
const imageViewerDownload = document.getElementById('image-viewer-download');
const imageViewerClose = document.getElementById('image-viewer-close');
const editProfileBtn = document.getElementById('edit-profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeProfileModalBtn = document.getElementById('close-profile-modal');
const profileNameInput = document.getElementById('profile-name-input');
const profilePasscodeInput = document.getElementById('profile-passcode-input');
const profileStatusInput = document.getElementById('profile-status-input');
const profileAvatarInput = document.getElementById('profile-avatar-input');
const profileAvatarCircle = document.getElementById('profile-avatar-circle');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const storyStrip = document.getElementById('story-strip');
const storyListEl = document.getElementById('story-list');
const addStoryBtn = document.getElementById('add-story-btn');
const storyFileInput = document.getElementById('story-file-input');
const storyViewer = document.getElementById('story-viewer');
const storyViewerMedia = document.getElementById('story-viewer-media');
const storyViewerClose = document.getElementById('story-viewer-close');
const storyViewerName = document.getElementById('story-viewer-name');
const storyViewerTime = document.getElementById('story-viewer-time');
const storyViewerAvatar = document.getElementById('story-viewer-avatar');
const storyPrevBtn = document.getElementById('story-prev-btn');
const storyNextBtn = document.getElementById('story-next-btn');
const storyProgressEl = document.getElementById('story-progress');
const storyLikeBtn = document.getElementById('story-like-btn');
const storyLikeCountEl = document.getElementById('story-like-count');

renderCurrentUserProfile();
if (imageViewerClose && imageViewer) {
    imageViewerClose.addEventListener('click', closeImageViewer);
    imageViewer.addEventListener('click', (e) => {
        if (e.target === imageViewer || e.target.classList.contains('image-viewer-backdrop')) {
            closeImageViewer();
        }
    });
}
if (imageViewerDownload) {
    imageViewerDownload.addEventListener('click', handleImageDownload);
}
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openProfileModal);
}
if (closeProfileModalBtn) {
    closeProfileModalBtn.addEventListener('click', closeProfileModal);
}
if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener('click', closeProfileModal);
}
if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => profileAvatarInput?.click());
}
if (profileAvatarInput) {
    profileAvatarInput.addEventListener('change', handleProfileAvatarChange);
}
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfileChanges);
}
if (addStoryBtn) {
    addStoryBtn.addEventListener('click', () => storyFileInput?.click());
}
if (storyFileInput) {
    storyFileInput.addEventListener('change', handleStoryFileChange);
}
if (storyViewerClose) {
    storyViewerClose.addEventListener('click', closeStoryViewer);
}
if (storyViewer) {
    storyViewer.addEventListener('click', (e) => {
        if (e.target === storyViewer || e.target.classList.contains('story-viewer-backdrop')) {
            closeStoryViewer();
        }
    });
}
if (storyPrevBtn) {
    storyPrevBtn.addEventListener('click', () => navigateStory(-1));
}
if (storyNextBtn) {
    storyNextBtn.addEventListener('click', () => navigateStory(1));
}
if (storyLikeBtn) {
    storyLikeBtn.addEventListener('click', toggleStoryLike);
}

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
            photoURL: '',
            status: 'online',
            statusMessage: 'Available',
            lastActive: serverTimestamp(),
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
            await updateUserPresence('offline');
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
        await updateUserPresence('online');
        startPresenceTracking();
        listenToCurrentUser(user.uid);
        subscribeToStories();
    } else {
        stopPresenceTracking();
        if (unsubscribeCurrentUser) {
            unsubscribeCurrentUser();
            unsubscribeCurrentUser = null;
        }
        currentUserData = null;
        renderCurrentUserProfile();
        if (unsubscribeStories) {
            unsubscribeStories();
            unsubscribeStories = null;
        }
        storiesByUser.clear();
        renderStories([]);
        currentUser = null;
    }
});

// ===========================
// Helper Functions
// ===========================
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function isImageUrl(value) {
    return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image'));
}

function applyAvatarToElement(element, avatarValue, fallbackName) {
    if (!element) return;
    if (isImageUrl(avatarValue)) {
        element.style.backgroundImage = `url(${avatarValue})`;
        element.textContent = '';
        element.classList.add('has-image');
    } else {
        const initials = avatarValue && avatarValue.length <= 3
            ? avatarValue
            : getInitials(fallbackName || avatarValue || '');
        element.style.backgroundImage = '';
        element.textContent = initials || '?';
        element.classList.remove('has-image');
    }
}

async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || 'Upload failed');
    }

    return data.secure_url;
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
    const displayStatus = getDisplayStatus(userData);

    div.innerHTML = `
        <div class="user-avatar-container">
            <div class="user-avatar">${getInitials(userData.displayName || userData.email || '')}</div>
            ${displayStatus === 'online' ? '<div class="online-indicator"></div>' : ''}
        </div>
        <div class="user-info">
            <div class="user-name">${userData.displayName}</div>
            <div class="user-status">${displayStatus}</div>
        </div>
    `;

    applyAvatarToElement(div.querySelector('.user-avatar'), userData.photoURL, userData.displayName || userData.email);

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
        const avatarEl = userItem.querySelector('.user-avatar');
        const displayStatus = getDisplayStatus(userData);

        statusEl.textContent = displayStatus;
        applyAvatarToElement(avatarEl, userData.photoURL, userData.displayName || userData.email);

        const existingIndicator = avatarContainer.querySelector('.online-indicator');
        if (displayStatus === 'online' && !existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'online-indicator';
            avatarContainer.appendChild(indicator);
        } else if (displayStatus === 'offline' && existingIndicator) {
            existingIndicator.remove();
        }
    }

    // Update chat header if this is the current chat user
    if (currentChatUser && currentChatUser.uid === userData.uid) {
        document.getElementById('chat-user-status').textContent = displayStatus;
        applyAvatarToElement(document.getElementById('chat-user-avatar'), userData.photoURL, userData.displayName || userData.email);
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
    document.getElementById('chat-user-status').textContent = getDisplayStatus(userData);
    applyAvatarToElement(document.getElementById('chat-user-avatar'), userData.photoURL, userData.displayName || userData.email);

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

function createMessageElement(messageData) {
    const isOwnMessage = messageData.senderId === currentUser.uid;
    const isDeleted = !!messageData.isDeleted;

    const div = document.createElement('div');
    div.className = `message ${isOwnMessage ? 'sent' : 'received'}${isDeleted ? ' deleted' : ''}`;
    div.dataset.messageId = messageData.id;

    let content = '';
    if (isDeleted) {
        content = `<span class="message-deleted-text">This message was deleted</span>`;
    } else if (messageData.type === 'image' && messageData.imgUrl) {
        content = `<img src="${messageData.imgUrl}" class="message-image" alt="Image">`;
    } else {
        content = `<span class="message-text">${formatMessageText(messageData.text || '')}</span>`;
    }

    let replyHtml = '';
    if (!isDeleted && messageData.replyTo) {
        const replyName = messageData.replyTo.senderName || 'Unknown';
        const replyText = messageData.replyTo.text || '[Image]';
        replyHtml = `
            <div class="message-reply-context" data-reply-to="${messageData.replyTo.messageId}">
                <div class="reply-context-name">${escapeHtml(replyName)}</div>
                <div class="reply-context-text">${escapeHtml(replyText)}</div>
            </div>
        `;
    }

    const editedLabel = !isDeleted && messageData.isEdited ? '<span class="message-edited">(edited)</span>' : '';
    const metaHtml = editedLabel ? `<span class="message-meta">${editedLabel}</span>` : '';

    const statusLabel = !isDeleted && isOwnMessage
        ? `<div class="message-status">${getStatusText(messageData)}</div>`
        : '';

    let reactionsHtml = '';
    if (!isDeleted && messageData.reactions && messageData.reactions.length > 0) {
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

    const optionsTrigger = (!isDeleted && isOwnMessage)
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

    if (!isDeleted) {
    const bubble = div.querySelector('.message-bubble');
        const isReceivedMessage = !isOwnMessage;

    if (isReceivedMessage) {
        bubble.addEventListener('dblclick', (e) => {
            showReactionPopup(e, messageData.id);
        });

        bubble.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                showReactionPopup(e, messageData.id);
            }, 500);
        });

        bubble.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
    } else {
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

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    div.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
        div.style.transition = 'none';
    });

    div.addEventListener('touchmove', (e) => {
        if (!touchStartX) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isSwiping = true;

            const maxSwipe = 80;
            let translateX = 0;
                if (isOwnMessage && deltaX < 0) {
                translateX = Math.max(deltaX, -maxSwipe);
                } else if (!isOwnMessage && deltaX > 0) {
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

        let shouldReply = false;
            if (isOwnMessage && deltaX < -swipeThreshold) {
            shouldReply = true;
            } else if (!isOwnMessage && deltaX > swipeThreshold) {
            shouldReply = true;
        }

        if (shouldReply) {
            triggerSwipeReply(messageData);
        }

        div.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        div.style.transform = 'translateX(0)';
        div.style.opacity = '1';
        div.classList.remove('swiping');

        touchStartX = 0;
        isSwiping = false;
    });

    const optionsBtn = div.querySelector('.message-options-trigger');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMessageOptions(e, messageData.id);
        });
    }

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

        if (messageData.type === 'image' && messageData.imgUrl) {
            const imgEl = div.querySelector('.message-image');
            if (imgEl) {
                imgEl.addEventListener('click', () => openImageViewer(messageData.imgUrl));
            }
        }
    }

    return div;
}

function appendMessage(messageData) {
    const messageEl = createMessageElement(messageData);
    messagesContainer.appendChild(messageEl);
    updateMessageStatusVisibility();
}

function updateMessage(messageId, messageData) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageEl) return;
    const mergedData = { id: messageId, ...messageData };
    const newEl = createMessageElement(mergedData);
    messagesContainer.replaceChild(newEl, messageEl);
    updateMessageStatusVisibility();
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

function getDisplayStatus(userData) {
    if (!userData) return 'offline';
    const lastActive = userData.lastActive?.toDate
        ? userData.lastActive.toDate()
        : userData.lastActive
            ? new Date(userData.lastActive)
            : null;
    if (lastActive) {
        const isRecentlyActive = (Date.now() - lastActive.getTime()) < PRESENCE_TIMEOUT;
        return isRecentlyActive ? 'online' : 'offline';
    }
    return userData.status === 'online' ? 'online' : 'offline';
}

function renderCurrentUserProfile() {
    if (!currentUserNameEl) return;

    if (!currentUserData) {
        currentUserNameEl.textContent = 'You';
        currentUserEmailEl.textContent = '';
        currentUserTaglineEl && (currentUserTaglineEl.textContent = 'Add a status');
        applyAvatarToElement(currentUserAvatarEl, null, 'You');
        currentUserStatusEl.textContent = 'offline';
        currentUserStatusEl.classList.add('offline');
        currentUserIndicatorEl?.classList.add('hidden');
        return;
    }

    currentUserNameEl.textContent = currentUserData.displayName || 'You';
    currentUserEmailEl.textContent = currentUserData.email || currentUser?.email || '';
    currentUserTaglineEl && (currentUserTaglineEl.textContent = currentUserData.statusMessage || 'Add a status');
    applyAvatarToElement(currentUserAvatarEl, currentUserData.photoURL, currentUserData.displayName || currentUserData.email);

    const statusText = getDisplayStatus(currentUserData);
    currentUserStatusEl.textContent = statusText;
    if (statusText === 'online') {
        currentUserStatusEl.classList.remove('offline');
    } else {
        currentUserStatusEl.classList.add('offline');
    }
    if (statusText === 'online') {
        currentUserIndicatorEl?.classList.remove('hidden');
    } else {
        currentUserIndicatorEl?.classList.add('hidden');
    }
}

async function updateUserPresence(status) {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            status,
            lastActive: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating presence:', error);
    }
}

function startPresenceTracking() {
    stopPresenceTracking();
    updateUserPresence('online');
    presenceInterval = setInterval(() => {
        updateUserPresence('online');
    }, PRESENCE_UPDATE_INTERVAL);
}

function stopPresenceTracking() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (!currentUser) return;
    if (document.visibilityState === 'hidden') {
        stopPresenceTracking();
        updateUserPresence('offline');
    } else {
        startPresenceTracking();
    }
});

window.addEventListener('beforeunload', () => {
    if (!currentUser) return;
    updateUserPresence('offline');
});

function listenToCurrentUser(uid) {
    if (unsubscribeCurrentUser) {
        unsubscribeCurrentUser();
    }
    const userRef = doc(db, 'users', uid);
    unsubscribeCurrentUser = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            currentUserData = snapshot.data();
            renderCurrentUserProfile();
        }
    });
}

// ===========================
// Stories
// ===========================
function handleStoryFileChange(event) {
    const file = event.target.files[0];
    if (!file || !currentUser || storyUploadInProgress) return;
    uploadStory(file);
}

async function uploadStory(file) {
    try {
        storyUploadInProgress = true;
        setStoryUploadState(true);
        const mediaUrl = await uploadImageToCloudinary(file);
        const authorName = currentUserData?.displayName || currentUser?.email || 'You';
        const authorAvatar = currentUserData?.photoURL || '';

        await addDoc(collection(db, 'stories'), {
            userId: currentUser.uid,
            mediaUrl,
            createdAt: serverTimestamp(),
            authorName,
            authorAvatar,
            viewers: [],
            likes: []
        });
    } catch (error) {
        console.error('Error uploading story:', error);
        alert('Unable to publish your story. Please try again.');
    } finally {
        storyUploadInProgress = false;
        setStoryUploadState(false);
        if (storyFileInput) {
            storyFileInput.value = '';
        }
    }
}

function setStoryUploadState(isUploading) {
    if (!addStoryBtn) return;
    const label = addStoryBtn.querySelector('small');
    addStoryBtn.disabled = isUploading;
    if (isUploading) {
        addStoryBtn.classList.add('uploading');
        if (label) label.textContent = 'Uploading...';
    } else {
        addStoryBtn.classList.remove('uploading');
        if (label) label.textContent = 'Add story';
    }
}

function subscribeToStories() {
    if (unsubscribeStories) {
        unsubscribeStories();
    }
    const storiesRef = collection(db, 'stories');
    const storiesQuery = query(storiesRef, orderBy('createdAt', 'desc'));
    unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
        const cutoff = Date.now() - STORY_DURATION_MS;
        const stories = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const createdAt = data.createdAt?.toDate?.();
            if (!createdAt) return;
            if (createdAt.getTime() < cutoff) {
                return;
            }
            stories.push({
                id: docSnap.id,
                ...data,
                createdAt,
                viewers: data.viewers || [],
                likes: data.likes || []
            });
        });
        renderStories(stories);
    });
}

function renderStories(stories = []) {
    if (!storyListEl) return;
    storiesByUser = new Map();
    stories.forEach((story) => {
        const arr = storiesByUser.get(story.userId) || [];
        arr.push(story);
        storiesByUser.set(story.userId, arr);
    });
    storyListEl.innerHTML = '';

    storiesByUser.forEach((storyArr, userId) => {
        storyArr.sort((a, b) => a.createdAt - b.createdAt);
        const latestStory = storyArr[storyArr.length - 1];
        const card = document.createElement('button');
        card.className = 'story-card';
        card.type = 'button';
        card.dataset.userId = userId;
        if (currentUser && latestStory.viewers?.includes(currentUser.uid)) {
            card.classList.add('seen');
        }
        card.innerHTML = `
            <div class="story-avatar"></div>
            <small>${escapeHtml((latestStory.authorName || 'Story').split(' ')[0])}</small>
        `;
        const avatarEl = card.querySelector('.story-avatar');
        applyAvatarToElement(avatarEl, latestStory.authorAvatar, latestStory.authorName || latestStory.userId);
        card.addEventListener('click', () => openStorySequence(userId));
        storyListEl.appendChild(card);
    });

    if (storyListEl.children.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'story-empty';
        placeholder.textContent = 'No stories yet';
        storyListEl.appendChild(placeholder);
    }

    if (storyViewer && !storyViewer.classList.contains('hidden') && activeStoryUserId) {
        const updatedSequence = storiesByUser.get(activeStoryUserId);
        if (!updatedSequence || updatedSequence.length === 0) {
            closeStoryViewer();
        } else {
            const currentStoryId = activeStorySequence?.[activeStoryIndex]?.id;
            activeStorySequence = updatedSequence;
            const idx = updatedSequence.findIndex(story => story.id === currentStoryId);
            if (idx !== -1) {
                activeStoryIndex = idx;
                updateStoryLikeUI(activeStorySequence[activeStoryIndex]);
            } else {
                activeStoryIndex = Math.min(activeStoryIndex, activeStorySequence.length - 1);
                showStoryAtIndex(activeStoryIndex);
            }
        }
    }
}

function openStorySequence(userId) {
    if (!storiesByUser.has(userId)) return;
    activeStorySequence = storiesByUser.get(userId);
    if (!activeStorySequence || activeStorySequence.length === 0) return;
    activeStoryUserId = userId;
    activeStoryIndex = 0;
    stopStoryProgress();
    if (storyViewer) {
        storyViewer.classList.remove('hidden');
    }
    showStoryAtIndex(activeStoryIndex);
}

function showStoryAtIndex(index) {
    if (!activeStorySequence || index < 0 || index >= activeStorySequence.length) {
        closeStoryViewer();
        return;
    }
    stopStoryProgress();
    activeStoryIndex = index;
    const story = activeStorySequence[index];
    if (storyViewerMedia) {
        storyViewerMedia.src = story.mediaUrl;
    }
    if (storyViewerName) {
        storyViewerName.textContent = story.authorName || 'Story';
    }
    if (storyViewerTime) {
        storyViewerTime.textContent = formatStoryTime(story.createdAt);
    }
    applyAvatarToElement(storyViewerAvatar, story.authorAvatar, story.authorName || story.userId);
    updateStoryNavButtons();
    markStoryViewed(story);
    updateStoryLikeUI(story);
    renderStoryProgressBars();
    startStoryProgress();
}

function updateStoryNavButtons() {
    if (storyPrevBtn) {
        storyPrevBtn.disabled = activeStoryIndex <= 0;
    }
    if (storyNextBtn) {
        storyNextBtn.disabled = activeStoryIndex >= activeStorySequence.length - 1;
    }
}

function navigateStory(direction) {
    if (!activeStorySequence) return;
    const newIndex = activeStoryIndex + direction;
    if (newIndex < 0 || newIndex >= activeStorySequence.length) {
        closeStoryViewer();
        return;
    }
    showStoryAtIndex(newIndex);
}

function closeStoryViewer() {
    if (storyViewer) {
        storyViewer.classList.add('hidden');
    }
    stopStoryProgress();
    updateStoryLikeUI(null);
    activeStorySequence = [];
    activeStoryUserId = null;
    activeStoryIndex = 0;
}

function renderStoryProgressBars() {
    if (!storyProgressEl || !activeStorySequence || activeStorySequence.length === 0) return;
    storyProgressEl.innerHTML = '';
    activeStorySequence.forEach((_, idx) => {
        const bar = document.createElement('div');
        bar.className = 'story-progress-bar';
        if (idx < activeStoryIndex) {
            bar.classList.add('completed');
        } else if (idx === activeStoryIndex) {
            bar.classList.add('active');
            const fill = document.createElement('div');
            fill.className = 'story-progress-fill';
            bar.appendChild(fill);
        }
        storyProgressEl.appendChild(bar);
    });
    storyProgressFillEl = storyProgressEl.querySelector('.story-progress-bar.active .story-progress-fill');
}

function startStoryProgress() {
    if (!storyProgressFillEl) return;
    storyProgressStart = performance.now();
    storyProgressFillEl.style.width = '0%';
    storyProgressRaf = requestAnimationFrame(updateStoryProgressFrame);
}

function updateStoryProgressFrame(timestamp) {
    if (!storyProgressFillEl || storyViewer?.classList.contains('hidden')) {
        stopStoryProgress();
        return;
    }
    const elapsed = timestamp - (storyProgressStart || timestamp);
    const progress = Math.min(1, elapsed / STORY_AUTO_ADVANCE_MS);
    storyProgressFillEl.style.width = `${progress * 100}%`;
    if (progress >= 1) {
        stopStoryProgress();
        navigateStory(1);
        return;
    }
    storyProgressRaf = requestAnimationFrame(updateStoryProgressFrame);
}

function stopStoryProgress() {
    if (storyProgressRaf) {
        cancelAnimationFrame(storyProgressRaf);
    }
    storyProgressRaf = null;
    storyProgressStart = null;
    storyProgressFillEl = null;
}

function updateStoryLikeUI(story) {
    if (!storyLikeBtn || !storyLikeCountEl) return;
    if (!story) {
        storyLikeBtn.disabled = true;
        storyLikeBtn.classList.remove('liked');
        storyLikeBtn.textContent = '♡';
        storyLikeCountEl.textContent = '';
        return;
    }
    const likes = story.likes || [];
    const isLiked = !!(currentUser && likes.includes(currentUser.uid));
    storyLikeBtn.disabled = !currentUser;
    storyLikeBtn.classList.toggle('liked', isLiked);
    storyLikeBtn.textContent = isLiked ? '♥' : '♡';
    storyLikeCountEl.textContent = likes.length === 1 ? '1 like' : `${likes.length} likes`;
}

async function toggleStoryLike() {
    if (!currentUser || !activeStorySequence || !activeStorySequence[activeStoryIndex]) return;
    const story = activeStorySequence[activeStoryIndex];
    const storyRef = doc(db, 'stories', story.id);
    const likes = story.likes || [];
    const isLiked = likes.includes(currentUser.uid);
    try {
        if (isLiked) {
            await updateDoc(storyRef, {
                likes: arrayRemove(currentUser.uid)
            });
            story.likes = likes.filter(uid => uid !== currentUser.uid);
        } else {
            await updateDoc(storyRef, {
                likes: arrayUnion(currentUser.uid)
            });
            story.likes = [...likes, currentUser.uid];
        }
        updateStoryLikeUI(story);
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

function markStoryViewed(story) {
    if (!currentUser || story.viewers?.includes(currentUser.uid)) return;
    const storyRef = doc(db, 'stories', story.id);
    updateDoc(storyRef, {
        viewers: arrayUnion(currentUser.uid)
    }).catch((error) => console.error('Error marking story as viewed:', error));
}

function formatStoryTime(date) {
    if (!date) return '';
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function openImageViewer(url) {
    if (!imageViewer || !imageViewerImg || !imageViewerDownload) return;
    imageViewerImg.src = url;
    imageViewerDownload.href = url;
    const fileName = url.split('/').pop().split('?')[0];
    imageViewerDownload.setAttribute('download', fileName || 'image');
    imageViewer.classList.remove('hidden');
}

function closeImageViewer() {
    if (!imageViewer) return;
    imageViewer.classList.add('hidden');
    if (imageViewerImg) {
        imageViewerImg.src = '';
    }
    if (imageViewerDownload) {
        imageViewerDownload.removeAttribute('href');
    }
}

async function handleImageDownload(e) {
    e.preventDefault();
    if (!imageViewerImg || !imageViewerImg.src) return;
    const url = imageViewerImg.src;
    try {
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        triggerFileDownload(blob, getFileNameFromUrl(url));
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('Unable to download image right now. Please try again.');
    }
}

function triggerFileDownload(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = objectUrl;
    tempLink.download = filename || 'image';
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(objectUrl);
}

function getFileNameFromUrl(url) {
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/');
        return segments.pop() || 'image';
    } catch (error) {
        return 'image';
    }
}

function openProfileModal() {
    if (!profileModal || !currentUser) return;
    profileModal.classList.remove('hidden');
    const name = currentUserData?.displayName || '';
    profileNameInput && (profileNameInput.value = name);
    profilePasscodeInput && (profilePasscodeInput.value = currentUserData?.passcode || '');
    profileStatusInput && (profileStatusInput.value = currentUserData?.statusMessage || '');
    profileAvatarTempUrl = null;
    applyAvatarToElement(profileAvatarCircle, currentUserData?.photoURL, name || currentUserData?.email || currentUser.email);
}

function closeProfileModal() {
    profileModal?.classList.add('hidden');
    profileAvatarTempUrl = null;
    if (profileAvatarInput) {
        profileAvatarInput.value = '';
    }
}

async function handleProfileAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (changeAvatarBtn) {
        changeAvatarBtn.textContent = 'Uploading...';
        changeAvatarBtn.disabled = true;
    }
    avatarUploadInProgress = true;
    try {
        const url = await uploadImageToCloudinary(file);
        profileAvatarTempUrl = url;
        applyAvatarToElement(profileAvatarCircle, url, currentUserData?.displayName || currentUserData?.email || currentUser?.email);
    } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Failed to upload avatar. Please try again.');
    } finally {
        avatarUploadInProgress = false;
        if (changeAvatarBtn) {
            changeAvatarBtn.textContent = 'Change photo';
            changeAvatarBtn.disabled = false;
        }
        if (profileAvatarInput) {
            profileAvatarInput.value = '';
        }
    }
}

async function saveProfileChanges() {
    if (!currentUser || !currentUserData) return;
    if (avatarUploadInProgress) {
        alert('Please wait for the avatar upload to finish.');
        return;
    }

    const updates = {};
    const newName = profileNameInput?.value.trim();
    const newPasscode = profilePasscodeInput?.value.trim();
    const newStatusMessage = profileStatusInput?.value.trim();

    if (newName && newName !== currentUserData.displayName) {
        updates.displayName = newName;
    }
    if (typeof newPasscode === 'string' && newPasscode !== currentUserData.passcode) {
        updates.passcode = newPasscode;
    }
    if ((newStatusMessage || currentUserData.statusMessage) && newStatusMessage !== (currentUserData.statusMessage || '')) {
        updates.statusMessage = newStatusMessage;
    }
    if (profileAvatarTempUrl) {
        updates.photoURL = profileAvatarTempUrl;
    }

    if (Object.keys(updates).length === 0) {
        closeProfileModal();
        return;
    }

    try {
        if (saveProfileBtn) {
            saveProfileBtn.disabled = true;
            saveProfileBtn.textContent = 'Saving...';
        }
        await updateDoc(doc(db, 'users', currentUser.uid), updates);
        closeProfileModal();
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Could not save your profile. Please try again.');
    } finally {
        if (saveProfileBtn) {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = 'Save changes';
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageText(text) {
    if (!text) return '';
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// ===========================
// Send Message
// ===========================
sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
    const rawText = messageInput.value;
    if (!rawText.trim() || !currentChatId) return;
    const text = rawText;

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
            reactions: [],
            isDeleted: false
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
        messageInput.style.height = 'auto';
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
        const secureUrl = await uploadImageToCloudinary(file);
        if (secureUrl) {
            const messagesRef = collection(db, 'chats', currentChatId, 'messages');
            await addDoc(messagesRef, {
                imgUrl: secureUrl,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                type: 'image',
                seen: false,
                reactions: [],
                isDeleted: false
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
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
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
                await updateDoc(messageRef, {
                    text: '',
                    imgUrl: '',
                    type: 'text',
                    reactions: [],
                    replyTo: null,
                    isEdited: false,
                    isDeleted: true,
                    deletedAt: serverTimestamp()
                });
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
