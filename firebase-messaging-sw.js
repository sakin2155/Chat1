// Service Worker for Firebase Cloud Messaging
// This file must be in the root directory to be accessible

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration (must match the one in script.js)
const firebaseConfig = {
    apiKey: "AIzaSyCjU48-MYfwQLDPc7C04lcyROT6s5cLH-8",
    authDomain: "chat-f5b70.firebaseapp.com",
    projectId: "chat-f5b70",
    storageBucket: "chat-f5b70.firebasestorage.app",
    messagingSenderId: "158106000000",
    appId: "1:158106000000:web:6cd2c27cdd676d306da465",
    measurementId: "G-6H096XKK6S"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a new message',
        icon: payload.notification?.icon || payload.data?.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: payload.data?.conversationId || 'message',
        data: {
            conversationId: payload.data?.conversationId,
            senderId: payload.data?.senderId,
            senderName: payload.data?.senderName,
            url: payload.data?.url || '/index.html'
        },
        requireInteraction: false,
        silent: false
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.');
    
    event.notification.close();

    const conversationId = event.notification.data?.conversationId;
    let url = event.notification.data?.url || '/index.html';
    
    // If we have a conversation ID, navigate to that chat
    if (conversationId) {
        url = `${url}?chatId=${conversationId}`;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

