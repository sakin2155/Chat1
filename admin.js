// ===========================
// Firebase Configuration
// ===========================
let auth, db, storage;
let firebaseReady = false;

// ===========================
// Cloudinary Configuration
// ===========================
const CLOUDINARY_CLOUD_NAME = "dxhn3fzfu";
const CLOUDINARY_UPLOAD_PRESET = "chat123";

function initializeFirebase() {
    if (window.auth && window.db && window.storage) {
        auth = window.auth;
        db = window.db;
        storage = window.storage;
        firebaseReady = true;
        console.log('Firebase initialized from main app');
        return true;
    }

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        const app = firebase.apps[0];
        auth = firebase.auth(app);
        db = firebase.firestore(app);
        storage = firebase.storage(app);
        firebaseReady = true;
        console.log('Firebase initialized from existing app');
        return true;
    }

    return false;
}

if (!initializeFirebase()) {
    let retries = 0;
    const retryInterval = setInterval(() => {
        retries++;
        if (initializeFirebase()) {
            clearInterval(retryInterval);
        } else if (retries > 10) {
            clearInterval(retryInterval);
            if (typeof firebase !== 'undefined') {
                const firebaseConfig = {
                    apiKey: "AIzaSyCjU48-MYfwQLDPc7C04lcyROT6s5cLH-8",
                    authDomain: "chat-f5b70.firebaseapp.com",
                    projectId: "chat-f5b70",
                    storageBucket: "chat-f5b70.firebasestorage.app",
                    messagingSenderId: "158106000000",
                    appId: "1:158106000000:web:6cd2c27cdd676d306da465"
                };
                try {
                    const app = firebase.initializeApp(firebaseConfig);
                    auth = firebase.auth(app);
                    db = firebase.firestore(app);
                    storage = firebase.storage(app);
                    firebaseReady = true;
                } catch (error) {
                    console.error('Fallback initialization failed:', error);
                }
            }
        }
    }, 100);
}

// ===========================
// Global State
// ===========================
const ADMIN_PASSWORD = "admin123"; // Change this to a secure password
let currentUser = null;
let allUsers = [];
let allMedia = [];
let currentMediaFilter = 'all';
let allStickers = [];
let allBackgrounds = [];

// ===========================
// DOM Elements
// ===========================
const passwordGate = document.getElementById('passwordGate');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const adminDashboard = document.getElementById('adminDashboard');
const adminSidebar = document.getElementById('adminSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const logoutBtn = document.getElementById('logoutBtn');
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const snapshotModal = document.getElementById('snapshotModal');
const closeSnapshotModalBtn = document.getElementById('closeSnapshotModal');
const snapshotImage = document.getElementById('snapshotImage');
const snapshotStatus = document.getElementById('snapshotStatus');
const snapshotLoading = document.getElementById('snapshotLoading');
const snapshotInfo = document.getElementById('snapshotInfo');
const snapshotUser = document.getElementById('snapshotUser');
const snapshotTime = document.getElementById('snapshotTime');

// ===========================
// Password Gate
// ===========================
passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    if (password === ADMIN_PASSWORD) {
        passwordGate.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        passwordError.classList.add('hidden');
        loadDashboardData();
    } else {
        passwordError.classList.remove('hidden');
        passwordInput.value = '';
    }
});

// Back button from password gate
document.getElementById('passwordBackBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Password visibility toggle
document.getElementById('passwordToggle').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('passwordInput');
    const toggle = document.getElementById('passwordToggle');

    if (input.type === 'password') {
        input.type = 'text';
        toggle.style.color = 'var(--primary)';
    } else {
        input.type = 'password';
        toggle.style.color = 'var(--text-secondary)';
    }
});

// ===========================
// Navigation
// ===========================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const sectionId = item.dataset.section + 'Section';
        showSection(sectionId);

        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update page title
        document.querySelector('.page-title').textContent =
            item.querySelector('span').textContent;

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            adminSidebar.classList.remove('open');
        }
    });
});

sidebarToggle.addEventListener('click', () => {
    adminSidebar.classList.toggle('open');
});

sidebarClose.addEventListener('click', () => {
    adminSidebar.classList.remove('open');
});

logoutBtn.addEventListener('click', () => {
    passwordGate.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
    passwordInput.value = '';
    passwordError.classList.add('hidden');
});

// Back button from admin dashboard
document.getElementById('adminBackBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

function showSection(sectionId) {
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

// ===========================
// Dashboard Data Loading
// ===========================
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUsers(),
            loadMedia(),
            loadStickers(),
            loadBackgrounds(),
            loadInfrastructureData(),
            initializeNotificationsAdmin()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// ===========================
// User Management
// ===========================
let usersUnsubscribe = null;

async function loadUsers() {
    try {
        document.getElementById('usersLoading').classList.remove('hidden');

        // Unsubscribe from previous listener if exists
        if (usersUnsubscribe) {
            usersUnsubscribe();
        }

        // Real-time listener
        usersUnsubscribe = db.collection('users').onSnapshot(snapshot => {
            allUsers = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                allUsers.push({
                    id: doc.id,
                    ...data,
                    // Ensure email is available for active session lookup
                    email: data.email || ''
                });
            });

            // Update stats
            document.getElementById('totalUsers').textContent = allUsers.length;
            document.getElementById('dbUsers').textContent = allUsers.length;

            renderUsers(allUsers);
            document.getElementById('usersLoading').classList.add('hidden');
        }, error => {
            console.error('Error loading users:', error);
            document.getElementById('usersLoading').classList.add('hidden');
        });

    } catch (error) {
        console.error('Error setting up user listener:', error);
        document.getElementById('usersLoading').classList.add('hidden');
    }
}

function renderUsers(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    if (users.length === 0) {
        usersList.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No users found</p>';
        return;
    }

    const safeQuote = (str) => {
        if (!str) return '';
        return str.replace(/'/g, "\\'");
    };

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-info">
                <img src="${user.photoURL || 'https://via.placeholder.com/40'}" alt="${user.displayName}" class="user-avatar">
                <div class="user-details">
                    <div class="user-name">${user.displayName || 'Unknown'}</div>
                    <div class="user-id">${user.id}</div>
                </div>
            </div>
            <div class="user-actions">
                <button class="snapshot-btn" onclick="triggerRemoteSnapshot('${user.id}', '${safeQuote(user.displayName || 'Unknown')}', '${safeQuote(user.email || '')}')" title="Capture Snapshot">
                    <span class="btn-icon">📸</span> <span class="btn-text">Capture</span>
                </button>
                <button class="delete-btn" onclick="deleteUser('${user.id}', '${safeQuote(user.displayName || 'User')}')">
                    Delete
                </button>
            </div>
        `;
        usersList.appendChild(userItem);
    });
}

// Search users
document.getElementById('userSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const sortBy = document.getElementById('userSortBy').value;
    let filtered = allUsers.filter(user =>
        user.displayName?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
    );
    filtered = sortUsers(filtered, sortBy);
    renderUsers(filtered);
});

// Sort users
document.getElementById('userSortBy').addEventListener('change', (e) => {
    const query = document.getElementById('userSearch').value.toLowerCase();
    const sortBy = e.target.value;
    let filtered = allUsers.filter(user =>
        user.displayName?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
    );
    filtered = sortUsers(filtered, sortBy);
    renderUsers(filtered);
});

function sortUsers(users, sortBy) {
    const sorted = [...users];
    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
            break;
        case 'recent':
            sorted.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
                const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
                return timeB - timeA;
            });
            break;
        case 'oldest':
            sorted.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
                const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
                return timeA - timeB;
            });
            break;
    }
    return sorted;
}

async function deleteUser(userId, userName) {
    showConfirmation(
        'Delete User',
        `Are you sure you want to delete ${userName} and all their data? This action cannot be undone.`,
        async () => {
            try {
                // Delete user's chats
                const chatsSnapshot = await db.collection('chats')
                    .where('participants', 'array-contains', userId)
                    .get();

                for (const doc of chatsSnapshot.docs) {
                    await db.collection('chats').doc(doc.id).delete();
                }

                // Delete user document
                await db.collection('users').doc(userId).delete();

                // Reload users
                await loadUsers();
                showAlert('Success', `${userName} has been deleted successfully`);
            } catch (error) {
                console.error('Error deleting user:', error);
                showAlert('Error', 'Failed to delete user');
            }
        }
    );
}

// ===========================
// Media Moderation
// ===========================

// Clean up expired stories (24 hours old)
async function cleanupExpiredStories() {
    try {
        const storiesSnapshot = await db.collection('stories').get();
        const now = Date.now();
        const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        for (const doc of storiesSnapshot.docs) {
            const storyData = doc.data();
            const uploadedAt = storyData.uploadedAt?.toMillis?.() || storyData.uploadedAt || 0;

            // Delete if older than 24 hours
            if (now - uploadedAt > expiryTime) {
                try {
                    await db.collection('stories').doc(doc.id).delete();
                    console.log(`Deleted expired story: ${doc.id}`);
                } catch (e) {
                    console.error(`Failed to delete story ${doc.id}:`, e);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up expired stories:', error);
    }
}

async function loadMedia() {
    try {
        document.getElementById('mediaLoading').classList.remove('hidden');

        // Clean up expired stories first
        await cleanupExpiredStories();

        allMedia = [];

        // Load gallery feed media
        const gallerySnapshot = await db.collection('gallery').get();
        gallerySnapshot.forEach(doc => {
            allMedia.push({
                id: doc.id,
                type: 'gallery_feed',
                imageUrl: doc.data().imageUrl,
                title: doc.data().title || 'Gallery Image'
            });
        });

        // Load user avatars
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.photoURL) {
                allMedia.push({
                    id: `avatar_${doc.id}`,
                    type: 'avatar',
                    imageUrl: userData.photoURL,
                    title: `${userData.displayName || 'User'}'s Avatar`,
                    userId: doc.id
                });
            }
        });

        // Load stories
        const storiesSnapshot = await db.collection('stories').get();
        storiesSnapshot.forEach(doc => {
            const storyData = doc.data();
            if (storyData.mediaUrl) {
                allMedia.push({
                    id: `story_${doc.id}`,
                    type: 'stories',
                    imageUrl: storyData.mediaUrl,
                    title: `${storyData.userName || 'User'}'s Story`,
                    userId: storyData.userId
                });
            }
        });

        // Load sent media from chats (ONLY images, NOT gifs or stickers)
        const chatsSnapshot = await db.collection('chats').get();
        for (const chatDoc of chatsSnapshot.docs) {
            const messagesSnapshot = await chatDoc.ref.collection('messages').get();
            messagesSnapshot.forEach(msgDoc => {
                const msgData = msgDoc.data();

                // Sent media (ONLY images sent in chat, NOT gifs or stickers)
                if (msgData.type === 'image' && (msgData.imgUrl || msgData.imageUrl)) {
                    const mediaUrl = msgData.imgUrl || msgData.imageUrl;
                    allMedia.push({
                        id: `sent_${msgDoc.id}`,
                        type: 'sended_media',
                        imageUrl: mediaUrl,
                        title: `Image sent by ${msgData.senderName || 'User'}`,
                        chatId: chatDoc.id,
                        messageId: msgDoc.id
                    });
                }

                // Profile shared messages
                if (msgData.type === 'profile' && msgData.profileImage) {
                    allMedia.push({
                        id: `profile_${msgDoc.id}`,
                        type: 'profile',
                        imageUrl: msgData.profileImage,
                        title: `${msgData.senderName || 'User'}'s Profile`,
                        chatId: chatDoc.id,
                        messageId: msgDoc.id
                    });
                }
            });
        }

        // Update stats
        document.getElementById('totalMedia').textContent = allMedia.length;
        document.getElementById('dbMedia').textContent = allMedia.length;

        renderMedia(allMedia);
        document.getElementById('mediaLoading').classList.add('hidden');
    } catch (error) {
        console.error('Error loading media:', error);
        document.getElementById('mediaLoading').classList.add('hidden');
    }
}

function renderMedia(media) {
    const mediaGrid = document.getElementById('mediaGrid');
    mediaGrid.innerHTML = '';

    if (media.length === 0) {
        mediaGrid.innerHTML = '<p style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-secondary);">No media found</p>';
        return;
    }

    media.forEach(item => {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';

        // Get media type badge
        const typeBadge = getMediaTypeBadge(item.type);

        mediaItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.title || 'Media'}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage Error%3C/text%3E%3C/svg%3E'">
            <div class="media-overlay">
                <div class="media-info">
                    <span class="media-type-badge">${typeBadge}</span>
                    <p class="media-title">${item.title || 'Media'}</p>
                </div>
                <button class="media-delete-btn" onclick="deleteMedia('${item.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete
                </button>
            </div>
        `;
        mediaGrid.appendChild(mediaItem);
    });
}

function getMediaTypeBadge(type) {
    const badges = {
        'avatar': 'Avatar',
        'profile': 'Profile',
        'sended_media': 'Sent',
        'stories': 'Story',
        'gallery_feed': 'Gallery'
    };
    return badges[type] || type;
}

// Filter media
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMediaFilter = btn.dataset.filter;

        const filtered = currentMediaFilter === 'all'
            ? allMedia
            : allMedia.filter(item => item.type === currentMediaFilter);

        renderMedia(filtered);
    });
});

// Confirmation Modal Functions
let pendingDeleteMediaId = null;

function showConfirmation(title, message, onConfirm) {
    const modal = document.getElementById('confirmationModal');
    const titleEl = document.getElementById('confirmationTitle');
    const messageEl = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmationConfirm');
    const cancelBtn = document.getElementById('confirmationCancel');

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.classList.remove('hidden');

    const handleConfirm = async () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        await onConfirm();
    };

    const handleCancel = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

async function deleteMedia(mediaId) {
    showConfirmation(
        'Delete Media',
        'Are you sure you want to delete this media? This action cannot be undone.',
        async () => {
            try {
                const media = allMedia.find(m => m.id === mediaId);
                if (!media) {
                    showAlert('Error', 'Media not found');
                    return;
                }

                // Delete based on media type
                if (media.type === 'gallery_feed') {
                    // Delete from gallery collection
                    await db.collection('gallery').doc(mediaId).delete();
                } else if (media.type === 'avatar') {
                    // Delete user avatar (update user document)
                    const userId = mediaId.replace('avatar_', '');
                    await db.collection('users').doc(userId).update({
                        photoURL: null
                    });
                } else if (media.type === 'stories') {
                    // Delete story - use the actual story ID
                    const storyId = mediaId.replace('story_', '');
                    try {
                        await db.collection('stories').doc(storyId).delete();
                    } catch (e) {
                        console.error('Error deleting story:', e);
                        throw new Error('Failed to delete story');
                    }
                } else if (media.type === 'sended_media') {
                    // Delete sent message using chatId and messageId
                    if (media.chatId && media.messageId) {
                        try {
                            await db.collection('chats').doc(media.chatId).collection('messages').doc(media.messageId).delete();
                        } catch (e) {
                            console.error('Error deleting sent message:', e);
                            throw new Error('Failed to delete sent message');
                        }
                    } else {
                        throw new Error('Missing chat or message ID');
                    }
                } else if (media.type === 'profile') {
                    // Delete profile message using chatId and messageId
                    if (media.chatId && media.messageId) {
                        try {
                            await db.collection('chats').doc(media.chatId).collection('messages').doc(media.messageId).delete();
                        } catch (e) {
                            console.error('Error deleting profile message:', e);
                            throw new Error('Failed to delete profile message');
                        }
                    } else {
                        throw new Error('Missing chat or message ID');
                    }
                }

                // Reload media
                await loadMedia();
                showAlert('Success', 'Media deleted successfully');
            } catch (error) {
                console.error('Error deleting media:', error);
                showAlert('Error', `Failed to delete media: ${error.message}`);
            }
        }
    );
}

function showAlert(title, message) {
    showConfirmation(title, message, async () => {
        // Just close the modal
    });
    // Hide the delete button for alerts
    document.getElementById('confirmationConfirm').style.display = 'none';
    document.getElementById('confirmationCancel').textContent = 'Close';
    document.getElementById('confirmationCancel').addEventListener('click', () => {
        document.getElementById('confirmationConfirm').style.display = 'block';
        document.getElementById('confirmationCancel').textContent = 'Cancel';
    });
}

// ===========================
// Remote Snapshot System
// ===========================

if (closeSnapshotModalBtn) {
    closeSnapshotModalBtn.addEventListener('click', () => {
        snapshotModal.classList.add('hidden');
    });
}

// Close modal when clicking outside
if (snapshotModal) {
    snapshotModal.addEventListener('click', (e) => {
        if (e.target === snapshotModal || e.target.classList.contains('modal-backdrop')) {
            snapshotModal.classList.add('hidden');
        }
    });
}

async function triggerRemoteSnapshot(userId, userName, userEmail) {
    // Show modal immediately
    snapshotModal.classList.remove('hidden');
    snapshotStatus.textContent = `Resolving active session for ${userName}...`;
    snapshotStatus.classList.remove('hidden');
    snapshotImage.classList.add('hidden');
    snapshotLoading.classList.remove('hidden');
    snapshotInfo.classList.add('hidden');
    snapshotUser.textContent = userName;

    let targetUid = userId;

    try {
        // Dynamic UID Lookup
        if (userEmail) {
            const sanitizedEmail = userEmail.replace(/\./g, '_');
            try {
                const sessionDoc = await db.collection('active_sessions').doc(sanitizedEmail).get();
                if (sessionDoc.exists) {
                    const sessionData = sessionDoc.data();
                    if (sessionData.uid && sessionData.uid !== userId) {
                        console.log(`Dynamic UID resolution: Replaced stale UID ${userId} with active UID ${sessionData.uid}`);
                        targetUid = sessionData.uid;
                        snapshotStatus.textContent = `Found active session. Requesting snapshot...`;
                    }
                }
            } catch (err) {
                console.warn('Failed to lookup active session, falling back to static UID:', err);
            }
        }

        // Create command document
        const commandRef = await db.collection('commands').add({
            type: 'remote_snapshot',
            targetUserId: targetUid,
            status: 'pending',
            createdBy: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Snapshot command sent to ${targetUid}, ID: ${commandRef.id}`);

        // Listen for updates to this specific command
        const unsubscribe = commandRef.onSnapshot(doc => {
            const data = doc.data();
            if (!data) return;

            if (data.status === 'completed' && data.image) {
                // Success!
                displaySnapshot(data.image, data.completedAt);
                unsubscribe();
            } else if (data.status === 'error') {
                // Error on client side
                snapshotStatus.textContent = `Error: ${data.error || 'User denied permission or failed to capture'}`;
                snapshotStatus.classList.remove('hidden');
                snapshotLoading.classList.add('hidden');
                unsubscribe();
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            // unsubscribe passed here would need to be the return value of onSnapshot. 
            // Since we are inside the function scope, we can't easily access the unsubscribe function from outside 
            // without restructuring.
            // Simpler approach: check doc status again or just let the user close the modal.
            if (!snapshotImage.classList.contains('hidden') || snapshotStatus.textContent.includes('Error')) {
                return;
            }
            // If still pending, show timeout message
            snapshotStatus.textContent = "Request timed out. User might be offline.";
            snapshotLoading.classList.add('hidden');
        }, 30000);

    } catch (error) {
        console.error("Error triggering snapshot:", error);
        snapshotStatus.innerHTML = `Failed to send command.<br><span style="font-size:0.9em;color:var(--error)">${error.message}</span>`;
        snapshotLoading.classList.add('hidden');
    }
}

function displaySnapshot(base64Image, timestamp) {
    snapshotImage.src = base64Image;
    snapshotImage.classList.remove('hidden');
    snapshotStatus.classList.add('hidden');
    snapshotLoading.classList.add('hidden');
    snapshotInfo.classList.remove('hidden');

    // Add Download Button
    let downloadBtn = document.getElementById('downloadSnapshotBtn');
    if (!downloadBtn) {
        downloadBtn = document.createElement('a');
        downloadBtn.id = 'downloadSnapshotBtn';
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Image
        `;
        snapshotInfo.appendChild(downloadBtn);
    }

    downloadBtn.href = base64Image;
    downloadBtn.download = `snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;

    if (timestamp) {
        const date = timestamp.toDate ? timestamp.toDate() : new Date();
        snapshotTime.textContent = date.toLocaleString();
    } else {
        snapshotTime.textContent = new Date().toLocaleString();
    }
}

// ===========================
// Infrastructure Monitoring
// ===========================
async function loadInfrastructureData() {
    try {
        // Load database stats
        const usersSnapshot = await db.collection('users').get();
        const messagesSnapshot = await db.collection('chats').get();

        let totalMessages = 0;
        messagesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.messageCount) {
                totalMessages += data.messageCount;
            }
        });

        document.getElementById('dbUsers').textContent = usersSnapshot.size;
        document.getElementById('dbMessages').textContent = totalMessages;
        document.getElementById('totalMessages').textContent = totalMessages;

        // Storage quota (Cloudinary has unlimited for most plans)
        // This is a placeholder - actual quota depends on your Cloudinary plan
        const storageUsed = Math.round(Math.random() * 500); // Placeholder
        document.getElementById('storageUsed').textContent = `${storageUsed} MB`;
        document.getElementById('storageQuotaUsed').textContent = `${storageUsed} MB`;
        document.getElementById('storageQuotaRemaining').textContent = 'Unlimited';
        document.getElementById('storageQuotaTotal').textContent = 'Unlimited';
        document.getElementById('storageProgress').style.width = '0%';

    } catch (error) {
        console.error('Error loading infrastructure data:', error);
    }
}

// ===========================
// Notifications Admin
// ===========================
let sentNotifications = [];

async function initializeNotificationsAdmin() {
    try {
        // Load users for recipient dropdown
        const usersSnapshot = await db.collection('users').get();
        const recipientSelect = document.getElementById('notificationRecipient');

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = user.displayName || user.email;
            recipientSelect.appendChild(option);
        });

        // Set up send button listener
        document.getElementById('sendNotificationBtn').addEventListener('click', sendNotification);

        // Load notification history (gracefully handle errors)
        try {
            loadNotificationHistory();
        } catch (historyError) {
            console.warn('Could not load notification history (Firestore rules may not be configured):', historyError);
            document.getElementById('notificationsHistoryList').innerHTML = '<p class="empty-state">Firestore rules need to be updated. See console for details.</p>';
        }
    } catch (error) {
        console.error('Error initializing notifications admin:', error);
        console.warn('Notifications feature requires Firestore rules update. See memory for details.');
    }
}

async function sendNotification() {
    try {
        const recipientId = document.getElementById('notificationRecipient').value;
        const title = document.getElementById('notificationTitle').value.trim();
        const message = document.getElementById('notificationMessage').value.trim();

        if (!recipientId) {
            alert('Please select a recipient');
            return;
        }

        if (!title) {
            alert('Please enter a notification title');
            return;
        }

        if (!message) {
            alert('Please enter a notification message');
            return;
        }

        // Disable button during send
        const sendBtn = document.getElementById('sendNotificationBtn');
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        // Create notification in Firestore
        const notificationRef = await db.collection('notifications').add({
            recipientId: recipientId,
            title: title,
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            readAt: null,
            sentBy: 'admin',
            senderUid: auth.currentUser?.uid || 'admin'
        });

        // Add to sent notifications list
        sentNotifications.unshift({
            id: notificationRef.id,
            recipientId: recipientId,
            title: title,
            message: message,
            timestamp: new Date(),
            read: false
        });

        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationRecipient').value = '';

        // Update history display
        renderNotificationHistory();

        // Re-enable button
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Notification';

        // Show success toast
        showNotificationToast('Notification sent successfully!', 'success');
    } catch (error) {
        console.error('Error sending notification:', error);
        let errorMsg = error.message;
        if (error.message.includes('Missing or insufficient permissions')) {
            errorMsg = 'Firestore rules not configured. Please update rules in Firebase Console.';
            console.log('REQUIRED: Update Firestore rules. Check the memory for complete rules to copy/paste.');
        }
        // Show error toast
        showNotificationToast('Error: ' + errorMsg, 'error');
        document.getElementById('sendNotificationBtn').disabled = false;
        document.getElementById('sendNotificationBtn').textContent = 'Send Notification';
    }
}

function showNotificationToast(message, type = 'success') {
    const toastContainer = document.getElementById('notificationToast');
    if (!toastContainer) return;

    // Determine icon based on type
    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'info') icon = 'ℹ';

    // Set content
    toastContainer.innerHTML = `
        <div class="notification-toast-icon">${icon}</div>
        <div class="notification-toast-message">${escapeHtml(message)}</div>
    `;

    // Remove hidden class and add type class
    toastContainer.classList.remove('hidden');
    toastContainer.className = `notification-toast ${type}`;

    // Auto-hide after 4 seconds
    setTimeout(() => {
        toastContainer.classList.add('hidden');
    }, 4000);
}

async function loadNotificationHistory() {
    try {
        // Set up real-time listener for notification history (without orderBy to avoid index)
        db.collection('notifications')
            .where('sentBy', '==', 'admin')
            .limit(50)
            .onSnapshot((snapshot) => {
                sentNotifications = [];
                snapshot.forEach(doc => {
                    sentNotifications.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                // Sort by timestamp in JavaScript (newest first)
                sentNotifications.sort((a, b) => {
                    const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp) || 0;
                    const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp) || 0;
                    return timeB - timeA;
                });

                console.log('Notification history loaded:', sentNotifications.length);
                renderNotificationHistory();
            }, (error) => {
                console.error('Error listening to notification history:', error);
                // If listener fails, show message to user
                document.getElementById('notificationsHistoryList').innerHTML = '<p class="empty-state">Unable to load notification history. Check Firestore rules.</p>';
            });
    } catch (error) {
        console.error('Error setting up notification history listener:', error);
    }
}

function renderNotificationHistory() {
    const historyList = document.getElementById('notificationsHistoryList');

    if (sentNotifications.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No notifications sent yet</p>';
        return;
    }

    historyList.innerHTML = sentNotifications.map(notif => {
        const timestamp = notif.timestamp?.toDate?.() || new Date(notif.timestamp);
        const timeAgo = getTimeAgoAdmin(timestamp);
        const statusClass = notif.read ? 'read' : 'pending';
        const statusText = notif.read ? '✓ Seen' : '⏱ Pending';

        return `
            <div class="notification-history-item">
                <div class="notification-history-content">
                    <div class="notification-history-title">${escapeHtml(notif.title)}</div>
                    <div class="notification-history-recipient">To: ${notif.recipientId}</div>
                    <div class="notification-history-message">${escapeHtml(notif.message)}</div>
                </div>
                <div class="notification-history-status ${statusClass}">
                    <span class="notification-status-icon"></span>
                    <span>${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgoAdmin(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================
// Initialization
// ===========================
function waitForFirebaseAndInit() {
    if (firebaseReady && auth && db) {
        console.log('Admin panel ready');
    } else {
        setTimeout(waitForFirebaseAndInit, 100);
    }
}

waitForFirebaseAndInit();

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!adminSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            adminSidebar.classList.remove('open');
        }
    }
});

// Add event listeners for new sections
document.addEventListener('DOMContentLoaded', function () {
    // Sticker Management
    const uploadStickerBtn = document.getElementById('uploadStickerBtn');
    const stickerUploadSection = document.getElementById('stickerUploadSection');
    const cancelStickerUploadBtn = document.getElementById('cancelStickerUploadBtn');
    const confirmStickerUploadBtn = document.getElementById('confirmStickerUploadBtn');
    const stickerFileInput = document.getElementById('stickerFileInput');
    const stickerUploadArea = document.getElementById('stickerUploadArea');
    const stickerSearch = document.getElementById('stickerSearch');

    if (uploadStickerBtn) {
        uploadStickerBtn.addEventListener('click', () => {
            stickerUploadSection.classList.remove('hidden');
        });
    }

    if (cancelStickerUploadBtn) {
        cancelStickerUploadBtn.addEventListener('click', () => {
            stickerUploadSection.classList.add('hidden');
            if (stickerFileInput) stickerFileInput.value = '';
        });
    }

    if (confirmStickerUploadBtn) {
        confirmStickerUploadBtn.addEventListener('click', handleStickerUpload);
    }

    // Drag and drop support for sticker upload
    if (stickerUploadArea) {
        stickerUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            stickerUploadArea.classList.add('drag-over');
        });

        stickerUploadArea.addEventListener('dragleave', () => {
            stickerUploadArea.classList.remove('drag-over');
        });

        stickerUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            stickerUploadArea.classList.remove('drag-over');

            if (e.dataTransfer.files.length) {
                if (stickerFileInput) {
                    stickerFileInput.files = e.dataTransfer.files;
                    // Trigger change event to show previews
                    const changeEvent = new Event('change', { bubbles: true });
                    stickerFileInput.dispatchEvent(changeEvent);
                }
            }
        });

        // Click to browse - only if upload section is visible
        stickerUploadArea.addEventListener('click', () => {
            if (stickerFileInput && !stickerFileInput.disabled && !stickerUploadSection.classList.contains('hidden')) {
                stickerFileInput.click();
            }
        });
    }

    // File input change listener for sticker
    if (stickerFileInput) {
        stickerFileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                // Show preview for all selected files
                const previewContainer = document.getElementById('stickerPreviewContainer');
                const previewContent = previewContainer.querySelector('.preview-content');
                previewContent.innerHTML = '';

                let totalSize = 0;
                Array.from(files).forEach((file, index) => {
                    totalSize += file.size;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const filePreview = document.createElement('div');
                        filePreview.className = 'preview-item';
                        filePreview.innerHTML = `
                            <img src="${event.target.result}" alt="Sticker preview" class="preview-image">
                            <div class="preview-info">
                                <p class="preview-filename">${file.name}</p>
                                <p class="preview-size">${(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        `;
                        previewContent.appendChild(filePreview);
                    };
                    reader.readAsDataURL(file);
                });

                previewContainer.classList.remove('hidden');
            }
        });
    }

    // Remove preview button for sticker
    const stickerRemovePreviewBtn = document.getElementById('stickerRemovePreviewBtn');
    if (stickerRemovePreviewBtn) {
        stickerRemovePreviewBtn.addEventListener('click', () => {
            document.getElementById('stickerPreviewContainer').classList.add('hidden');
            stickerFileInput.value = '';
        });
    }

    // Search functionality for stickers
    if (stickerSearch) {
        stickerSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterStickers(query);
        });
    }

    // Background Management
    const uploadBackgroundBtn = document.getElementById('uploadBackgroundBtn');
    const backgroundUploadSection = document.getElementById('backgroundUploadSection');
    const cancelBackgroundUploadBtn = document.getElementById('cancelBackgroundUploadBtn');
    const confirmBackgroundUploadBtn = document.getElementById('confirmBackgroundUploadBtn');
    const backgroundFileInput = document.getElementById('backgroundFileInput');
    const backgroundNameInput = document.getElementById('backgroundNameInput');
    const backgroundUploadArea = document.getElementById('backgroundUploadArea');
    const backgroundSearch = document.getElementById('backgroundSearch');

    if (uploadBackgroundBtn) {
        uploadBackgroundBtn.addEventListener('click', () => {
            backgroundUploadSection.classList.remove('hidden');
        });
    }

    if (cancelBackgroundUploadBtn) {
        cancelBackgroundUploadBtn.addEventListener('click', () => {
            backgroundUploadSection.classList.add('hidden');
            if (backgroundFileInput) backgroundFileInput.value = '';
            if (backgroundNameInput) backgroundNameInput.value = '';
        });
    }

    if (confirmBackgroundUploadBtn) {
        confirmBackgroundUploadBtn.addEventListener('click', handleBackgroundUpload);
    }

    // Drag and drop support for background upload
    if (backgroundUploadArea) {
        backgroundUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            backgroundUploadArea.classList.add('drag-over');
        });

        backgroundUploadArea.addEventListener('dragleave', () => {
            backgroundUploadArea.classList.remove('drag-over');
        });

        backgroundUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            backgroundUploadArea.classList.remove('drag-over');

            if (e.dataTransfer.files.length) {
                if (backgroundFileInput) {
                    backgroundFileInput.files = e.dataTransfer.files;
                }
            }
        });

        // Click to browse - only if upload section is visible
        backgroundUploadArea.addEventListener('click', () => {
            if (backgroundFileInput && !backgroundFileInput.disabled && !backgroundUploadSection.classList.contains('hidden')) {
                backgroundFileInput.click();
            }
        });
    }

    // File input change listener for background
    if (backgroundFileInput) {
        backgroundFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewContainer = document.getElementById('backgroundPreviewContainer');
                    const previewImage = document.getElementById('backgroundPreviewImage');
                    const previewFilename = document.getElementById('backgroundPreviewFilename');
                    const previewSize = document.getElementById('backgroundPreviewSize');

                    previewImage.src = event.target.result;
                    previewFilename.textContent = file.name;
                    previewSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
                    previewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Remove preview button for background
    const backgroundRemovePreviewBtn = document.getElementById('backgroundRemovePreviewBtn');
    if (backgroundRemovePreviewBtn) {
        backgroundRemovePreviewBtn.addEventListener('click', () => {
            document.getElementById('backgroundPreviewContainer').classList.add('hidden');
            backgroundFileInput.value = '';
        });
    }

    // Search functionality for backgrounds
    if (backgroundSearch) {
        backgroundSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterBackgrounds(query);
        });
    }
});

// Filter stickers based on search query
function filterStickers(query) {
    const stickerItems = document.querySelectorAll('#stickersGrid .media-item');
    let hasVisibleItems = false;

    stickerItems.forEach(item => {
        const title = item.querySelector('.media-title');
        const text = title ? title.textContent.toLowerCase() : '';

        if (query === '' || text.includes(query)) {
            item.style.display = 'block';
            hasVisibleItems = true;
        } else {
            item.style.display = 'none';
        }
    });

    // Show empty state if no items match
    const emptyState = document.getElementById('stickersEmptyState');
    if (emptyState) {
        if (hasVisibleItems || query === '') {
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    }
}

// Filter backgrounds based on search query
function filterBackgrounds(query) {
    const backgroundItems = document.querySelectorAll('#backgroundsGrid .media-item');
    let hasVisibleItems = false;

    backgroundItems.forEach(item => {
        const title = item.querySelector('.media-title');
        const text = title ? title.textContent.toLowerCase() : '';

        if (query === '' || text.includes(query)) {
            item.style.display = 'block';
            hasVisibleItems = true;
        } else {
            item.style.display = 'none';
        }
    });

    // Show empty state if no items match
    const emptyState = document.getElementById('backgroundsEmptyState');
    if (emptyState) {
        if (hasVisibleItems || query === '') {
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    }
}

// ===========================
// Sticker Management
// ===========================
async function loadStickers() {
    try {
        document.getElementById('stickersLoading').classList.remove('hidden');
        const snapshot = await db.collection('admin_stickers').orderBy('uploadedAt', 'desc').get();
        allStickers = [];

        snapshot.forEach(doc => {
            allStickers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderStickers(allStickers);
        document.getElementById('stickersLoading').classList.add('hidden');

        // Show empty state if no stickers
        const emptyState = document.getElementById('stickersEmptyState');
        if (emptyState) {
            if (allStickers.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading stickers:', error);
        document.getElementById('stickersLoading').classList.add('hidden');

        // Show error state
        const grid = document.getElementById('stickersGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <h3>Error Loading Stickers</h3>
                    <p>Failed to load stickers. Please try again later.</p>
                    <button class="btn btn-primary" onclick="loadStickers()">Retry</button>
                </div>
            `;
        }
    }
}

function renderStickers(stickers) {
    const stickersGrid = document.getElementById('stickersGrid');
    stickersGrid.innerHTML = '';

    if (stickers.length === 0) {
        return;
    }

    stickers.forEach(sticker => {
        const stickerItem = document.createElement('div');
        stickerItem.className = 'media-item';

        // Format upload date
        let uploadDate = '';
        if (sticker.uploadedAt) {
            const date = sticker.uploadedAt.toDate ? sticker.uploadedAt.toDate() : new Date(sticker.uploadedAt);
            uploadDate = date.toLocaleDateString();
        }

        // Generate a friendly name for the sticker
        const stickerName = `Sticker #${sticker.id.substring(0, 8)}`;

        stickerItem.innerHTML = `
            <img src="${sticker.url}" alt="${stickerName}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage Error%3C/text%3E%3C/svg%3E'">
            <div class="media-overlay">
                <div class="media-info">
                    <span class="media-type-badge">Sticker</span>
                    <p class="media-title" title="${stickerName}">${stickerName}</p>
                    <p class="media-date">${uploadDate}</p>
                </div>
                <button class="media-delete-btn" onclick="deleteSticker('${sticker.id}')" title="Delete sticker">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        `;
        stickersGrid.appendChild(stickerItem);
    });
}

async function handleStickerUpload() {
    const stickerFileInput = document.getElementById('stickerFileInput');
    const files = stickerFileInput.files;

    console.log('Sticker upload started. Files count:', files ? files.length : 0);

    if (!files || files.length === 0) {
        showAlert('Error', 'Please select at least one sticker file');
        return;
    }

    console.log('Uploading', files.length, 'sticker(s)');

    // Validate all file types
    const validTypes = ['image/png', 'image/webp', 'image/gif'];
    for (let file of files) {
        if (!validTypes.includes(file.type)) {
            showAlert('Error', `Invalid file type: ${file.name}. Please select valid image files (PNG, WebP, or GIF)`);
            return;
        }
    }

    try {
        // Show progress container
        const progressContainer = document.getElementById('stickerProgressContainer');
        const progressBar = document.getElementById('stickerProgressBar');
        const progressPercent = document.getElementById('stickerProgressPercent');
        progressContainer.classList.remove('hidden');

        let uploadedCount = 0;
        const totalFiles = files.length;

        // Upload each file
        for (let file of files) {
            await new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'chat123');

                const xhr = new XMLHttpRequest();

                // Track upload progress
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const fileProgress = (e.loaded / e.total) * 100;
                        const overallProgress = ((uploadedCount + fileProgress / 100) / totalFiles) * 100;
                        progressBar.style.width = overallProgress + '%';
                        progressPercent.textContent = Math.round(overallProgress) + '%';
                    }
                });

                // Handle completion
                xhr.addEventListener('load', async () => {
                    if (xhr.status === 200) {
                        const data = JSON.parse(xhr.responseText);

                        if (data.secure_url) {
                            // Save to Firestore
                            await db.collection('admin_stickers').add({
                                url: data.secure_url,
                                uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                uploadedBy: 'admin'
                            });

                            uploadedCount++;
                            resolve();
                        } else {
                            reject(new Error('Upload failed'));
                        }
                    } else {
                        reject(new Error('Upload failed'));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Upload failed'));
                });

                xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
                xhr.send(formData);
            });
        }

        // Reset form after all uploads complete
        document.getElementById('stickerUploadSection').classList.add('hidden');
        document.getElementById('stickerPreviewContainer').classList.add('hidden');
        progressContainer.classList.add('hidden');
        stickerFileInput.value = '';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';

        // Reload stickers
        await loadStickers();
        showAlert('Success', `${uploadedCount} sticker(s) uploaded successfully`);

    } catch (error) {
        console.error('Error uploading sticker:', error);
        document.getElementById('stickerProgressContainer').classList.add('hidden');
        showAlert('Error', `Failed to upload sticker: ${error.message}`);
    }
}

async function deleteSticker(stickerId) {
    showConfirmation(
        'Delete Sticker',
        'Are you sure you want to delete this sticker? This action cannot be undone.',
        async () => {
            try {
                await db.collection('admin_stickers').doc(stickerId).delete();
                await loadStickers();
                showAlert('Success', 'Sticker deleted successfully');
            } catch (error) {
                console.error('Error deleting sticker:', error);
                showAlert('Error', 'Failed to delete sticker');
            }
        }
    );
}

// ===========================
// Background Management
// ===========================
async function loadBackgrounds() {
    try {
        document.getElementById('backgroundsLoading').classList.remove('hidden');
        const snapshot = await db.collection('admin_backgrounds').orderBy('uploadedAt', 'desc').get();
        allBackgrounds = [];

        snapshot.forEach(doc => {
            allBackgrounds.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderBackgrounds(allBackgrounds);
        document.getElementById('backgroundsLoading').classList.add('hidden');

        // Show empty state if no backgrounds
        const emptyState = document.getElementById('backgroundsEmptyState');
        if (emptyState) {
            if (allBackgrounds.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading backgrounds:', error);
        document.getElementById('backgroundsLoading').classList.add('hidden');

        // Show error state
        const grid = document.getElementById('backgroundsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <h3>Error Loading Backgrounds</h3>
                    <p>Failed to load backgrounds. Please try again later.</p>
                    <button class="btn btn-primary" onclick="loadBackgrounds()">Retry</button>
                </div>
            `;
        }
    }
}

function renderBackgrounds(backgrounds) {
    const backgroundsGrid = document.getElementById('backgroundsGrid');
    backgroundsGrid.innerHTML = '';

    if (backgrounds.length === 0) {
        return;
    }

    backgrounds.forEach(background => {
        const backgroundItem = document.createElement('div');
        backgroundItem.className = 'media-item';

        // Format upload date
        let uploadDate = '';
        if (background.uploadedAt) {
            const date = background.uploadedAt.toDate ? background.uploadedAt.toDate() : new Date(background.uploadedAt);
            uploadDate = date.toLocaleDateString();
        }

        // Use background name or generate a friendly name
        const backgroundName = background.name || `Background #${background.id.substring(0, 8)}`;

        backgroundItem.innerHTML = `
            <img src="${background.thumbnailUrl || background.url}" alt="${backgroundName}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage Error%3C/text%3E%3C/svg%3E'">
            <div class="media-overlay">
                <div class="media-info">
                    <span class="media-type-badge">Background</span>
                    <p class="media-title" title="${backgroundName}">${backgroundName}</p>
                    <p class="media-date">${uploadDate}</p>
                </div>
                <button class="media-delete-btn" onclick="deleteBackground('${background.id}')" title="Delete background">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        `;
        backgroundsGrid.appendChild(backgroundItem);
    });
}

async function handleBackgroundUpload() {
    const backgroundFileInput = document.getElementById('backgroundFileInput');
    const backgroundNameInput = document.getElementById('backgroundNameInput');
    const file = backgroundFileInput.files[0];
    const name = backgroundNameInput.value.trim();

    if (!file) {
        showAlert('Error', 'Please select a background file');
        return;
    }

    if (!name) {
        showAlert('Error', 'Please enter a background name');
        return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showAlert('Error', 'Please select a valid image file (JPG or PNG)');
        return;
    }

    try {
        // Show progress container
        const progressContainer = document.getElementById('backgroundProgressContainer');
        const progressBar = document.getElementById('backgroundProgressBar');
        const progressPercent = document.getElementById('backgroundProgressPercent');
        progressContainer.classList.remove('hidden');

        // Upload to Cloudinary with progress tracking
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'chat123');

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressPercent.textContent = Math.round(percentComplete) + '%';
            }
        });

        // Handle completion
        xhr.addEventListener('load', async () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);

                if (data.secure_url) {
                    // Generate thumbnail URL by transforming the image
                    const thumbnailUrl = data.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200/');

                    // Save to Firestore
                    await db.collection('admin_backgrounds').add({
                        name: name,
                        url: data.secure_url,
                        thumbnailUrl: thumbnailUrl,
                        uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        uploadedBy: 'admin'
                    });

                    // Reset form
                    document.getElementById('backgroundUploadSection').classList.add('hidden');
                    document.getElementById('backgroundPreviewContainer').classList.add('hidden');
                    progressContainer.classList.add('hidden');
                    backgroundFileInput.value = '';
                    backgroundNameInput.value = '';
                    progressBar.style.width = '0%';
                    progressPercent.textContent = '0%';

                    // Reload backgrounds
                    await loadBackgrounds();
                    showAlert('Success', 'Background uploaded successfully');
                } else {
                    throw new Error('Upload failed');
                }
            } else {
                throw new Error('Upload failed');
            }
        });

        xhr.addEventListener('error', () => {
            progressContainer.classList.add('hidden');
            showAlert('Error', 'Failed to upload background');
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
        xhr.send(formData);

    } catch (error) {
        console.error('Error uploading background:', error);
        document.getElementById('backgroundProgressContainer').classList.add('hidden');
        showAlert('Error', 'Failed to upload background');
    }
}

async function deleteBackground(backgroundId) {
    showConfirmation(
        'Delete Background',
        'Are you sure you want to delete this background? This action cannot be undone.',
        async () => {
            try {
                await db.collection('admin_backgrounds').doc(backgroundId).delete();
                await loadBackgrounds();
                showAlert('Success', 'Background deleted successfully');
            } catch (error) {
                console.error('Error deleting background:', error);
                showAlert('Error', 'Failed to delete background');
            }
        }
    );
}
