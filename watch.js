// ===========================
// Firebase Imports
// ===========================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    onSnapshot,
    serverTimestamp
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
let chatId = null;
let watchDocRef = null;
let participantDocRef = null;
let participantsUnsub = null;
let playbackUnsub = null;
let heartbeatInterval = null;
let sessionCleanedUp = false;
let sessionActive = true;
let player = null;
let playerReady = false;
let ignorePlayerEvents = false;
let pendingVideoId = null;
let currentPartyData = null;
let watchMessageId = null;
let lastPlaybackEventId = null;
let toastTimer = null;

const params = new URLSearchParams(window.location.search);
roomId = params.get('roomId');
chatId = params.get('chatId');
const joinMode = params.get('mode') || 'guest';

// ===========================
// DOM Elements
// ===========================
const globalLoading = document.getElementById('global-loading');
const loadingText = globalLoading?.querySelector('.loading-text');
const watchContainer = document.getElementById('watch-container');
const backToChatBtn = document.getElementById('back-to-chat-btn');
const copyInviteBtn = document.getElementById('copy-invite-btn');
const endWatchBtn = document.getElementById('end-watch-btn');
const syncStatusEl = document.getElementById('sync-status');
const playToggleBtn = document.getElementById('play-toggle-btn');
const syncNowBtn = document.getElementById('sync-now-btn');
const participantsListEl = document.getElementById('participants-list');
const participantCountEl = document.getElementById('participant-count');
const activityLogEl = document.getElementById('activity-log');
const toastEl = document.getElementById('toast');
const sessionEndedEl = document.getElementById('session-ended');
const sessionEndedMessage = document.getElementById('session-ended-message');
const sessionBackBtn = document.getElementById('session-back-btn');
const loginModal = document.getElementById('login-modal');
const goToLoginBtn = document.getElementById('go-to-login-btn');
const headerTitle = document.getElementById('watch-video-title');
const hostLine = document.getElementById('watch-host-line');

// ===========================
// UI Helpers
// ===========================
function showLoading(message = 'Loading…') {
    if (loadingText) {
        loadingText.textContent = message;
    }
    globalLoading?.classList.remove('hidden');
}

function hideLoading() {
    globalLoading?.classList.add('hidden');
}

function showToast(message, duration = 2500) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    if (toastTimer) {
        clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
        toastEl.classList.add('hidden');
    }, duration);
}

function showSessionEnded(message) {
    sessionActive = false;
    if (sessionEndedMessage) {
        sessionEndedMessage.textContent = message;
    }
    sessionEndedEl?.classList.remove('hidden');
}

function formatTime(date) {
    if (!(date instanceof Date)) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name = '') {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function renderParticipants(participants) {
    if (!participantsListEl) return;
    participantsListEl.innerHTML = '';
    participantCountEl.textContent = participants.length;

    const sorted = participants.slice().sort((a, b) => {
        if (a.role === 'host') return -1;
        if (b.role === 'host') return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
    });

    sorted.forEach((participant) => {
        const item = document.createElement('div');
        item.className = 'participant-item';

        const avatar = document.createElement('div');
        avatar.className = 'participant-avatar';
        if (participant.photoURL) {
            avatar.style.backgroundImage = `url('${participant.photoURL}')`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.color = 'transparent';
        } else {
            avatar.textContent = getInitials(participant.displayName || participant.email || '?');
        }

        const info = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.className = 'participant-name';
        nameEl.textContent = participant.displayName || participant.email || 'Guest';

        const roleEl = document.createElement('div');
        roleEl.className = 'participant-role';
        const lastSeenDate = participant.lastSeen?.toDate ? participant.lastSeen.toDate() : null;
        const lastSeenText = lastSeenDate ? ` • ${formatTime(lastSeenDate)}` : '';
        roleEl.textContent = `${participant.role === 'host' ? 'Host' : 'Viewer'}${lastSeenText}`;

        info.appendChild(nameEl);
        info.appendChild(roleEl);
        item.appendChild(avatar);
        item.appendChild(info);

        participantsListEl.appendChild(item);
    });
}

function addActivityEntry(message) {
    if (!activityLogEl) return;
    const entry = document.createElement('div');
    entry.className = 'activity-entry';
    entry.textContent = message;
    activityLogEl.prepend(entry);

    // Limit to 25 entries
    const entries = activityLogEl.querySelectorAll('.activity-entry');
    if (entries.length > 25) {
        entries[entries.length - 1].remove();
    }
}

function updatePartyMeta(data) {
    if (!data) return;
    headerTitle.textContent = data.videoTitle || 'Watch Party';
    hostLine.textContent = `Hosted by ${data.hostName || 'friend'}`;
    if (syncStatusEl) {
        const actionName = data.lastActionName || 'Someone';
        const status = data.isPlaying ? 'playing' : 'paused';
        syncStatusEl.textContent = `${actionName} ${status} • ${Math.round(data.currentTime || 0)}s`;
    }

    if (data.hostId === currentUser?.uid) {
        endWatchBtn?.classList.remove('hidden');
    } else {
        endWatchBtn?.classList.add('hidden');
    }
}

// ===========================
// Player Setup
// ===========================
function setupPlayer(videoId) {
    if (!videoId) return;
    pendingVideoId = videoId;

    const createPlayerInstance = () => {
        player = new YT.Player('youtube-player', {
            videoId: pendingVideoId,
            playerVars: {
                autoplay: 0,
                controls: 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1
            },
            events: {
                onReady: handlePlayerReady,
                onStateChange: handlePlayerStateChange
            }
        });
    };

    if (window.YT && window.YT.Player) {
        createPlayerInstance();
    } else {
        window.onYouTubeIframeAPIReady = () => {
            createPlayerInstance();
        };
    }
}

function handlePlayerReady() {
    playerReady = true;
    if (currentPartyData) {
        syncPlayerToState(currentPartyData, true);
    }
}

function handlePlayerStateChange(event) {
    if (!playerReady || !sessionActive || ignorePlayerEvents) return;

    if (event.data === YT.PlayerState.PLAYING) {
        updatePlaybackState(true);
    } else if (event.data === YT.PlayerState.PAUSED) {
        updatePlaybackState(false);
    }
}

function syncPlayerToState(data, forceSeek = false) {
    if (!playerReady || !player || !data) return;

    const desiredTime = Number(data.currentTime) || 0;
    const isPlaying = !!data.isPlaying;
    const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
    const timeDiff = Math.abs(currentTime - desiredTime);
    const shouldSeek = forceSeek || timeDiff > 0.8;

    ignorePlayerEvents = true;

    if (shouldSeek) {
        player.seekTo(desiredTime, true);
    }

    const playerState = player.getPlayerState();
    if (isPlaying && playerState !== YT.PlayerState.PLAYING) {
        player.playVideo();
    } else if (!isPlaying && playerState === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    }

    setTimeout(() => {
        ignorePlayerEvents = false;
    }, 400);
}

async function updatePlaybackState(isPlaying) {
    if (!watchDocRef || !player || !playerReady) return;
    try {
        await updateDoc(watchDocRef, {
            isPlaying,
            currentTime: Number(player.getCurrentTime()) || 0,
            lastActionBy: currentUser.uid,
            lastActionName: currentUserData?.displayName || 'Participant',
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Failed to sync playback state:', error);
    }
}

// ===========================
// Firestore Listeners
// ===========================
function startPlaybackListener() {
    if (!roomId) return;
    watchDocRef = doc(db, 'watchParties', roomId);
    playbackUnsub = onSnapshot(watchDocRef, async (snapshot) => {
        if (!snapshot.exists()) {
            showSessionEnded('Watch party was removed.');
            cleanupParticipant();
            return;
        }

        const data = snapshot.data();
        currentPartyData = data;
        watchMessageId = data.messageId || null;
        updatePartyMeta(data);

        if (data.updatedAt?.seconds && data.updatedAt.seconds !== lastPlaybackEventId) {
            lastPlaybackEventId = data.updatedAt.seconds;
            const action = data.isPlaying ? 'started playing' : 'paused';
            addActivityEntry(`${data.lastActionName || 'Participant'} ${action} the video`);
        }

        if (data.isActive === false) {
            showSessionEnded('The host ended this watch party.');
            if (watchMessageId && chatId) {
                try {
                    await updateDoc(doc(db, 'chats', chatId, 'messages', watchMessageId), { partyEnded: true });
                } catch (error) {
                    console.warn('Unable to update watch party message:', error);
                }
            }
            cleanupParticipant();
            return;
        }

        syncPlayerToState(data);
    });
}

function startParticipantsListener() {
    const participantsRef = collection(db, 'watchParties', roomId, 'participants');
    participantsUnsub = onSnapshot(participantsRef, (snapshot) => {
        const participants = snapshot.docs.map(doc => doc.data());
        renderParticipants(participants);

        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (change.type === 'added' && data.uid !== currentUser?.uid) {
                showToast(`${data.displayName || 'A friend'} joined the watch party`);
                addActivityEntry(`${data.displayName || 'A friend'} joined`);
            }
            if (change.type === 'removed' && data.uid !== currentUser?.uid) {
                showToast(`${data.displayName || 'A friend'} left the watch party`);
                addActivityEntry(`${data.displayName || 'A friend'} left`);
            }
        });
    });
}

// ===========================
// Session Management
// ===========================
async function registerParticipant() {
    if (!currentUser || !roomId) return;

    const participantData = {
        uid: currentUser.uid,
        displayName: currentUserData?.displayName || currentUser.email || 'You',
        photoURL: currentUserData?.photoURL || '',
        role: currentPartyData?.hostId === currentUser.uid ? 'host' : 'guest',
        joinedAt: serverTimestamp(),
        lastSeen: serverTimestamp()
    };

    participantDocRef = doc(db, 'watchParties', roomId, 'participants', currentUser.uid);
    await setDoc(participantDocRef, participantData, { merge: true });

    heartbeatInterval = setInterval(async () => {
        try {
            await updateDoc(participantDocRef, { lastSeen: serverTimestamp() });
        } catch (error) {
            console.warn('Failed to update participant heartbeat:', error);
        }
    }, 5000);
}

async function cleanupParticipant() {
    if (sessionCleanedUp) return;
    sessionCleanedUp = true;

    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    if (participantsUnsub) participantsUnsub();
    if (playbackUnsub) playbackUnsub();

    if (participantDocRef) {
        try {
            await deleteDoc(participantDocRef);
        } catch (error) {
            console.warn('Unable to remove participant record:', error);
        }
    }
}

async function endWatchParty() {
    if (!watchDocRef || !currentPartyData) return;
    try {
        await updateDoc(watchDocRef, {
            isActive: false,
            endedBy: currentUser.uid,
            endedAt: serverTimestamp()
        });
        if (watchMessageId && chatId) {
            await updateDoc(doc(db, 'chats', chatId, 'messages', watchMessageId), {
                partyEnded: true
            });
        }
        showSessionEnded('You ended this watch party.');
        await cleanupParticipant();
    } catch (error) {
        console.error('Failed to end watch party:', error);
    }
}

// ===========================
// Event Listeners
// ===========================
backToChatBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

copyInviteBtn?.addEventListener('click', async () => {
    const url = `${window.location.origin}/watch.html?roomId=${roomId}&mode=guest&chatId=${chatId || ''}`;
    try {
        await navigator.clipboard.writeText(url);
        showToast('Invite link copied');
    } catch (error) {
        console.warn('Clipboard unavailable:', error);
        showToast('Copy failed. Share the URL manually.');
    }
});

endWatchBtn?.addEventListener('click', () => {
    endWatchParty();
});

playToggleBtn?.addEventListener('click', () => {
    if (!player || !playerReady) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

syncNowBtn?.addEventListener('click', () => {
    if (currentPartyData) {
        syncPlayerToState(currentPartyData, true);
        showToast('Synced to host');
    }
});

sessionBackBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

goToLoginBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

window.addEventListener('beforeunload', () => {
    cleanupParticipant();
});

// ===========================
// Authentication & Init
// ===========================
async function loadCurrentUserProfile(uid) {
    try {
        const snapshot = await getDoc(doc(db, 'users', uid));
        if (snapshot.exists()) {
            currentUserData = snapshot.data();
        }
    } catch (error) {
        console.warn('Failed to load user profile:', error);
    }
}

async function initializeWatchParty() {
    if (!roomId) {
        showSessionEnded('Missing watch party room.');
        return;
    }

    showLoading('Connecting to watch party…');
    const docSnap = await getDoc(doc(db, 'watchParties', roomId));
    if (!docSnap.exists()) {
        hideLoading();
        showSessionEnded('Watch party not found.');
        return;
    }

    currentPartyData = docSnap.data();
    watchMessageId = currentPartyData.messageId || null;
    updatePartyMeta(currentPartyData);
    setupPlayer(currentPartyData.videoId);

    await registerParticipant();
    startPlaybackListener();
    startParticipantsListener();

    hideLoading();
    watchContainer?.classList.remove('hidden');
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        loginModal?.classList.remove('hidden');
        hideLoading();
        return;
    }
    loginModal?.classList.add('hidden');
    currentUser = user;
    await loadCurrentUserProfile(user.uid);
    initializeWatchParty();
});


