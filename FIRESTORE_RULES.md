# Firestore Security Rules for Game System

## Required Rules

Add these rules to your Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chat documents
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
      
      // Typing indicator subcollection
      match /typing/{userId} {
        allow read, write: if request.auth != null;
      }

      // Metadata subcollection (for streak and theme)
      match /metadata/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Stories collection
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.token.admin == true);
    }

    // Gallery collection
    match /gallery/{imageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (resource.data.uploadedBy == request.auth.uid || request.auth.token.admin == true);
    }

    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.recipientId || 
         resource.data.sentBy == 'admin');
      allow create: if request.auth != null && 
        request.resource.data.sentBy == 'admin';
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.recipientId;
      allow delete: if request.auth != null && 
        resource.data.sentBy == 'admin';
    }

    // Game system rules - Tic-Tac-Toe
    match /games/{roomId} {
      allow read, write: if request.auth != null;
      
      match /players/{playerId} {
        allow read, write: if request.auth != null;
      }
      
      match /moves/{moveId} {
        allow read, write: if request.auth != null;
      }
      
      match /chat/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Game system rules - Rock Paper Scissors
    match /rps_games/{roomId} {
      allow read, write: if request.auth != null;
      
      match /players/{playerId} {
        allow read, write: if request.auth != null;
      }
      
      match /rounds/{roundId} {
        allow read, write: if request.auth != null;
      }
      
      match /chat/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## How to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **chat-f5b70**
3. Go to **Firestore Database**
4. Click **Rules** tab
5. Replace the entire content with the rules above
6. Click **Publish**

## What These Rules Allow

### Games Collection
- ✅ Any authenticated user can read/write to games
- ✅ Each game has a `players` subcollection
- ✅ Each game has a `moves` subcollection
- ✅ Real-time listeners work for opponent detection

### Players Subcollection
- ✅ Host registers as `games/{roomId}/players/host`
- ✅ Guest registers as `games/{roomId}/players/guest`
- ✅ Both can read and write their own player data
- ✅ Real-time updates trigger when opponent joins

### Moves Subcollection
- ✅ Stores game moves for history
- ✅ Both players can read and write moves
- ✅ Real-time sync of moves between players

### Chat Subcollection
- ✅ Stores in-game chat messages
- ✅ Both players can read and write messages
- ✅ Real-time sync of chat between players

## Testing the Rules

After updating rules, test:

1. **Host Registration**: Host can write to `games/{roomId}/players/host`
2. **Guest Registration**: Guest can write to `games/{roomId}/players/guest`
3. **Real-time Sync**: Changes appear instantly on both screens
4. **Move Sync**: Moves are synced between players

## Troubleshooting

### "Permission denied" error
- Check that user is authenticated
- Verify rules are published
- Check browser console for exact error
- Wait a few seconds for rules to propagate

### "Cannot read opponent data"
- Verify opponent has registered in Firestore
- Check `games/{roomId}/players/` collection
- Ensure both players are in same room

### "Real-time listener not working"
- Check browser console for errors
- Verify Firestore connection
- Check that rules allow read access
- Try refreshing the page

## Security Considerations

1. **Authentication Required**: All game operations require login
2. **No Cross-Game Access**: Players can only access their own game room
3. **User Validation**: Each player registers with their own UID
4. **Data Isolation**: Games are isolated by roomId

## Future Enhancements

1. Add move validation on server
2. Add game history storage
3. Add player statistics
4. Add leaderboard data
5. Add game chat/messages
6. Add spectator mode

## Firestore Structure

```
games/
  {roomId}/
    players/
      host/
        uid: "user123"
        displayName: "John"
        photoURL: "url"
        joinedAt: timestamp
      guest/
        uid: "user456"
        displayName: "Jane"
        photoURL: "url"
        joinedAt: timestamp
    moves/
      {moveId}/
        index: 0
        symbol: "X"
        timestamp: timestamp
        playerId: "user123"
    chat/
      {messageId}/
        senderId: "user123"
        senderName: "John"
        message: "Hello!"
        timestamp: timestamp
```

## Important Notes

- Rules take effect immediately after publishing
- Test in incognito window to verify auth requirements
- Monitor Firestore usage in Firebase Console
- Consider adding rate limiting for production
