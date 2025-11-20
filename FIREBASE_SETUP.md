# How to Get Your Firebase Configuration

Follow these steps to get your Firebase config for the Stealth Calculator Messenger app.

## Step 1: Go to Firebase Console

1. Open your browser and navigate to: **https://console.firebase.google.com/**
2. Sign in with your Google account

## Step 2: Create or Select a Project

### Option A: Create a New Project
1. Click the **"Add project"** or **"Create a project"** button
2. Enter a project name (e.g., "Stealth Messenger")
3. Click **Continue**
4. (Optional) Enable Google Analytics - you can toggle this off for simplicity
5. Click **Create project**
6. Wait for the project to be created, then click **Continue**

### Option B: Use an Existing Project
1. Click on an existing project from the list

## Step 3: Register Your Web App

1. On the project overview page, look for the **"Get started by adding Firebase to your app"** section
2. Click the **Web icon** (looks like `</>`)
3. Enter an app nickname (e.g., "Stealth Calculator Web")
4. **Do NOT** check "Also set up Firebase Hosting" (we're using Vercel)
5. Click **Register app**

## Step 4: Copy Your Firebase Config

You'll see a code snippet that looks like this:

```javascript
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefghijklmnop",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**Copy the entire `firebaseConfig` object** (everything between the curly braces `{}`).

## Step 5: Paste Config into Your Code

1. Open `script.js` in your project folder
2. Find lines 22-28 where it says:

```javascript
const firebaseConfig = {
    // Paste your Firebase config here
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
```

3. Replace the empty strings with your actual values:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyB1234567890abcdefghijklmnop",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 6: Enable Authentication

1. In the Firebase Console, click **Build** in the left sidebar
2. Click **Authentication**
3. Click **Get started**
4. Click on the **Sign-in method** tab
5. Click **Email/Password**
6. Toggle **Enable** to ON
7. Click **Save**

## Step 7: Create Firestore Database

1. In the left sidebar, click **Build** → **Firestore Database**
2. Click **Create database**
3. Select **Start in production mode** (we'll add rules next)
4. Click **Next**
5. Choose a Cloud Firestore location (pick closest to your users)
6. Click **Enable**

## Step 8: Set Firestore Security Rules

1. Once the database is created, click the **Rules** tab
2. Replace the existing rules with this:

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

3. Click **Publish**

## Step 9: Find Your Config Later (If Needed)

If you need to find your config again:

1. Go to Firebase Console
2. Click the **gear icon** ⚙️ next to "Project Overview"
3. Click **Project settings**
4. Scroll down to **"Your apps"** section
5. Find your web app
6. Click the **Config** radio button (not SDK)
7. Copy the `firebaseConfig` object

## ✅ You're Done!

Your Firebase is now configured. Next step: Set up Cloudinary for image uploads!

---

## Quick Reference: What Each Config Value Means

- **apiKey**: Your app's API key (public, safe to expose)
- **authDomain**: Domain for Firebase Authentication
- **projectId**: Your unique project identifier
- **storageBucket**: Cloud Storage bucket (not used in this app)
- **messagingSenderId**: For Firebase Cloud Messaging
- **appId**: Your unique app identifier

## Troubleshooting

**Can't find the web icon?**
- Make sure you're on the Project Overview page
- Look for the section that says "Get started by adding Firebase to your app"
- The web icon looks like `</>`

**Already registered an app?**
- Go to Project Settings (gear icon)
- Scroll to "Your apps"
- Click "Add app" → Web icon

**Need to reset your API key?**
- Go to Project Settings → General
- Under "Web API Key", you can regenerate it
