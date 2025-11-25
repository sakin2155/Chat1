# Stealth Calculator Messenger

A fully functional chat application disguised as an iOS Calculator. Built with vanilla JavaScript, Firebase, and Cloudinary.

## 🎯 Features

### The Disguise
- **iOS Calculator Clone**: Pixel-perfect dark theme calculator interface
- **Functional Math**: Performs real calculations to maintain the disguise
- **Secret Login**: Hidden π button in top-left corner for authentication
- **Passcode Unlock**: Enter your passcode + press "=" to reveal the chat app

### The Messenger
- **Real-time Chat**: Instant messaging with Firebase Firestore
- **User Presence**: Online/offline status indicators
- **Typing Indicators**: See when someone is typing
- **Read Receipts**: "Seen" status for sent messages
- **Message Reactions**: Double-click (desktop) or long-press (mobile) to react with emojis
- **Edit & Delete**: Manage your own messages
- **Image Sharing**: Upload images via Cloudinary
- **Responsive Design**: Mobile-first with desktop split-view

## 🚀 Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → Email/Password
4. Create a **Firestore Database** (Start in production mode)
5. Set up Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null && 
          resource.data.senderId == request.auth.uid;
      }
      
      match /typing/{userId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

6. Get your Firebase config from Project Settings → General → Your apps
7. Open `script.js` and paste your config into the `firebaseConfig` object:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Cloudinary Configuration

1. Sign up at [Cloudinary](https://cloudinary.com/) (Free tier)
2. Go to Settings → Upload → Upload presets
3. Create an **unsigned upload preset**
4. Open `script.js` and add your credentials:

```javascript
const CLOUDINARY_CLOUD_NAME = "your_cloud_name";
const CLOUDINARY_UPLOAD_PRESET = "your_unsigned_preset";
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository (or drag & drop the folder)
3. Deploy!

#### Option C: Manual Upload
1. Zip the project folder
2. Upload to Vercel dashboard
3. Deploy

## 📱 Usage

### First Time Setup
1. Open the app (looks like a calculator)
2. Click the **π** symbol in top-left
3. Create an account with:
   - Email
   - Password
   - Display Name
   - **Passcode** (e.g., "1234")
4. Login

### Unlocking the Chat
1. Login via the π button
2. Type your passcode on the calculator (e.g., "1234")
3. Press **=**
4. The calculator disappears, revealing the messenger!

### Using the Messenger
- **Select a user** from the left sidebar to start chatting
- **Type and send** messages
- **Double-click** a message (desktop) or **long-press** (mobile) to add reactions
- **Click the ⋯** on your messages to edit or delete
- **Click 📎** to upload images
- **Logout** via the ⎋ button (returns to calculator)

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase v9 (Modular SDK)
  - Authentication
  - Firestore Database
- **Storage**: Cloudinary (Image uploads)
- **Hosting**: Vercel

## 📁 File Structure

```
stealth-calculator-messenger/
├── index.html          # Main HTML structure
├── style.css           # All styling (calculator + messenger)
├── script.js           # Application logic + Firebase integration
├── vercel.json         # Vercel deployment config
└── README.md           # This file
```

## 🔒 Security Notes

- Passcodes are stored in plain text in Firestore (for demo purposes)
- For production, implement proper encryption
- Firestore rules prevent unauthorized access
- All communication happens over HTTPS

## 💡 Tips

- Use a memorable passcode (e.g., "1234", "9999")
- The calculator is fully functional - try doing math!
- Messages are truly real-time (no refresh needed)
- Works on mobile and desktop

## 🐛 Troubleshooting

**Calculator doesn't unlock:**
- Make sure you're logged in (click π)
- Verify your passcode is correct
- Check browser console for errors

**Images won't upload:**
- Verify Cloudinary credentials in `script.js`
- Check that upload preset is "unsigned"
- Ensure file size is under Cloudinary limits

**Messages not appearing:**
- Check Firebase console for errors
- Verify Firestore rules are set correctly
- Check browser console for errors

## 📄 License

MIT License - Feel free to use and modify!

## 🙏 Credits

Built with ❤️ using vanilla JavaScript and Firebase.
