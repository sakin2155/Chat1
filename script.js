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
    limit,
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

// Giphy API Configuration
// Get your free API key from: https://developers.giphy.com/dashboard/
const GIPHY_API_KEY = 'GDeNjVWG1AZz0bUqp5nzmY9JFrocS0vQ';
const GIPHY_RESULT_LIMIT = 28;
const CUSTOM_STICKERS_KEY_PREFIX = 'chat-custom-stickers';
const DEFAULT_STICKER_EMOJIS = ['😀', '😂', '😍', '😎', '🤯', '😭', '🙌', '🔥', '👍', '🎉', '💀', '🤩'];

const PRESENCE_TIMEOUT = 15000; // 15 seconds
const PRESENCE_UPDATE_INTERVAL = 5000; // 5 seconds
const STORY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORY_AUTO_ADVANCE_MS = 6000;

// ===========================
// Global State
// ===========================
const DEFAULT_STICKERS = DEFAULT_STICKER_EMOJIS.map((emoji, index) => ({
    id: `emoji-${index}`,
    emoji,
    url: createEmojiStickerDataUrl(emoji)
}));

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
let userNicknames = new Map(); // Store nicknames: userId -> nickname
let chatThemes = new Map(); // Store themes: chatId -> theme object
let storiesByUser = new Map();
let activeStorySequence = [];
let activeStoryIndex = 0;
let activeStoryUserId = null;
let storyUploadInProgress = false;
let storyProgressRaf = null;
let storyProgressStart = null;
let storyProgressFillEl = null;
let storyProgressDuration = STORY_AUTO_ADVANCE_MS;
let gifSearchTimeout = null;
let gifInitialLoadDone = false;
let gifAbortController = null;
let gifCurrentOffset = 0;
let gifCurrentQuery = '';
let gifLoadingMore = false;
let gifHasMore = true;
let customStickers = [];
let streakData = new Map(); // Store streaks: chatId -> { count, lastMessageDate, lastMessageFrom }
let streakCheckInterval = null;

// ===========================
// Auto-scroll Helper
// ===========================
function scrollMessagesToBottom() {
    if (!messagesContainer) return;
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ===========================
// Notification Helper
// ===========================
function showNotification(message, duration = 3000) {
    if (!successNotification || !notificationMessage) return;
    notificationMessage.textContent = message;
    successNotification.classList.remove('hidden');
    
    // Auto-hide after duration
    setTimeout(() => {
        successNotification.classList.add('hidden');
    }, duration);
}

// ===========================
// DOM Elements
// ===========================
const globalLoading = document.getElementById('global-loading');
const calculatorView = document.getElementById('calculator-view');
const chatApp = document.getElementById('chat-app');
const loginModal = document.getElementById('login-modal');
const display = document.getElementById('display');
const loginTrigger = document.getElementById('login-trigger');
const calcLoginTrigger = document.getElementById('calc-login-trigger');
const calcLogoutBtn = document.getElementById('calc-logout-btn');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');
const userList = document.getElementById('user-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const mediaMenuBtn = document.getElementById('media-menu-btn');
const mediaMenu = document.getElementById('media-menu');
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
const deleteAccountBtn = document.getElementById('delete-account-btn');
const deleteAccountModal = document.getElementById('delete-account-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const deleteEmailInput = document.getElementById('delete-email-input');
const deleteEmailError = document.getElementById('delete-email-error');
const chatSettingsBtn = document.getElementById('chat-settings-btn');
const chatSettingsModal = document.getElementById('chat-settings-modal');
const closeChatSettingsBtn = document.getElementById('close-chat-settings');
const nicknameInput = document.getElementById('nickname-input');
const saveNicknameBtn = document.getElementById('save-nickname-btn');
const removeNicknameBtn = document.getElementById('remove-nickname-btn');
const sentBubbleColorInput = document.getElementById('sent-bubble-color');
const receivedBubbleColorInput = document.getElementById('received-bubble-color');
const bgColorInput = document.getElementById('bg-color');
const bgImageInput = document.getElementById('bg-image');
const bgImageBtn = document.getElementById('bg-image-btn');
const removeBgImageBtn = document.getElementById('remove-bg-image-btn');
const applyThemeBtn = document.getElementById('apply-theme-btn');
const resetThemeBtn = document.getElementById('reset-theme-btn');
const clearAllChatsBtn = document.getElementById('clear-all-chats-btn');
const clearChatConfirmationModal = document.getElementById('clear-chat-confirmation-modal');
const confirmClearBtn = document.getElementById('confirm-clear-btn');
const confirmClearCancelBtn = document.getElementById('confirm-clear-cancel-btn');
const successNotification = document.getElementById('success-notification');
const notificationMessage = document.getElementById('notification-message');
const storyStrip = document.getElementById('story-strip');
const storyListEl = document.getElementById('story-list');
const addStoryBtn = document.getElementById('add-story-btn');
const storyFileInput = document.getElementById('story-file-input');
const storyViewer = document.getElementById('story-viewer');
const storyViewerMediaContainer = document.getElementById('story-viewer-media-container');
const storyViewerClose = document.getElementById('story-viewer-close');
const storyViewerName = document.getElementById('story-viewer-name');
const storyViewerTime = document.getElementById('story-viewer-time');
const storyViewerAvatar = document.getElementById('story-viewer-avatar');
const storyPrevBtn = document.getElementById('story-prev-btn');
const storyNextBtn = document.getElementById('story-next-btn');
const storyProgressEl = document.getElementById('story-progress');
const storyLikeBtn = document.getElementById('story-like-btn');
const storyLikeCountEl = document.getElementById('story-like-count');
const gifModal = document.getElementById('gif-modal');
const closeGifModalBtn = document.getElementById('close-gif-modal');
const gifResultsEl = document.getElementById('gif-results');
const gifSearchInput = document.getElementById('gif-search-input');
const gifEmptyState = document.getElementById('gif-empty-state');
const gifLoadingEl = document.getElementById('gif-loading');
const stickerSheet = document.getElementById('sticker-sheet');
const stickerBackdrop = stickerSheet ? stickerSheet.querySelector('.sheet-backdrop') : null;
const closeStickerPanelBtn = document.getElementById('close-sticker-panel');
const addStickerBtn = document.getElementById('add-sticker-btn');
const defaultStickerGrid = document.getElementById('default-sticker-grid');
const customStickerGrid = document.getElementById('custom-sticker-grid');
const customStickerSection = document.getElementById('custom-sticker-section');
const stickerFileInput = document.getElementById('sticker-file-input');
const streakBadge = document.getElementById('streak-badge');
const streakCount = document.getElementById('streak-count');

// ===========================
// Performance Optimizations
// ===========================
// Debounce scroll events for smooth scrolling
let scrollTimeout;
function debounceScroll(callback, delay = 100) {
    return function () {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(callback, delay);
    };
}

// Throttle function for frequent events
function throttle(func, limit) {
    let inThrottle;
    return function () {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Use passive event listeners for better scroll performance
const passiveOptions = { passive: true };

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
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
}
if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', closeDeleteAccountModal);
}
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', confirmDeleteAccount);
}
if (deleteEmailInput) {
    deleteEmailInput.addEventListener('input', () => {
        deleteEmailError.classList.add('hidden');
        deleteEmailError.textContent = '';
    });
}
if (deleteAccountModal) {
    deleteAccountModal.addEventListener('click', (e) => {
        if (e.target === deleteAccountModal) {
            closeDeleteAccountModal();
        }
    });
}
if (chatSettingsBtn) {
    chatSettingsBtn.addEventListener('click', openChatSettingsModal);
}
if (closeChatSettingsBtn) {
    closeChatSettingsBtn.addEventListener('click', closeChatSettingsModal);
}
if (saveNicknameBtn) {
    saveNicknameBtn.addEventListener('click', saveNickname);
}
if (removeNicknameBtn) {
    removeNicknameBtn.addEventListener('click', removeNickname);
}
if (clearAllChatsBtn) {
    clearAllChatsBtn.addEventListener('click', showClearChatConfirmation);
}
if (confirmClearBtn) {
    confirmClearBtn.addEventListener('click', confirmClearAllChats);
}
if (confirmClearCancelBtn) {
    confirmClearCancelBtn.addEventListener('click', closeClearChatConfirmation);
}
if (clearChatConfirmationModal) {
    clearChatConfirmationModal.addEventListener('click', (e) => {
        if (e.target === clearChatConfirmationModal) {
            closeClearChatConfirmation();
        }
    });
}
if (chatSettingsModal) {
    chatSettingsModal.addEventListener('click', (e) => {
        if (e.target === chatSettingsModal) {
            closeChatSettingsModal();
        }
    });
}
if (bgImageBtn) {
    bgImageBtn.addEventListener('click', () => bgImageInput?.click());
}
if (bgImageInput) {
    bgImageInput.addEventListener('change', handleBgImageChange);
}
if (removeBgImageBtn) {
    removeBgImageBtn.addEventListener('click', removeBgImage);
}
if (applyThemeBtn) {
    applyThemeBtn.addEventListener('click', applyTheme);
}
if (resetThemeBtn) {
    resetThemeBtn.addEventListener('click', resetTheme);
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
// Media menu will be handled separately
if (closeGifModalBtn) {
    closeGifModalBtn.addEventListener('click', closeGifModal);
}
if (gifModal) {
    gifModal.addEventListener('click', (e) => {
        if (e.target === gifModal) {
            closeGifModal();
        }
    });
}
if (gifSearchInput) {
    gifSearchInput.addEventListener('input', handleGifSearchInput);
}
if (gifResultsEl) {
    gifResultsEl.addEventListener('scroll', handleGifScroll);
}
// Media menu will be handled separately
if (closeStickerPanelBtn) {
    closeStickerPanelBtn.addEventListener('click', closeStickerSheet);
}
if (stickerBackdrop) {
    stickerBackdrop.addEventListener('click', closeStickerSheet);
}
if (addStickerBtn) {
    addStickerBtn.addEventListener('click', () => stickerFileInput?.click());
}
if (stickerFileInput) {
    stickerFileInput.addEventListener('change', handleStickerUpload);
}
renderDefaultStickers();
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeGifModal();
        closeStickerSheet();
    }
});

// ===========================
// Global Loading Screen Functions
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
    // Handle decimal point
    if (num === '.') {
        // Don't add multiple decimal points
        if (currentValue.includes('.')) return;
        currentValue = currentValue + num;
    } else {
        if (shouldResetDisplay) {
            currentValue = num;
            shouldResetDisplay = false;
        } else {
            currentValue = currentValue === '0' ? num : currentValue + num;
        }
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
if (loginTrigger) {
    loginTrigger.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
    });
}

// Calculator view buttons
if (calcLoginTrigger) {
    calcLoginTrigger.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
    });
}

if (calcLogoutBtn) {
    calcLogoutBtn.addEventListener('click', async () => {
        try {
            showLoading('Logging out...');
            await signOut(auth);
            hideLoading();
            chatApp.classList.add('hidden');
            calculatorView.classList.remove('hidden');
            currentValue = '0';
            updateDisplay(currentValue);
        } catch (error) {
            hideLoading();
            console.error('Error logging out:', error);
        }
    });
}

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
        showLoading('Signing in...');
        await signInWithEmailAndPassword(auth, email, password);
        loginModal.classList.add('hidden');
        authError.textContent = '';
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        hideLoading();
    }
});

document.getElementById('create-account-btn').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;
    const passcode = document.getElementById('signup-passcode').value;

    try {
        showLoading('Creating account...');
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
    } finally {
        hideLoading();
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        showLoading('Logging out...');
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
    } finally {
        hideLoading();
    }
});

// Update calculator header based on auth state
function updateCalculatorHeader(isLoggedIn) {
    if (isLoggedIn) {
        // Show logout button, hide login button
        if (calcLoginTrigger) calcLoginTrigger.classList.add('hidden');
        if (calcLogoutBtn) calcLogoutBtn.classList.remove('hidden');
    } else {
        // Show login button, hide logout button
        if (calcLoginTrigger) calcLoginTrigger.classList.remove('hidden');
        if (calcLogoutBtn) calcLogoutBtn.classList.add('hidden');
    }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            currentUser = user;
            // Load nicknames from localStorage
            const nicknamesData = localStorage.getItem(`nicknames_${user.uid}`);
            if (nicknamesData) {
                try {
                    userNicknames = new Map(JSON.parse(nicknamesData));
                } catch (e) {
                    console.error('Error loading nicknames:', e);
                    userNicknames = new Map();
                }
            }
            // Load themes from localStorage
            const themesData = localStorage.getItem(`themes_${user.uid}`);
            if (themesData) {
                try {
                    chatThemes = new Map(JSON.parse(themesData));
                } catch (e) {
                    console.error('Error loading themes:', e);
                    chatThemes = new Map();
                }
            }
            // Update calculator header to show logout button
            updateCalculatorHeader(true);
            // Update user status to online
            await updateUserPresence('online');
            startPresenceTracking();
            listenToCurrentUser(user.uid);
            subscribeToStories();
            loadCustomStickers(user.uid);
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
            customStickers = [];
            renderCustomStickers();
            // Update calculator header to show login button
            updateCalculatorHeader(false);
        }
    } finally {
        // Hide loading screen after auth state is determined
        hideLoading();
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

async function uploadImageToCloudinary(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });
        }

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                if (data.secure_url) {
                    resolve(data.secure_url);
                } else {
                    reject(new Error(data.error?.message || 'Upload failed'));
                }
            } else {
                const data = JSON.parse(xhr.responseText);
                reject(new Error(data.error?.message || 'Upload failed'));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`);
        xhr.send(formData);
    });
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

    // Check if user has a nickname
    const nickname = userNicknames.get(userData.uid);
    const displayName = nickname || userData.displayName;

    div.innerHTML = `
        <div class="user-avatar-container">
            <div class="user-avatar">${getInitials(userData.displayName || userData.email || '')}</div>
            ${displayStatus === 'online' ? '<div class="online-indicator"></div>' : ''}
            <div class="unread-badge hidden" data-count="0">0</div>
        </div>
        <div class="user-info">
            <div class="user-name">${displayName}</div>
            <div class="user-preview">Loading...</div>
        </div>
    `;

    applyAvatarToElement(div.querySelector('.user-avatar'), userData.photoURL, userData.displayName || userData.email);

    div.addEventListener('click', () => {
        openChat(userData);
    });

    // Load and listen to latest message preview
    loadLatestMessagePreview(userData.uid, div);
    
    // Load and listen to unread message count
    listenToUnreadCount(userData.uid, div);

    return div;
}

function updateUserStatus(userData) {
    const displayStatus = getDisplayStatus(userData);
    const userItem = document.querySelector(`.user-item[data-user-id="${userData.uid}"]`);
    if (userItem) {
        const avatarContainer = userItem.querySelector('.user-avatar-container');
        const avatarEl = userItem.querySelector('.user-avatar');

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
        document.getElementById('chat-user-status').textContent = getChatHeaderStatus(userData);
        applyAvatarToElement(document.getElementById('chat-user-avatar'), userData.photoURL, userData.displayName || userData.email);
    }
}

function getMessagePreviewText(messageData) {
    if (messageData.isDeleted) {
        return 'This message was deleted';
    }

    if (messageData.type === 'sticker') {
        return '[Sent a Sticker]';
    } else if (messageData.type === 'gif') {
        return '[Sent a GIF]';
    } else if (messageData.type === 'image') {
        return '[Sent an Image]';
    } else if (messageData.text) {
        // Truncate text to 20 characters for preview
        return messageData.text.length > 20
            ? messageData.text.substring(0, 20) + '...'
            : messageData.text;
    }

    return '[Message]';
}

function loadLatestMessagePreview(otherUserId, userItemEl) {
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const previewEl = userItemEl.querySelector('.user-preview');
        if (!previewEl) return;

        if (snapshot.empty) {
            previewEl.textContent = 'No messages yet';
            previewEl.classList.remove('unread');
        } else {
            const latestMessage = snapshot.docs[0].data();
            const previewText = getMessagePreviewText(latestMessage);
            
            // Add "You: " prefix if current user sent the message
            const isCurrentUserSender = latestMessage.senderId === currentUser.uid;
            const displayText = isCurrentUserSender ? `You: ${previewText}` : previewText;
            previewEl.textContent = displayText;

            // Add unread indicator if message is not seen and not from current user
            if (!latestMessage.seen && latestMessage.senderId !== currentUser.uid) {
                previewEl.classList.add('unread');
            } else {
                previewEl.classList.remove('unread');
            }
        }
    });

    // Store unsubscribe function for cleanup if needed
    if (!userItemEl._unsubscribes) {
        userItemEl._unsubscribes = [];
    }
    userItemEl._unsubscribes.push(unsubscribe);
}

function listenToUnreadCount(otherUserId, userItemEl) {
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    // Query for unseen messages from the other user
    const q = query(messagesRef, where('senderId', '==', otherUserId), where('seen', '==', false));

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const badgeEl = userItemEl.querySelector('.unread-badge');
        if (!badgeEl) return;

        const unreadCount = snapshot.size;
        
        if (unreadCount > 0) {
            badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badgeEl.dataset.count = unreadCount;
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
            badgeEl.dataset.count = '0';
        }
    });

    // Store unsubscribe function for cleanup if needed
    if (!userItemEl._unsubscribes) {
        userItemEl._unsubscribes = [];
    }
    userItemEl._unsubscribes.push(unsubscribe);
}

// ===========================
// Chat Window
// ===========================
async function openChat(userData) {
    currentChatUser = userData;
    currentChatId = getChatId(currentUser.uid, userData.uid);

    // Update UI with nickname if exists
    const nickname = userNicknames.get(userData.uid);
    const displayName = nickname || userData.displayName;
    document.getElementById('chat-user-name').textContent = displayName;
    document.getElementById('chat-user-status').textContent = getChatHeaderStatus(userData);
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

    // Load streak data
    await loadStreakData(currentChatId);
    updateStreakDisplay(currentChatId);

    // Load and apply theme for this chat
    loadThemeForChat();
}

backToUsersBtn.addEventListener('click', () => {
    chatWindowContainer.classList.remove('active');
});

// ===========================
// Messages
// ===========================
let isFirstMessageLoad = true;

function loadMessages() {
    // Unsubscribe from previous chat
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    messagesContainer.innerHTML = '';
    isFirstMessageLoad = true;

    const messagesRef = collection(db, 'chats', currentChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        // Check if user is at bottom before changes
        const wasAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 100;
        let hasNewMessages = false;
        let messageCount = 0;

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const messageData = { id: change.doc.id, ...change.doc.data() };
                appendMessage(messageData);
                hasNewMessages = true;
                messageCount++;
            } else if (change.type === 'modified') {
                updateMessage(change.doc.id, change.doc.data());
                // Don't treat modified messages as "new" to prevent unnecessary scrolling
            } else if (change.type === 'removed') {
                removeMessage(change.doc.id);
            }
        });

        // Auto-scroll logic:
        // 1. Always scroll to bottom on first load (initial chat open)
        // 2. Scroll to bottom if user was already at bottom and new messages arrive
        if (hasNewMessages) {
            if (isFirstMessageLoad) {
                // First load: always scroll to bottom to show latest messages
                scrollToBottom(false);
                isFirstMessageLoad = false;
            } else if (wasAtBottom) {
                // Subsequent loads: only scroll if user was at bottom
                scrollToBottom(false);
            }

            // Mark new messages as seen (debounced)
            markMessagesAsSeen();
        }
    });

    // Add passive scroll listener for better performance
    if (messagesContainer && !messagesContainer._scrollListenerAdded) {
        messagesContainer.addEventListener('scroll', throttle(() => {
            markMessagesAsSeen();
        }, 200), passiveOptions);
        messagesContainer._scrollListenerAdded = true;
    }
}

function createMessageElement(messageData) {
    const isOwnMessage = messageData.senderId === currentUser.uid;
    const isDeleted = !!messageData.isDeleted;
    const isSystemMessage = messageData.type === 'system';
    const isGameInvite = messageData.type === 'game_invite';
    const isStickerOrGif = !isDeleted && (messageData.type === 'sticker' || messageData.type === 'gif');

    const div = document.createElement('div');
    div.className = `message ${isOwnMessage ? 'sent' : 'received'}${isDeleted ? ' deleted' : ''}${isStickerOrGif ? ' no-bubble' : ''}${isSystemMessage ? ' system-message' : ''}${isGameInvite ? ' game-invite-message' : ''}`;
    div.dataset.messageId = messageData.id;
    // Store timestamp in milliseconds for proper sorting
    // Use server timestamp if available, otherwise use current time as fallback
    let timestamp = 0;
    if (messageData.timestamp?.seconds) {
        timestamp = messageData.timestamp.seconds * 1000;
    } else if (messageData.timestamp instanceof Date) {
        timestamp = messageData.timestamp.getTime();
    } else {
        // Fallback to current time for messages that haven't been synced yet
        timestamp = Date.now();
    }
    div.dataset.timestamp = timestamp;

    let content = '';
    if (isSystemMessage) {
        content = `<span class="system-message-text">${escapeHtml(messageData.text || '')}</span>`;
    } else if (isDeleted) {
        content = `<span class="message-deleted-text">This message was deleted</span>`;
    } else if (isGameInvite) {
        // Game invite card
        const inviterName = messageData.invitedByName || 'Someone';
        const roomId = messageData.roomId;
        const gameType = messageData.gameType || 'tictactoe';
        
        // Determine game title and emoji
        let gameTitle = 'Tic-Tac-Toe';
        let gameEmoji = '⭕';
        if (gameType === 'rps') {
            gameTitle = 'Rock Paper Scissors';
            gameEmoji = '✂️';
        }
        
        content = `
            <div class="game-invite-card">
                <div class="game-invite-header">${gameEmoji} Game Invite</div>
                <div class="game-invite-text">${escapeHtml(inviterName)} challenged you to ${gameTitle}!</div>
                <button class="game-invite-btn" data-room-id="${roomId}" data-game-type="${gameType}">
                    Tap to Play
                </button>
            </div>
        `;
    } else if (isMediaMessage(messageData)) {
        const mediaClass = messageData.type === 'sticker' ? 'message-sticker' : 'message-image';
        const altLabel = getMediaAltText(messageData.type);
        content = `<img src="${messageData.imgUrl}" class="${mediaClass}" alt="${altLabel}">`;
    } else {
        content = `<span class="message-text">${formatMessageText(messageData.text || '')}</span>`;
    }

    let replyHtml = '';
    if (!isDeleted && messageData.replyTo && !isStickerOrGif) {
        const replyName = messageData.replyTo.senderName || 'Unknown';
        const replyText = messageData.replyTo.text || '[Image]';
        replyHtml = `
            <div class="message-reply-context" data-reply-to="${messageData.replyTo.messageId}">
                <div class="reply-context-name">${escapeHtml(replyName)}</div>
                <div class="reply-context-text">${escapeHtml(replyText)}</div>
            </div>
        `;
    }

    const editedLabel = !isDeleted && messageData.isEdited && !isStickerOrGif ? '<span class="message-edited">(edited)</span>' : '';
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

    // For system messages, render as centered text
    if (isSystemMessage) {
        div.innerHTML = `<div class="system-message-content">${content}</div>`;
    }
    // For stickers and GIFs, render with metadata wrapper
    else if (isStickerOrGif) {
        div.innerHTML = `
            <div class="media-message-wrapper">
                ${optionsTrigger}
                ${content}
                ${reactionsHtml}
                ${statusLabel}
            </div>
        `;
    } else {
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
    }

    if (!isDeleted) {
        const bubble = div.querySelector('.message-bubble');
        const mediaElement = div.querySelector('.message-sticker, .message-image');
        const targetElement = isStickerOrGif ? mediaElement : bubble;
        const isReceivedMessage = !isOwnMessage;

        // Apply theme colors to message bubble
        if (bubble && !isSystemMessage) {
            const theme = chatThemes.get(currentChatId) || getDefaultTheme();
            if (isOwnMessage) {
                bubble.style.backgroundColor = theme.sentBubbleColor;
            } else {
                bubble.style.backgroundColor = theme.receivedBubbleColor;
            }
        }

        if (targetElement) {
            if (isReceivedMessage) {
                targetElement.addEventListener('dblclick', (e) => {
                    showReactionPopup(e, messageData.id);
                });

                targetElement.addEventListener('touchstart', (e) => {
                    longPressTimer = setTimeout(() => {
                        showReactionPopup(e, messageData.id);
                    }, 500);
                });

                targetElement.addEventListener('touchend', () => {
                    clearTimeout(longPressTimer);
                });
            } else {
                // Show options menu for own messages (both text and media)
                targetElement.addEventListener('touchstart', (e) => {
                    longPressTimer = setTimeout(() => {
                        showMessageOptions(e.touches[0], messageData.id);
                    }, 500);
                });

                targetElement.addEventListener('touchend', () => {
                    clearTimeout(longPressTimer);
                });

                targetElement.addEventListener('touchmove', () => {
                    clearTimeout(longPressTimer);
                });
            }
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

        if (isMediaMessage(messageData) && messageData.imgUrl) {
            const mediaEl = div.querySelector('.message-image, .message-sticker');
            mediaEl?.addEventListener('click', () => openImageViewer(messageData.imgUrl));
        }

        // Handle game invite button click
        if (isGameInvite) {
            const gameInviteBtn = div.querySelector('.game-invite-btn');
            if (gameInviteBtn) {
                gameInviteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const roomId = gameInviteBtn.dataset.roomId;
                    const gameType = gameInviteBtn.dataset.gameType || 'tictactoe';
                    
                    if (roomId) {
                        // Determine which game file to use
                        const gameFile = gameType === 'rps' ? 'rps.html' : 'games.html';
                        window.location.href = `${gameFile}?roomId=${roomId}&mode=join&chatId=${currentChatId}`;
                    }
                });
            }
        }
    }

    return div;
}

function scrollToBottom(smooth = false) {
    if (!messagesContainer) return;
    
    // Use multiple requestAnimationFrames to ensure DOM is fully updated
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            try {
                if (smooth) {
                    messagesContainer.scrollTo({
                        top: messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                } else {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            } catch (error) {
                console.error('Error scrolling to bottom:', error);
            }
        });
    });
}

function appendMessage(messageData) {
    const messageEl = createMessageElement(messageData);
    // Use requestAnimationFrame to prevent layout thrashing
    requestAnimationFrame(() => {
        // Insert message in correct chronological order based on timestamp
        const existingMessages = messagesContainer.querySelectorAll('.message');
        let inserted = false;
        
        // Extract new message timestamp using same logic as createMessageElement
        let newTimestamp = 0;
        if (messageData.timestamp?.seconds) {
            newTimestamp = messageData.timestamp.seconds * 1000;
        } else if (messageData.timestamp instanceof Date) {
            newTimestamp = messageData.timestamp.getTime();
        } else {
            // Fallback to current time for messages that haven't been synced yet
            newTimestamp = Date.now();
        }
        
        for (let i = 0; i < existingMessages.length; i++) {
            const existingMsg = existingMessages[i];
            const existingTimestamp = parseInt(existingMsg.dataset.timestamp || '0');
            
            if (newTimestamp < existingTimestamp) {
                messagesContainer.insertBefore(messageEl, existingMsg);
                inserted = true;
                break;
            }
        }
        
        // If not inserted yet, append to end
        if (!inserted) {
            messagesContainer.appendChild(messageEl);
        }
        
        updateMessageStatusVisibility();
        // Auto-scroll to bottom when new message is added
        scrollToBottom(true);
    });
}

function updateMessage(messageId, messageData) {
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageEl) return;

    const isOwnMessage = messageData.senderId === currentUser.uid;
    const isDeleted = !!messageData.isDeleted;

    // If message is deleted or content changed significantly, replace entire element
    if (isDeleted || messageEl.classList.contains('deleted') !== isDeleted) {
        const mergedData = { id: messageId, ...messageData };
        const newEl = createMessageElement(mergedData);
        messagesContainer.replaceChild(newEl, messageEl);
        updateMessageStatusVisibility();
        return;
    }

    // Use requestAnimationFrame to batch DOM updates and prevent flickering
    requestAnimationFrame(() => {
        // Update message text if it changed
        const messageTextEl = messageEl.querySelector('.message-text');
        if (messageTextEl && messageData.text) {
            messageTextEl.innerHTML = formatMessageText(messageData.text);
        }

        // Update edited label
        const metaEl = messageEl.querySelector('.message-meta');
        if (messageData.isEdited && !metaEl) {
            const bubble = messageEl.querySelector('.message-bubble');
            const editedSpan = document.createElement('span');
            editedSpan.className = 'message-meta';
            editedSpan.innerHTML = '<span class="message-edited">(edited)</span>';
            const statusEl = bubble.querySelector('.message-status');
            if (statusEl) {
                bubble.insertBefore(editedSpan, statusEl);
            } else {
                bubble.appendChild(editedSpan);
            }
        }

        // Update status (for own messages)
        if (isOwnMessage) {
            const statusEl = messageEl.querySelector('.message-status');
            if (statusEl) {
                statusEl.textContent = getStatusText(messageData);
            }
        }

        // Update reactions
        const reactionsContainer = messageEl.querySelector('.message-reactions');
        if (messageData.reactions && messageData.reactions.length > 0) {
            const reactionCounts = {};
            messageData.reactions.forEach(r => {
                reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
            });
            let reactionsHtml = '';
            for (const [emoji, count] of Object.entries(reactionCounts)) {
                reactionsHtml += `<span class="reaction-badge">${emoji} ${count}</span>`;
            }

            if (reactionsContainer) {
                reactionsContainer.innerHTML = reactionsHtml;
            } else {
                const bubble = messageEl.querySelector('.message-bubble');
                const newReactionsDiv = document.createElement('div');
                newReactionsDiv.className = 'message-reactions';
                newReactionsDiv.innerHTML = reactionsHtml;
                bubble.appendChild(newReactionsDiv);
            }
        } else if (reactionsContainer) {
            reactionsContainer.remove();
        }

        updateMessageStatusVisibility();
    });
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

function getChatHeaderStatus(userData) {
    if (!userData) return 'offline';
    
    const lastActive = userData.lastActive?.toDate
        ? userData.lastActive.toDate()
        : userData.lastActive
            ? new Date(userData.lastActive)
            : null;
    
    // Check if user is currently online
    if (lastActive) {
        const isRecentlyActive = (Date.now() - lastActive.getTime()) < PRESENCE_TIMEOUT;
        if (isRecentlyActive) {
            return 'Online';
        }
    } else if (userData.status === 'online') {
        return 'Online';
    }
    
    // User is offline - show relative time
    if (lastActive) {
        const now = new Date();
        const diff = now - lastActive;
        
        if (diff < 60000) return 'Active just now';
        if (diff < 3600000) return `Active ${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Active ${hours}h ago`;
        }
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return days === 1 ? 'Active yesterday' : `Active ${days}d ago`;
        }
        // For older timestamps, show the date
        return `Active ${lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    
    return 'offline';
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

// ===========================
// Window Focus/Blur Events (Tab Active/Inactive)
// ===========================
window.addEventListener('focus', () => {
    if (!currentUser) return;
    // User focused on tab - set online
    startPresenceTracking();
});

window.addEventListener('blur', () => {
    if (!currentUser) return;
    // User switched away from tab - set offline immediately
    stopPresenceTracking();
    updateUserPresence('offline');
});

// ===========================
// Document Visibility Change (Tab Hidden/Visible)
// ===========================
document.addEventListener('visibilitychange', () => {
    if (!currentUser) return;
    if (document.visibilityState === 'hidden') {
        // Tab is hidden - set offline
        stopPresenceTracking();
        updateUserPresence('offline');
    } else {
        // Tab is visible - set online
        startPresenceTracking();
    }
});

// ===========================
// Page Unload (Tab Closed)
// ===========================
window.addEventListener('beforeunload', () => {
    if (!currentUser) return;
    // User closing tab - set offline
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
    }, (error) => {
        // Suppress permission errors during logout
        if (error.code === 'permission-denied') {
            console.debug('Permission denied (expected during logout)');
        } else {
            console.error('Error listening to current user:', error);
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

        // Detect media type
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

        // Upload with progress tracking
        const mediaUrl = await uploadImageToCloudinary(file, (progress) => {
            updateStoryUploadProgress(progress);
        });

        const authorName = currentUserData?.displayName || currentUser?.email || 'You';
        const authorAvatar = currentUserData?.photoURL || '';

        await addDoc(collection(db, 'stories'), {
            userId: currentUser.uid,
            mediaUrl,
            mediaType,
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
        hideStoryUploadProgress();
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
        showStoryUploadProgress();
    } else {
        addStoryBtn.classList.remove('uploading');
        if (label) label.textContent = 'Add story';
    }
}

function showStoryUploadProgress() {
    const progressEl = document.getElementById('story-upload-progress');
    if (progressEl) {
        progressEl.classList.remove('hidden');
        const fill = progressEl.querySelector('.progress-bar-fill');
        const text = progressEl.querySelector('.progress-text');
        if (fill) fill.style.width = '0%';
        if (text) text.textContent = '0%';
    }
}

function updateStoryUploadProgress(percent) {
    const progressEl = document.getElementById('story-upload-progress');
    if (progressEl) {
        const fill = progressEl.querySelector('.progress-bar-fill');
        const text = progressEl.querySelector('.progress-text');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = `${Math.round(percent)}%`;
    }
}

function hideStoryUploadProgress() {
    const progressEl = document.getElementById('story-upload-progress');
    if (progressEl) {
        progressEl.classList.add('hidden');
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
    }, (error) => {
        // Suppress permission errors during logout
        if (error.code === 'permission-denied') {
            console.debug('Permission denied (expected during logout)');
        } else {
            console.error('Error subscribing to stories:', error);
        }
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

    // Convert Map to array and sort by latest story timestamp
    const sortedUsers = Array.from(storiesByUser.entries()).sort((a, b) => {
        const storiesA = a[1];
        const storiesB = b[1];

        // Sort stories DESCENDING (latest first)
        storiesA.sort((s1, s2) => s2.createdAt - s1.createdAt);
        storiesB.sort((s1, s2) => s2.createdAt - s1.createdAt);

        const latestA = storiesA[0]; // First item is now the latest
        const latestB = storiesB[0];

        // Sort users by latest story timestamp (descending)
        // Handle potential missing createdAt (though filtered in subscribeToStories)
        const timeA = latestA?.createdAt?.getTime() || 0;
        const timeB = latestB?.createdAt?.getTime() || 0;

        return timeB - timeA;
    });

    sortedUsers.forEach(([userId, storyArr]) => {
        const latestStory = storyArr[0]; // First item is now the latest
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

    // Render appropriate media element
    if (storyViewerMediaContainer) {
        const mediaType = story.mediaType || 'image'; // Default to image for old stories
        storyViewerMediaContainer.innerHTML = '';

        if (mediaType === 'video') {
            const video = document.createElement('video');
            video.src = story.mediaUrl;
            video.className = 'story-viewer-media';
            video.autoplay = true;
            video.loop = false;
            video.muted = false;
            video.controls = false;
            video.playsInline = true;

            // Handle video end event - auto-advance when video finishes
            video.addEventListener('ended', () => {
                stopStoryProgress();
                navigateStory(1);
            });

            storyViewerMediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = story.mediaUrl;
            img.alt = 'Story';
            img.className = 'story-viewer-media';
            storyViewerMediaContainer.appendChild(img);
        }
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

    // For videos, wait for metadata to load before starting progress
    const mediaElement = storyViewerMediaContainer?.querySelector('video, img');
    if (mediaElement && mediaElement.tagName === 'VIDEO') {
        if (mediaElement.readyState >= 1) {
            // Metadata already loaded
            startStoryProgress();
        } else {
            // Wait for metadata to load
            mediaElement.addEventListener('loadedmetadata', () => {
                startStoryProgress();
            }, { once: true });
        }
    } else {
        // For images, start immediately
        startStoryProgress();
    }
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

    const mediaElement = storyViewerMediaContainer?.querySelector('video, img');

    // For videos, use video duration; for images, use fixed duration
    let duration = STORY_AUTO_ADVANCE_MS;

    if (mediaElement && mediaElement.tagName === 'VIDEO') {
        const videoDuration = mediaElement.duration;
        if (videoDuration && !isNaN(videoDuration) && isFinite(videoDuration)) {
            duration = videoDuration * 1000; // Convert to milliseconds
        }
    }

    storyProgressStart = performance.now();
    storyProgressDuration = duration;
    storyProgressFillEl.style.width = '0%';
    storyProgressRaf = requestAnimationFrame(updateStoryProgressFrame);
}

function updateStoryProgressFrame(timestamp) {
    if (!storyProgressFillEl || storyViewer?.classList.contains('hidden')) {
        stopStoryProgress();
        return;
    }
    const elapsed = timestamp - (storyProgressStart || timestamp);
    const progress = Math.min(1, elapsed / storyProgressDuration);
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

function openDeleteAccountModal() {
    deleteEmailInput.value = '';
    deleteEmailError.classList.add('hidden');
    deleteEmailError.textContent = '';
    deleteAccountModal.classList.remove('hidden');
}

function closeDeleteAccountModal() {
    deleteAccountModal.classList.add('hidden');
    deleteEmailInput.value = '';
    deleteEmailError.classList.add('hidden');
}

async function confirmDeleteAccount() {
    if (!currentUser) return;

    const enteredEmail = deleteEmailInput.value.trim();
    const userEmail = currentUser.email;

    if (!enteredEmail) {
        deleteEmailError.textContent = 'Please enter your email';
        deleteEmailError.classList.remove('hidden');
        return;
    }

    if (enteredEmail !== userEmail) {
        deleteEmailError.textContent = 'Email does not match';
        deleteEmailError.classList.remove('hidden');
        return;
    }

    try {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Deleting...';
        showLoading('Deleting account...');
        const userId = currentUser.uid;

        // Delete all user's chats and messages
        const chatsSnapshot = await getDocs(collection(db, 'chats'));
        for (const chatDoc of chatsSnapshot.docs) {
            const chatData = chatDoc.data();
            // Only delete chats where user is a participant
            if (chatData.participants && chatData.participants.includes(userId)) {
                // Delete all messages in this chat
                const messagesSnapshot = await getDocs(collection(db, 'chats', chatDoc.id, 'messages'));
                for (const messageDoc of messagesSnapshot.docs) {
                    await deleteDoc(doc(db, 'chats', chatDoc.id, 'messages', messageDoc.id));
                }
                // Delete the chat document
                await deleteDoc(doc(db, 'chats', chatDoc.id));
            }
        }

        // Delete all user's stories
        const storiesSnapshot = await getDocs(collection(db, 'stories'));
        for (const storyDoc of storiesSnapshot.docs) {
            const storyData = storyDoc.data();
            if (storyData.userId === userId) {
                await deleteDoc(doc(db, 'stories', storyDoc.id));
            }
        }

        // Delete user profile
        await deleteDoc(doc(db, 'users', userId));

        // Delete Firebase Auth account
        await currentUser.delete();

        // Sign out
        await signOut(auth);

        hideLoading();
        closeDeleteAccountModal();
        alert('Your account has been permanently deleted.');

        // Redirect to calculator view
        chatApp.classList.add('hidden');
        calculatorView.classList.remove('hidden');
        currentValue = '0';
        updateDisplay(currentValue);
    } catch (error) {
        hideLoading();
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Delete My Account';
        console.error('Error deleting account:', error);
        if (error.code === 'auth/requires-recent-login') {
            deleteEmailError.textContent = 'For security, please log out and log back in before deleting.';
        } else {
            deleteEmailError.textContent = 'Error: ' + error.message;
        }
        deleteEmailError.classList.remove('hidden');
    }
}

// ===========================
// Nickname System
// ===========================
function openChatSettingsModal() {
    if (!chatSettingsModal || !currentChatUser) return;

    // Load current nickname if exists
    const nickname = userNicknames.get(currentChatUser.uid) || '';
    nicknameInput.value = nickname;

    // Load current theme if exists
    const theme = chatThemes.get(currentChatId) || getDefaultTheme();
    sentBubbleColorInput.value = theme.sentBubbleColor;
    receivedBubbleColorInput.value = theme.receivedBubbleColor;
    bgColorInput.value = theme.bgColor;

    chatSettingsModal.classList.remove('hidden');
}

function closeChatSettingsModal() {
    if (!chatSettingsModal) return;
    chatSettingsModal.classList.add('hidden');
    nicknameInput.value = '';
}

async function saveNickname() {
    if (!currentChatUser || !currentUser) return;

    const newNickname = nicknameInput.value.trim();
    const oldNickname = userNicknames.get(currentChatUser.uid) || currentChatUser.displayName;

    if (!newNickname) {
        alert('Please enter a nickname');
        return;
    }

    if (newNickname === oldNickname) {
        closeChatSettingsModal();
        return;
    }

    try {
        // Update local map
        userNicknames.set(currentChatUser.uid, newNickname);

        // Save to localStorage for persistence
        const nicknamesData = JSON.stringify(Array.from(userNicknames.entries()));
        localStorage.setItem(`nicknames_${currentUser.uid}`, nicknamesData);

        // Update chat header to show new nickname
        const chatUserNameEl = document.getElementById('chat-user-name');
        if (chatUserNameEl) {
            chatUserNameEl.textContent = newNickname;
        }

        // Update user list to show new nickname
        const userItemEl = document.querySelector(`.user-item[data-user-id="${currentChatUser.uid}"]`);
        if (userItemEl) {
            const userNameEl = userItemEl.querySelector('.user-name');
            if (userNameEl) {
                userNameEl.textContent = newNickname;
            }
        }

        // Send system message
        const senderName = currentUserData?.displayName || currentUser.displayName || 'User';
        await addSystemMessage(`${senderName} set your nickname to ${newNickname}`);

        closeChatSettingsModal();
    } catch (error) {
        console.error('Error saving nickname:', error);
        alert('Failed to save nickname');
    }
}

async function removeNickname() {
    if (!currentChatUser || !currentUser) return;

    try {
        // Remove from local map
        userNicknames.delete(currentChatUser.uid);

        // Save to localStorage
        const nicknamesData = JSON.stringify(Array.from(userNicknames.entries()));
        localStorage.setItem(`nicknames_${currentUser.uid}`, nicknamesData);

        // Update chat header to show original name
        const chatUserNameEl = document.getElementById('chat-user-name');
        if (chatUserNameEl) {
            chatUserNameEl.textContent = currentChatUser.displayName;
        }

        // Update user list to show original name
        const userItemEl = document.querySelector(`.user-item[data-user-id="${currentChatUser.uid}"]`);
        if (userItemEl) {
            const userNameEl = userItemEl.querySelector('.user-name');
            if (userNameEl) {
                userNameEl.textContent = currentChatUser.displayName;
            }
        }

        // Send system message
        const senderName = currentUserData?.displayName || currentUser.displayName || 'User';
        await addSystemMessage(`${senderName} removed your nickname`);

        closeChatSettingsModal();
    } catch (error) {
        console.error('Error removing nickname:', error);
        alert('Failed to remove nickname');
    }
}

async function addSystemMessage(text) {
    if (!currentChatId || !currentUser) return;

    try {
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        await addDoc(messagesRef, {
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            timestamp: serverTimestamp(),
            type: 'system',
            seen: false,
            reactions: [],
            replyTo: null,
            isEdited: false,
            isDeleted: false
        });
    } catch (error) {
        console.error('Error adding system message:', error);
    }
}

// ===========================
// Chat Theme System
// ===========================
function getDefaultTheme() {
    return {
        sentBubbleColor: '#0084ff',      // Blue - white text
        receivedBubbleColor: '#2a2a2a',  // Dark gray - white text
        bgColor: '#050505',              // Much darker background
        bgImage: null,
        bgImageOverlay: true
    };
}

function handleBgImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target?.result;
        if (imageData && typeof imageData === 'string') {
            // Store the image data URL temporarily
            const theme = chatThemes.get(currentChatId) || getDefaultTheme();
            theme.bgImage = imageData;
            chatThemes.set(currentChatId, theme);
        }
    };
    reader.readAsDataURL(file);
}

function removeBgImage() {
    const theme = chatThemes.get(currentChatId) || getDefaultTheme();
    theme.bgImage = null;
    chatThemes.set(currentChatId, theme);
    bgImageInput.value = '';
}

async function applyTheme() {
    if (!currentChatId) return;

    try {
        const theme = {
            sentBubbleColor: sentBubbleColorInput.value,
            receivedBubbleColor: receivedBubbleColorInput.value,
            bgColor: bgColorInput.value,
            bgImage: chatThemes.get(currentChatId)?.bgImage || null,
            bgImageOverlay: true,
            updatedBy: currentUser.uid,
            updatedAt: serverTimestamp()
        };

        // Save to local map
        chatThemes.set(currentChatId, theme);

        // Save to localStorage
        const themesData = JSON.stringify(Array.from(chatThemes.entries()));
        localStorage.setItem(`themes_${currentUser.uid}`, themesData);

        // Save to Firestore so other user can see the theme
        const themeRef = doc(db, 'chats', currentChatId, 'metadata', 'theme');
        await setDoc(themeRef, theme, { merge: true });

        // Apply theme to chat
        applyThemeToChat(theme);

        closeChatSettingsModal();
    } catch (error) {
        console.error('Error applying theme:', error);
        alert('Failed to apply theme');
    }
}

async function resetTheme() {
    const defaultTheme = getDefaultTheme();
    sentBubbleColorInput.value = defaultTheme.sentBubbleColor;
    receivedBubbleColorInput.value = defaultTheme.receivedBubbleColor;
    bgColorInput.value = defaultTheme.bgColor;
    bgImageInput.value = '';

    // Remove from map and localStorage
    chatThemes.delete(currentChatId);
    const themesData = JSON.stringify(Array.from(chatThemes.entries()));
    localStorage.setItem(`themes_${currentUser.uid}`, themesData);

    // Delete theme from Firestore so other user also sees default
    try {
        const themeRef = doc(db, 'chats', currentChatId, 'metadata', 'theme');
        await deleteDoc(themeRef);
    } catch (error) {
        console.error('Error deleting theme from Firestore:', error);
    }

    // Apply default theme
    applyThemeToChat(defaultTheme);
}

function showClearChatConfirmation() {
    if (!currentChatId) return;
    // Show custom confirmation modal
    clearChatConfirmationModal.classList.remove('hidden');
}

function closeClearChatConfirmation() {
    clearChatConfirmationModal.classList.add('hidden');
}

async function confirmClearAllChats() {
    if (!currentChatId) return;

    try {
        // Close confirmation modal
        closeClearChatConfirmation();

        // Show loading state
        clearAllChatsBtn.disabled = true;
        clearAllChatsBtn.textContent = 'Clearing...';

        // Get all messages in the chat
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        const snapshot = await getDocs(messagesRef);

        // Delete each message
        let deletedCount = 0;
        for (const doc of snapshot.docs) {
            await deleteDoc(doc.ref);
            deletedCount++;
        }

        console.log(`Deleted ${deletedCount} messages from chat ${currentChatId}`);

        // Clear local messages container
        messagesContainer.innerHTML = '';

        // Show success notification in UI
        showNotification(`✅ Successfully deleted ${deletedCount} messages from the database!`, 3000);

        // Close settings modal after a short delay
        setTimeout(() => {
            closeChatSettingsModal();
        }, 500);
    } catch (error) {
        console.error('Error clearing chats:', error);
        showNotification('❌ Failed to clear messages. Please try again.', 3000);
    } finally {
        clearAllChatsBtn.disabled = false;
        clearAllChatsBtn.textContent = 'Clear All Messages';
    }
}

function applyThemeToChat(theme) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    // Apply background
    if (theme.bgImage) {
        messagesContainer.style.backgroundImage = `url(${theme.bgImage})`;
        messagesContainer.style.backgroundSize = 'cover';
        messagesContainer.style.backgroundPosition = 'center';
        messagesContainer.style.backgroundAttachment = 'fixed';

        // Apply semi-transparent overlay for readability
        if (theme.bgImageOverlay) {
            messagesContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            messagesContainer.style.backgroundBlendMode = 'multiply';
        }
    } else {
        messagesContainer.style.backgroundImage = 'none';
        messagesContainer.style.backgroundColor = theme.bgColor;
        messagesContainer.style.backgroundBlendMode = 'normal';
    }

    // Apply bubble colors to all messages
    const sentMessages = messagesContainer.querySelectorAll('.message.sent .message-bubble');
    const receivedMessages = messagesContainer.querySelectorAll('.message.received .message-bubble');

    sentMessages.forEach(msg => {
        msg.style.backgroundColor = theme.sentBubbleColor;
    });

    receivedMessages.forEach(msg => {
        msg.style.backgroundColor = theme.receivedBubbleColor;
    });
}

let unsubscribeTheme = null;

function loadThemeForChat() {
    if (!currentChatId) return;

    // First, apply locally cached theme
    const cachedTheme = chatThemes.get(currentChatId);
    if (cachedTheme) {
        applyThemeToChat(cachedTheme);
    } else {
        applyThemeToChat(getDefaultTheme());
    }

    // Listen for real-time theme changes from Firestore
    if (unsubscribeTheme) {
        unsubscribeTheme();
    }

    try {
        const themeRef = doc(db, 'chats', currentChatId, 'metadata', 'theme');
        unsubscribeTheme = onSnapshot(themeRef, (doc) => {
            if (doc.exists()) {
                const themeData = doc.data();
                console.log('Theme updated from Firestore:', themeData);
                
                // Update local cache
                chatThemes.set(currentChatId, themeData);
                
                // Apply the theme immediately
                applyThemeToChat(themeData);
            } else {
                // No theme set, use default
                const defaultTheme = getDefaultTheme();
                chatThemes.delete(currentChatId);
                applyThemeToChat(defaultTheme);
            }
        }, (error) => {
            console.error('Error listening to theme changes:', error);
        });
    } catch (error) {
        console.error('Error setting up theme listener:', error);
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

function isMediaMessage(messageData) {
    if (!messageData || !messageData.imgUrl) return false;
    return ['image', 'gif', 'sticker'].includes(messageData.type);
}

function getMediaAltText(type) {
    switch (type) {
        case 'gif':
            return 'GIF';
        case 'sticker':
            return 'Sticker';
        default:
            return 'Image';
    }
}

function createEmojiStickerDataUrl(emoji) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
            <rect width="100%" height="100%" rx="60" fill="#ffffff" fill-opacity="0.08"/>
            <text x="50%" y="55%" font-size="200" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
        </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ===========================
// Mobile Keyboard Detection
// ===========================
// Detect when keyboard appears on mobile and scroll to bottom
if (messageInput) {
    messageInput.addEventListener('focus', () => {
        // Scroll to bottom when input is focused (keyboard appears)
        setTimeout(() => {
            scrollToBottom(false);
        }, 300); // Wait for keyboard animation
    });

    messageInput.addEventListener('input', () => {
        // Only scroll when typing a new message, not when editing
        if (!editingMessageId) {
            scrollToBottom(false);
        }
    });
}

// Listen for window resize (keyboard show/hide on mobile)
let lastWindowHeight = window.innerHeight;
window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    // If height decreased, keyboard is showing
    if (currentHeight < lastWindowHeight) {
        setTimeout(() => {
            scrollToBottom(false);
        }, 100);
    }
    lastWindowHeight = currentHeight;
});

// ===========================
// Mobile Keyboard Persistence
// ===========================
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function focusInputAndKeepKeyboard() {
    if (isMobileDevice()) {
        // Don't blur - just keep focus on the input
        // This prevents the keyboard from closing
        messageInput.focus();
        
        // Scroll input into view with a slight delay to ensure keyboard is visible
        setTimeout(() => {
            messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
    }
}

// ===========================
// Send Message
// ===========================
sendBtn.addEventListener('click', sendMessage);

// Allow Enter key for new lines (no send on Enter)
messageInput.addEventListener('keypress', (e) => {
    // Just allow normal Enter behavior for new lines
    // Users must click send button to send message
});

// Prevent keyboard from closing on mobile
if (isMobileDevice()) {
    messageInput.addEventListener('blur', (e) => {
        // Only allow blur if user explicitly taps outside
        // Check if the blur is from sending message or other UI interaction
        if (document.activeElement !== messageInput) {
            // User tapped outside, allow blur
            return;
        }
    });
}

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
            messageInput.style.height = 'auto';
            cancelEdit();
            updateTypingStatus(false);
            
            // Keep keyboard open on mobile
            focusInputAndKeepKeyboard();
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

        await addDoc(messagesRef, applyReplyContext(messageData));

        messageInput.value = '';
        messageInput.style.height = 'auto';
        cancelReply();
        updateTypingStatus(false);
        
        // Update streak on message send
        await updateStreakOnMessage(currentChatId, currentUser.uid);
        
        // Keep keyboard open on mobile after sending
        focusInputAndKeepKeyboard();
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function applyReplyContext(messageData) {
    if (replyingToMessage && messageData) {
        messageData.replyTo = {
            messageId: replyingToMessage.id,
            senderId: replyingToMessage.senderId,
            senderName: replyingToMessage.senderName || 'Unknown',
            text: getMessagePreviewText(replyingToMessage)
        };
    }
    return messageData;
}

async function sendMediaMessage(mediaUrl, messageType) {
    if (!currentChatId || !mediaUrl || !currentUser) return;
    const messagesRef = collection(db, 'chats', currentChatId, 'messages');
    const payload = applyReplyContext({
        imgUrl: mediaUrl,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        type: messageType,
        seen: false,
        reactions: [],
        isDeleted: false
    });
    await addDoc(messagesRef, payload);
    if (replyingToMessage) {
        cancelReply();
    }
    updateTypingStatus(false);
    // Auto-scroll to bottom when media message is sent
    scrollToBottom(true);
}

// ===========================
// Streak System (Custom Logic)
// ===========================
/**
 * Streak Logic:
 * - Increases by 1 when BOTH users message each other within a cycle
 * - Does NOT reset to 0 if users miss a day - it pauses and resumes when they message again
 * - Tracks: count, lastMessageDate, lastMessageFrom
 */

async function loadStreakData(chatId) {
    try {
        const streakRef = doc(db, 'chats', chatId, 'metadata', 'streak');
        const streakDoc = await getDoc(streakRef);
        
        if (streakDoc.exists()) {
            const data = streakDoc.data();
            streakData.set(chatId, {
                count: data.count || 0,
                lastMessageDate: data.lastMessageDate,
                lastMessageFrom: data.lastMessageFrom,
                lastBothMessagedDate: data.lastBothMessagedDate
            });
            console.log('Loaded streak for', chatId, ':', data);
        } else {
            // Initialize streak document if it doesn't exist
            const initialStreak = {
                count: 0,
                lastMessageDate: null,
                lastMessageFrom: null,
                lastBothMessagedDate: null,
                createdAt: serverTimestamp()
            };
            await setDoc(streakRef, initialStreak, { merge: true });
            streakData.set(chatId, initialStreak);
            console.log('Initialized new streak for', chatId);
        }
    } catch (error) {
        console.error('Error loading streak data:', error);
        streakData.set(chatId, {
            count: 0,
            lastMessageDate: null,
            lastMessageFrom: null,
            lastBothMessagedDate: null
        });
    }
}

async function updateStreakOnMessage(chatId, senderId) {
    if (!chatId || !senderId || !currentUser) return;

    try {
        const streakRef = doc(db, 'chats', chatId, 'metadata', 'streak');
        const today = new Date().toDateString();
        
        // Get current streak from Firestore (fresh data)
        const streakDoc = await getDoc(streakRef);
        let currentStreak = streakDoc.exists() ? streakDoc.data() : {
            count: 0,
            lastMessageDate: null,
            lastMessageFrom: null,
            lastBothMessagedDate: null
        };

        const lastMessageDate = currentStreak.lastMessageDate ? new Date(currentStreak.lastMessageDate).toDateString() : null;
        const lastBothMessagedDate = currentStreak.lastBothMessagedDate ? new Date(currentStreak.lastBothMessagedDate).toDateString() : null;
        const lastMessageFrom = currentStreak.lastMessageFrom;

        let newCount = currentStreak.count || 0;
        let newBothMessagedDate = lastBothMessagedDate;

        console.log('Streak Debug:', {
            today,
            lastMessageDate,
            lastBothMessagedDate,
            lastMessageFrom,
            currentSenderId: senderId,
            isDifferentSender: lastMessageFrom !== senderId,
            bothMessagedToday: lastMessageDate === today && lastMessageFrom !== senderId
        });

        // If both users messaged today (different senders), increment streak
        if (lastMessageDate === today && lastMessageFrom && lastMessageFrom !== senderId && lastBothMessagedDate !== today) {
            newCount = (currentStreak.count || 0) + 1;
            newBothMessagedDate = today;
            console.log('Streak incremented to:', newCount);
        }

        // Update streak data
        const updatedStreak = {
            count: newCount,
            lastMessageDate: today,
            lastMessageFrom: senderId,
            lastBothMessagedDate: newBothMessagedDate,
            updatedAt: serverTimestamp()
        };

        await setDoc(streakRef, updatedStreak, { merge: true });
        streakData.set(chatId, updatedStreak);
        updateStreakDisplay(chatId);
    } catch (error) {
        console.error('Error updating streak:', error);
    }
}

function updateStreakDisplay(chatId) {
    if (chatId !== currentChatId || !streakBadge || !streakCount) return;

    const streak = streakData.get(chatId);
    if (!streak || streak.count === 0) {
        streakBadge.classList.add('hidden');
    } else {
        streakBadge.classList.remove('hidden');
        streakCount.textContent = streak.count;
    }
}

// ===========================
// Game Invites
// ===========================
function generateGameRoomId() {
    return 'game_' + Math.random().toString(36).substr(2, 9);
}

async function handleGameInvite(gameType = 'tictactoe') {
    if (!currentChatId || !currentChatUser) {
        alert('Please select a user to challenge');
        return;
    }

    try {
        showLoading('Creating game invite...');
        
        // Generate unique room ID
        const roomId = generateGameRoomId();
        
        // Determine game details
        let gameTitle = 'Tic-Tac-Toe';
        let gameFile = 'games.html';
        let gameEmoji = '⭕';
        
        if (gameType === 'rps') {
            gameTitle = 'Rock Paper Scissors';
            gameFile = 'rps.html';
            gameEmoji = '✂️';
        }
        
        // Create game invite message
        const gameInviteMessage = {
            text: `${gameEmoji} ${currentUserData?.displayName || 'Someone'} challenged you to ${gameTitle}!`,
            type: 'game_invite',
            roomId: roomId,
            gameType: gameType,
            invitedBy: currentUser.uid,
            invitedByName: currentUserData?.displayName || 'Unknown',
            invitedByAvatar: currentUserData?.photoURL || '',
            timestamp: serverTimestamp()
        };

        // Send the invite message
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), gameInviteMessage);

        // Redirect host to game page
        setTimeout(() => {
            window.location.href = `${gameFile}?roomId=${roomId}&mode=host&chatId=${currentChatId}`;
        }, 500);

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error creating game invite:', error);
        alert('Failed to create game invite. Please try again.');
    }
}

// ===========================
// Media Menu
// ===========================
if (mediaMenuBtn) {
    mediaMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mediaMenu) {
            mediaMenu.classList.toggle('hidden');
        }
    });
}

// Close media menu when clicking outside
document.addEventListener('click', (e) => {
    if (mediaMenu && !mediaMenu.contains(e.target) && e.target !== mediaMenuBtn) {
        mediaMenu.classList.add('hidden');
    }
});

// Handle media menu item clicks
if (mediaMenu) {
    mediaMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.media-menu-item');
        if (!menuItem) return;

        const action = menuItem.dataset.action;
        mediaMenu.classList.add('hidden');

        if (action === 'image') {
            imageInput.click();
        } else if (action === 'gif') {
            console.log('Opening GIF modal...');
            openGifModal();
        } else if (action === 'sticker') {
            openStickerSheet();
        } else if (action === 'game-tictactoe') {
            handleGameInvite('tictactoe');
        } else if (action === 'game-rps') {
            handleGameInvite('rps');
        }
    });
}

// ===========================
// Image Upload (Cloudinary)
// ===========================

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;

    try {
        // Create temporary message with progress bar
        const tempMessageId = `temp-${Date.now()}`;
        const tempMessageDiv = document.createElement('div');
        tempMessageDiv.className = 'message sent uploading';
        tempMessageDiv.dataset.messageId = tempMessageId;
        tempMessageDiv.innerHTML = `
            <div class="message-bubble uploading">
                <img src="${URL.createObjectURL(file)}" class="message-image" alt="Uploading..." style="opacity: 0.5;">
                <div class="message-upload-progress">
                    <div class="message-upload-progress-fill"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(tempMessageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Upload with progress tracking
        const secureUrl = await uploadImageToCloudinary(file, (progress) => {
            const progressFill = tempMessageDiv.querySelector('.message-upload-progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
        });

        if (secureUrl) {
            // Remove temporary message
            tempMessageDiv.remove();
            // Send actual message
            await sendMediaMessage(secureUrl, 'image');
        }
        imageInput.value = '';
    } catch (error) {
        console.error('Error uploading image:', error);
        // Remove temporary message on error
        const tempMsg = messagesContainer.querySelector(`[data-message-id^="temp-"]`);
        if (tempMsg) tempMsg.remove();
        alert('Failed to upload image. Please check your Cloudinary configuration.');
    }
});

// ===========================
// GIF Picker (Tenor)
// ===========================
function openGifModal() {
    if (!gifModal) {
        console.error('GIF modal element not found');
        return;
    }
    gifModal.classList.remove('hidden');
    gifSearchInput?.focus();

    // Reset pagination when opening modal
    if (!gifInitialLoadDone) {
        gifCurrentOffset = 0;
        gifCurrentQuery = '';
        gifHasMore = true;
        fetchGifResults('', 0, true);
        gifInitialLoadDone = true;
    }
}

function closeGifModal() {
    if (!gifModal) return;
    gifModal.classList.add('hidden');
    if (gifAbortController) {
        gifAbortController.abort();
        gifAbortController = null;
    }
    // Reset pagination when closing
    gifCurrentOffset = 0;
    gifCurrentQuery = '';
    gifHasMore = true;
}

function handleGifScroll() {
    if (!gifResultsEl || gifLoadingMore || !gifHasMore) return;

    const scrollTop = gifResultsEl.scrollTop;
    const scrollHeight = gifResultsEl.scrollHeight;
    const clientHeight = gifResultsEl.clientHeight;

    // Load more when user is within 200px of bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
        console.log('Loading more GIFs...', 'offset:', gifCurrentOffset);
        fetchGifResults(gifCurrentQuery, gifCurrentOffset, false);
    }
}

function handleGifSearchInput(event) {
    const query = event.target.value.trim();
    if (gifSearchTimeout) {
        clearTimeout(gifSearchTimeout);
    }
    gifSearchTimeout = setTimeout(() => {
        // Reset pagination for new search
        if (query !== gifCurrentQuery) {
            gifCurrentOffset = 0;
            gifCurrentQuery = query;
            gifHasMore = true;
            if (gifResultsEl) {
                gifResultsEl.innerHTML = '';
            }
        }
        fetchGifResults(query, 0, true);
    }, 350);
}

async function fetchGifResults(query = '', offset = 0, reset = false) {
    if (!gifResultsEl) return;

    // Don't load if already loading or no more results
    if (gifLoadingMore || (!gifHasMore && !reset)) return;

    gifLoadingMore = true;

    if (reset) {
        setGifLoading(true);
        gifEmptyState?.classList.add('hidden');
        if (offset === 0) {
            gifResultsEl.innerHTML = '';
        }
    }

    if (gifAbortController) {
        gifAbortController.abort();
    }
    gifAbortController = new AbortController();

    // Use Giphy API
    const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        limit: GIPHY_RESULT_LIMIT.toString(),
        rating: 'g', // General audience
        lang: 'en',
        offset: offset.toString()
    });

    let endpoint = 'trending';
    if (query) {
        params.set('q', query);
        endpoint = 'search';
    }

    try {
        const url = `https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`;
        console.log('Fetching GIFs from:', url, 'offset:', offset);
        const response = await fetch(url, {
            signal: gifAbortController.signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Giphy API error:', response.status, errorText);
            throw new Error(`Giphy API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('GIF data received:', data);

        if (!data || !data.data) {
            console.warn('Unexpected API response format:', data);
            if (reset) {
                showGifEmptyState('Unexpected response from GIF service. Please try again.');
            }
            return;
        }

        const results = data.data || [];
        const pagination = data.pagination || {};

        // Check if there are more results
        const totalCount = pagination.total_count;
        const currentCount = offset + results.length;

        // If we got a full page of results, assume there might be more
        // If total_count is available, use it; otherwise assume more if we got full results
        if (totalCount !== undefined && totalCount !== null) {
            gifHasMore = currentCount < totalCount && results.length > 0;
        } else {
            // For trending or when total_count is not available, assume more if we got full results
            gifHasMore = results.length >= GIPHY_RESULT_LIMIT;
        }

        // Update offset
        gifCurrentOffset = offset + results.length;

        renderGifResults(results, query, reset);
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching GIFs:', error);
        if (reset) {
            const errorMessage = error.message || 'Unable to load GIFs right now. Please try again.';
            showGifEmptyState(errorMessage);
        }
    } finally {
        if (reset) {
            setGifLoading(false);
        }
        gifLoadingMore = false;
        gifAbortController = null;
    }
}

function setGifLoading(isLoading) {
    if (!gifLoadingEl) return;
    gifLoadingEl.classList.toggle('hidden', !isLoading);
}

function renderGifResults(results, query, reset = true) {
    if (!gifResultsEl) {
        console.error('GIF results element not found');
        return;
    }

    // Only clear if resetting (new search or initial load)
    if (reset) {
        gifResultsEl.innerHTML = '';
    }

    if (!results || !Array.isArray(results) || results.length === 0) {
        if (reset) {
            showGifEmptyState(query ? 'No GIFs match that vibe. Try a new word.' : 'Nothing trending right now. Try searching!');
        }
        return;
    }

    gifEmptyState?.classList.add('hidden');
    let renderedCount = 0;

    results.forEach((gif) => {
        try {
            // Giphy API format: gif.images.downsized_medium.url (for sending) and gif.images.fixed_height_small.url (for preview)
            const images = gif.images || {};
            const previewUrl = images.fixed_height_small?.url || images.downsized_small?.url || images.preview_gif?.url;
            const sendUrl = images.downsized_medium?.url || images.original?.url || images.fixed_height?.url;

            if (!previewUrl || !sendUrl) {
                console.warn('GIF result missing URLs:', gif);
                return;
            }

            const card = document.createElement('div');
            card.className = 'gif-card';
            const img = document.createElement('img');
            img.src = previewUrl;
            img.alt = gif.title || gif.slug || 'GIF';
            img.loading = 'lazy';
            img.onerror = () => {
                console.warn('Failed to load GIF preview:', previewUrl);
                card.style.display = 'none';
            };
            card.appendChild(img);
            card.addEventListener('click', () => {
                console.log('GIF selected:', sendUrl);
                handleGifSelect(sendUrl);
            });
            gifResultsEl.appendChild(card);
            renderedCount++;
        } catch (error) {
            console.error('Error rendering GIF card:', error, gif);
        }
    });

    if (renderedCount === 0 && reset) {
        showGifEmptyState('Could not load GIF previews. Please try again.');
    } else if (renderedCount > 0) {
        console.log(`Rendered ${renderedCount} GIFs${reset ? '' : ' (appended)'}`);
    }
}

function showGifEmptyState(message) {
    if (!gifEmptyState) return;
    gifEmptyState.textContent = message;
    gifEmptyState.classList.remove('hidden');
}

async function handleGifSelect(url) {
    try {
        await sendMediaMessage(url, 'gif');
        closeGifModal();
    } catch (error) {
        console.error('Error sending GIF:', error);
        alert('Could not send this GIF. Please try a different one.');
    }
}

// ===========================
// Stickers
// ===========================
function openStickerSheet() {
    if (!stickerSheet) return;
    stickerSheet.classList.remove('hidden');
}

function closeStickerSheet() {
    if (!stickerSheet) return;
    stickerSheet.classList.add('hidden');
}

function renderDefaultStickers() {
    if (!defaultStickerGrid) return;
    defaultStickerGrid.innerHTML = '';
    DEFAULT_STICKERS.forEach((sticker) => {
        defaultStickerGrid.appendChild(createStickerCard(sticker.url, sticker.emoji));
    });
}

function renderCustomStickers() {
    if (!customStickerGrid || !customStickerSection) return;
    customStickerGrid.innerHTML = '';
    if (!customStickers.length) {
        customStickerSection.classList.add('hidden');
        return;
    }
    customStickerSection.classList.remove('hidden');
    customStickers.forEach((sticker) => {
        customStickerGrid.appendChild(createStickerCard(sticker.url, 'My sticker'));
    });
}

function createStickerCard(url, label) {
    const card = document.createElement('div');
    card.className = 'sticker-card';
    card.title = label || 'Sticker';
    const img = document.createElement('img');
    img.src = url;
    img.alt = label || 'Sticker';
    card.appendChild(img);
    card.addEventListener('click', () => handleStickerSelect(url));
    return card;
}

async function handleStickerSelect(url) {
    try {
        await sendMediaMessage(url, 'sticker');
        closeStickerSheet();
    } catch (error) {
        console.error('Error sending sticker:', error);
        alert('Could not send this sticker. Please try again.');
    }
}

async function handleStickerUpload(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file || !currentChatId) return;

    try {
        if (addStickerBtn) {
            addStickerBtn.disabled = true;
            addStickerBtn.textContent = 'Uploading…';
        }
        const secureUrl = await uploadImageToCloudinary(file);
        if (secureUrl) {
            customStickers = [{ id: `custom-${Date.now()}`, url: secureUrl }, ...customStickers].slice(0, 40);
            persistCustomStickers();
            renderCustomStickers();
            await sendMediaMessage(secureUrl, 'sticker');
            closeStickerSheet();
        }
    } catch (error) {
        console.error('Error creating sticker:', error);
        alert('Unable to turn that photo into a sticker right now.');
    } finally {
        if (stickerFileInput) {
            stickerFileInput.value = '';
        }
        if (addStickerBtn) {
            addStickerBtn.disabled = false;
            addStickerBtn.textContent = 'Create from photo';
        }
    }
}

function getStickerStorageKey(uid) {
    return `${CUSTOM_STICKERS_KEY_PREFIX}:${uid}`;
}

function loadCustomStickers(uid) {
    if (typeof localStorage === 'undefined') {
        customStickers = [];
        renderCustomStickers();
        return;
    }
    if (!uid) {
        customStickers = [];
        renderCustomStickers();
        return;
    }
    try {
        const stored = localStorage.getItem(getStickerStorageKey(uid));
        customStickers = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Could not parse saved stickers', error);
        customStickers = [];
    }
    renderCustomStickers();
}

function persistCustomStickers() {
    if (!currentUser || typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(getStickerStorageKey(currentUser.uid), JSON.stringify(customStickers));
    } catch (error) {
        console.warn('Could not save stickers locally', error);
    }
}

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
let markSeenTimeout = null;

async function markMessagesAsSeen() {
    if (!currentChatId || !currentChatUser || !messagesContainer) return;

    // Debounce to prevent excessive calls
    if (markSeenTimeout) {
        clearTimeout(markSeenTimeout);
    }

    markSeenTimeout = setTimeout(async () => {
        try {
            // Check if user is at the bottom of the message list (viewing recent messages)
            const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 100;
            
            // Only mark messages as seen if user is at the bottom (viewing recent messages)
            if (!isAtBottom) return;

            const messagesRef = collection(db, 'chats', currentChatId, 'messages');
            const q = query(messagesRef, where('senderId', '==', currentChatUser.uid), where('seen', '==', false));
            const snapshot = await getDocs(q);

            // Batch update all unseen messages
            const updatePromises = [];
            snapshot.forEach((docSnap) => {
                updatePromises.push(updateDoc(docSnap.ref, { seen: true }));
            });

            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error marking messages as seen:', error);
        }
    }, 500); // Wait 500ms before marking as seen
}

// ===========================
// Reply Functions
// ===========================
function setReplyTo(messageData) {
    replyingToMessage = messageData;
    replyPreview.classList.remove('hidden');

    const replyToName = document.querySelector('.reply-to-name');
    const replyPreviewText = document.querySelector('.reply-preview-text');

    const senderName = messageData.senderName || 'Unknown';
    replyToName.textContent = `Replying to ${senderName}`;
    replyPreviewText.textContent = getMessagePreviewText(messageData);

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

    // Get message element and data
    const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const isOwnMessage = messageEl && messageEl.classList.contains('sent');
    const isMediaMessage = messageEl && messageEl.classList.contains('no-bubble');

    // Get all option buttons
    const copyBtn = document.querySelector('.option-btn[data-action="copy"]');
    const replyBtn = document.querySelector('.option-btn[data-action="reply"]');
    const editBtn = document.querySelector('.option-btn[data-action="edit"]');
    const deleteBtn = document.querySelector('.option-btn[data-action="delete"]');

    // Configure visibility based on message type
    if (copyBtn) {
        // Copy only available for text messages
        copyBtn.style.display = !isMediaMessage ? 'block' : 'none';
    }

    if (replyBtn) {
        // Reply not available for own messages
        replyBtn.style.display = isOwnMessage ? 'none' : 'block';
    }

    if (editBtn) {
        // Edit only available for own text messages
        editBtn.style.display = (isOwnMessage && !isMediaMessage) ? 'block' : 'none';
    }

    if (deleteBtn) {
        // Delete available for all own messages
        deleteBtn.style.display = isOwnMessage ? 'block' : 'none';
    }

    messageOptions.classList.remove('hidden');

    const x = event.clientX;
    const y = event.clientY;

    // Get menu dimensions
    const menuWidth = 120;
    const menuHeight = 150; // increased for more options

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
            if (action === 'copy') {
                // Copy text message to clipboard
                const messageDoc = await getDoc(messageRef);
                if (messageDoc.exists()) {
                    const messageData = messageDoc.data();
                    const textToCopy = messageData.text || '';
                    if (textToCopy) {
                        await navigator.clipboard.writeText(textToCopy);
                        // Show visual feedback
                        const copyBtn = document.querySelector('.option-btn[data-action="copy"]');
                        if (copyBtn) {
                            const originalText = copyBtn.textContent;
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => {
                                copyBtn.textContent = originalText;
                            }, 1500);
                        }
                    }
                }
            } else if (action === 'reply') {
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
