// ===========================
// Firebase Configuration
// ===========================
let auth, db, storage;
let firebaseReady = false;

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
            loadInfrastructureData()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// ===========================
// User Management
// ===========================
async function loadUsers() {
    try {
        document.getElementById('usersLoading').classList.remove('hidden');
        const snapshot = await db.collection('users').get();
        allUsers = [];

        snapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Update stats
        document.getElementById('totalUsers').textContent = allUsers.length;
        document.getElementById('dbUsers').textContent = allUsers.length;

        renderUsers(allUsers);
        document.getElementById('usersLoading').classList.add('hidden');
    } catch (error) {
        console.error('Error loading users:', error);
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
                <button class="delete-btn" onclick="deleteUser('${user.id}', '${user.displayName || 'User'}')">
                    Delete User
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
    switch(sortBy) {
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
