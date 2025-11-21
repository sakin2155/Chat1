# Setup Firestore Rules - Step by Step

## ⚠️ IMPORTANT: Do This First!

The game system won't work without proper Firestore rules. Follow these steps:

## Step 1: Open Firebase Console

1. Go to https://console.firebase.google.com/
2. Click on your project: **chat-f5b70**
3. You should see the Firebase dashboard

## Step 2: Navigate to Firestore Rules

1. In the left sidebar, click **Firestore Database**
2. Click the **Rules** tab at the top
3. You'll see the current security rules

## Step 3: Copy the New Rules

Copy this entire code block:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules for chats and messages
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        (resource.data.participants[request.auth.uid] != null || 
         request.resource.data.participants[request.auth.uid] != null);
      
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          (get(/databases/$(database)/documents/chats/$(chatId)).data.participants[request.auth.uid] != null);
        allow create: if request.auth != null && 
          (get(/databases/$(database)/documents/chats/$(chatId)).data.participants[request.auth.uid] != null) &&
          request.resource.data.senderId == request.auth.uid;
        allow update, delete: if request.auth != null && 
          resource.data.senderId == request.auth.uid;
      }
    }

    // Game system rules
    match /games/{roomId} {
      allow read, write: if request.auth != null;
      
      match /players/{playerId} {
        allow read, write: if request.auth != null;
      }
      
      match /moves/{moveId} {
        allow read, write: if request.auth != null;
      }
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 4: Replace Existing Rules

1. Select all text in the rules editor (Ctrl+A)
2. Delete it
3. Paste the new rules from Step 3
4. You should see the code highlighted in the editor

## Step 5: Publish the Rules

1. Click the **Publish** button (top right)
2. A dialog will appear asking to confirm
3. Click **Publish** again
4. Wait for the notification "Rules updated successfully"

## Step 6: Verify Rules Are Active

1. You should see a green checkmark
2. The message "Rules updated" appears
3. Rules are now live

## Step 7: Test the Game System

1. Open your chat app in two browser windows
2. Login as two different users
3. Send a game invite
4. Both players should see the game board (no more waiting screen)

## ✅ Checklist

- [ ] Opened Firebase Console
- [ ] Navigated to Firestore Database → Rules
- [ ] Copied new rules
- [ ] Replaced old rules
- [ ] Clicked Publish
- [ ] Got confirmation message
- [ ] Tested game system

## 🐛 Troubleshooting

### "Rules have errors" message
- Check for typos in the rules
- Make sure all brackets are matched
- Copy the rules again from this file

### "Permission denied" when playing
- Wait 30 seconds for rules to propagate
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh the page
- Try in incognito window

### "Opponent still not joining"
- Check browser console (F12) for errors
- Verify both players are logged in
- Check Firestore Database to see if players are registered
- Try refreshing the page

### Can't see Firestore Database option
- Make sure you're in the right project
- Check that Firestore is enabled
- Go to https://console.firebase.google.com/
- Select project "chat-f5b70"

## 📊 Check Firestore Data

To verify the game system is working:

1. In Firebase Console, go to **Firestore Database**
2. Click **Data** tab
3. You should see a `games` collection
4. Inside, you'll see `{roomId}` folders
5. Inside each room, you'll see `players` folder
6. Inside players, you'll see `host` and `guest` documents

## ⏱️ How Long Does It Take?

- Rules publish: **1-2 seconds**
- Rules propagate: **Up to 30 seconds**
- Game detection: **Real-time (instant)**

## 🔒 Security Notes

These rules ensure:
- ✅ Only logged-in users can access games
- ✅ Users can only see their own games
- ✅ No unauthorized data access
- ✅ Real-time sync is secure

## 📞 Need Help?

1. Check browser console (F12) for error messages
2. Look at Firestore Database to see if data is being saved
3. Verify you're in the correct Firebase project
4. Try in a different browser
5. Clear cache and cookies

## Next Steps

After rules are published:

1. ✅ Test the game system
2. ✅ Follow GAME_TESTING.md for full testing
3. ✅ Check QUICK_START.md for usage guide

## Important Reminders

- 🔴 Rules must be published for game to work
- 🔴 Don't use test mode rules (they expire)
- 🔴 Keep these rules secure
- 🔴 Update rules if adding new features

---

**You're all set!** The game system should now work perfectly. 🎮
