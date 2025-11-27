/**
 * Backend Server for FCM Push Notifications
 * 
 * This server listens to Firestore for new messages and sends push notifications
 * to users who are offline and have notifications enabled.
 * 
 * Setup Instructions:
 * 1. Install dependencies: npm install express firebase-admin cors dotenv
 * 2. Get your Firebase Admin SDK credentials:
 *    - Go to Firebase Console > Project Settings > Service Accounts
 *    - Click "Generate New Private Key" and save as serviceAccountKey.json
 * 3. Get your FCM Server Key:
 *    - Go to Firebase Console > Project Settings > Cloud Messaging
 *    - Copy the "Server key" (Legacy) or use the service account
 * 4. Set environment variables or update the config below
 * 5. Run: node server.js
 * 
 * For production, deploy this to a service like:
 * - Firebase Cloud Functions
 * - Vercel Serverless Functions
 * - AWS Lambda
 * - Google Cloud Run
 */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
// Option 1: Use service account key file (for local development)
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized with service account');
} catch (error) {
    // Option 2: Use environment variables (for production)
    if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL
            })
        });
        console.log('Firebase Admin initialized with environment variables');
    } else {
        console.error('Firebase Admin initialization failed. Please set up credentials.');
        process.exit(1);
    }
}

const db = admin.firestore();

/**
 * Send FCM notification to a user
 */
async function sendFCMNotification(recipientToken, notificationData) {
    if (!recipientToken) {
        console.log('No FCM token for recipient');
        return false;
    }

    const message = {
        notification: {
            title: notificationData.title || 'New Message',
            body: notificationData.body || 'You have a new message'
        },
        data: {
            conversationId: notificationData.conversationId || '',
            senderId: notificationData.senderId || '',
            senderName: notificationData.senderName || 'Someone',
            url: notificationData.url || '/index.html',
            type: 'message'
        },
        token: recipientToken,
        webpush: {
            fcmOptions: {
                link: notificationData.url || '/index.html'
            }
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        
        // If token is invalid, remove it from database
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
            console.log('Removing invalid token from database');
            try {
                const userRef = db.collection('users').doc(notificationData.recipientId);
                await userRef.update({
                    fcmToken: admin.firestore.FieldValue.delete(),
                    notifications_enabled: false
                });
            } catch (updateError) {
                console.error('Error removing invalid token:', updateError);
            }
        }
        return false;
    }
}

/**
 * Check if user is online (has active presence)
 */
async function isUserOnline(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return false;
        }
        
        const userData = userDoc.data();
        const status = userData.status;
        
        // User is online if status is 'online'
        return status === 'online';
    } catch (error) {
        console.error('Error checking user online status:', error);
        return false; // Assume offline on error
    }
}

/**
 * Get recipient user data including FCM token
 */
async function getRecipientData(recipientId) {
    try {
        const userDoc = await db.collection('users').doc(recipientId).get();
        if (!userDoc.exists) {
            return null;
        }
        
        const userData = userDoc.data();
        return {
            fcmToken: userData.fcmToken || null,
            notifications_enabled: userData.notifications_enabled === true,
            displayName: userData.displayName || 'User'
        };
    } catch (error) {
        console.error('Error getting recipient data:', error);
        return null;
    }
}

/**
 * Get sender user data
 */
async function getSenderData(senderId) {
    try {
        const userDoc = await db.collection('users').doc(senderId).get();
        if (!userDoc.exists) {
            return { displayName: 'Someone' };
        }
        
        const userData = userDoc.data();
        return {
            displayName: userData.displayName || 'Someone'
        };
    } catch (error) {
        console.error('Error getting sender data:', error);
        return { displayName: 'Someone' };
    }
}

/**
 * Listen to Firestore for new messages
 */
function setupMessageListener() {
    console.log('Setting up Firestore message listener...');
    
    // Listen to all chats
    db.collection('chats').onSnapshot((chatsSnapshot) => {
        chatsSnapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const chatId = change.doc.id;
                const chatData = change.doc.data();
                
                // Listen to messages in this chat
                db.collection('chats').doc(chatId).collection('messages')
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .onSnapshot(async (messagesSnapshot) => {
                        messagesSnapshot.docChanges().forEach(async (msgChange) => {
                            if (msgChange.type === 'added') {
                                const messageData = msgChange.doc.data();
                                
                                // Only process text, image, and voice messages (not system messages)
                                if (messageData.type === 'system' || messageData.type === 'game_invite') {
                                    return;
                                }
                                
                                // Get participants
                                const participants = chatData.participants || [];
                                if (participants.length !== 2) {
                                    return; // Only handle 1-on-1 chats
                                }
                                
                                // Find recipient (the one who didn't send the message)
                                const recipientId = participants.find(id => id !== messageData.senderId);
                                if (!recipientId) {
                                    return;
                                }
                                
                                // Get recipient data
                                const recipientData = await getRecipientData(recipientId);
                                if (!recipientData || !recipientData.notifications_enabled) {
                                    return; // Notifications disabled or no data
                                }
                                
                                // Check if user is online
                                const isOnline = await isUserOnline(recipientId);
                                if (isOnline) {
                                    return; // User is online, no need to send push notification
                                }
                                
                                // Get sender data
                                const senderData = await getSenderData(messageData.senderId);
                                
                                // Prepare notification
                                let notificationBody = '';
                                if (messageData.type === 'image') {
                                    notificationBody = '📷 Sent a photo';
                                } else if (messageData.type === 'voice') {
                                    notificationBody = '🎤 Sent a voice message';
                                } else if (messageData.text) {
                                    // Truncate long messages
                                    notificationBody = messageData.text.length > 100 
                                        ? messageData.text.substring(0, 100) + '...'
                                        : messageData.text;
                                } else {
                                    notificationBody = 'Sent a message';
                                }
                                
                                // Send notification
                                await sendFCMNotification(recipientData.fcmToken, {
                                    title: senderData.displayName,
                                    body: notificationBody,
                                    conversationId: chatId,
                                    senderId: messageData.senderId,
                                    senderName: senderData.displayName,
                                    url: '/index.html',
                                    recipientId: recipientId
                                });
                            }
                        });
                    });
            }
        });
    }, (error) => {
        console.error('Error in Firestore listener:', error);
    });
}

/**
 * REST API endpoint to manually send a notification (for testing)
 */
app.post('/send-notification', async (req, res) => {
    try {
        const { recipientToken, title, body, conversationId, senderId, senderName } = req.body;
        
        if (!recipientToken) {
            return res.status(400).json({ error: 'recipientToken is required' });
        }
        
        const success = await sendFCMNotification(recipientToken, {
            title: title || 'New Message',
            body: body || 'You have a new message',
            conversationId: conversationId || '',
            senderId: senderId || '',
            senderName: senderName || 'Someone',
            url: '/index.html'
        });
        
        if (success) {
            res.json({ success: true, message: 'Notification sent' });
        } else {
            res.status(500).json({ error: 'Failed to send notification' });
        }
    } catch (error) {
        console.error('Error in send-notification endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FCM Notification Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    
    // Setup Firestore listener
    setupMessageListener();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

