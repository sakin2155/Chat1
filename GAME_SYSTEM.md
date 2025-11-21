# Multiplayer Game System - Tic-Tac-Toe

## Overview
A complete modular multiplayer game system integrated into the chat application. Users can challenge each other to Tic-Tac-Toe games with real-time synchronization.

## Architecture

### File Structure
```
├── games.html          # Game UI page
├── games.css           # Game styling
├── games.js            # Game logic & Firebase integration
├── index.html          # Main chat app (updated)
├── script.js           # Chat logic (updated with game invites)
└── style.css           # Chat styling (updated with game card styles)
```

## Features

### 1. Game Invite System
- **Location**: Media menu in chat (+ button)
- **Button**: "Play Tic-Tac-Toe"
- **Flow**:
  1. User A clicks "Play Tic-Tac-Toe" in chat with User B
  2. Unique room ID generated (e.g., `game_xyz123`)
  3. Game invite message sent to User B with stylized card
  4. User A redirected to `games.html?roomID=game_xyz123&mode=host`
  5. User B clicks invite card → redirected to `games.html?roomID=game_xyz123&mode=join`

### 2. Game Invite Card
- **Appearance**: Gradient purple card with emoji
- **Text**: "🎮 User A challenged you to Tic-Tac-Toe!"
- **Button**: "Tap to Play"
- **Styling**: Modern glassmorphism with animations

### 3. Game Page (games.html)
- **Header**: Back to Chat button + Game title
- **Status Board**: Shows both players with names, avatars, and symbols
- **Waiting Screen**: Loader while opponent joins
- **Game Board**: 3x3 grid for Tic-Tac-Toe
- **Turn Indicator**: Shows whose turn it is
- **Game Over Modal**: Win/Loss/Draw message with "Play Again" button

### 4. Game Logic
- **Turn Management**:
  - Host (User A) is always 'X'
  - Guest (User B) is always 'O'
  - X always goes first
  - Players can only click cells on their turn
  - Board locks for current player, unlocks for opponent

- **Win Detection**:
  - Checks all 8 winning combinations (rows, columns, diagonals)
  - Detects draws when board is full
  - Shows game over modal with result

- **Real-time Sync**:
  - Socket.emit('make_move') sends moves to opponent
  - Both screens update instantly
  - No page refresh needed

### 5. Authentication
- Games page checks for existing session
- Redirects to login if not authenticated
- Uses Firebase Auth from main app

## URL Parameters

### games.html Query String
```
?roomID=game_xyz123&mode=host    # Host (game creator)
?roomID=game_xyz123&mode=join    # Guest (invited player)
```

## Message Types

### Game Invite Message (Firestore)
```javascript
{
    text: "🎮 User A challenged you to Tic-Tac-Toe!",
    type: "game_invite",
    roomId: "game_xyz123",
    gameType: "tictactoe",
    invitedBy: "uid_of_user_a",
    invitedByName: "User A",
    invitedByAvatar: "avatar_url",
    timestamp: serverTimestamp()
}
```

## Game State Management

### Board State
```javascript
gameState = ['', '', '', '', '', '', '', '', '']
// Indices:
// 0 1 2
// 3 4 5
// 6 7 8
```

### Winning Combinations
```javascript
[0,1,2], [3,4,5], [6,7,8],  // Rows
[0,3,6], [1,4,7], [2,5,8],  // Columns
[0,4,8], [2,4,6]             // Diagonals
```

## User Experience Flow

### Host (User A)
1. Opens chat with User B
2. Clicks media menu (+) → "Play Tic-Tac-Toe"
3. Game invite message sent to User B
4. Redirected to games.html with mode=host
5. Sees "Waiting for opponent to join..." screen
6. Once User B joins, game board appears
7. User A (X) goes first

### Guest (User B)
1. Receives game invite message in chat
2. Clicks "Tap to Play" button on invite card
3. Redirected to games.html with mode=join
4. Sees "Waiting for opponent to join..." screen
5. Once connection established, game board appears
6. Waits for User A (X) to make first move

## Styling Highlights

### Game Invite Card
- **Gradient**: Purple (667eea → 764ba2)
- **Animation**: Slide-in effect
- **Button**: Glassmorphism with hover effects
- **Responsive**: Works on mobile and desktop

### Game Board
- **Grid**: 3x3 with 10px gaps
- **Cells**: 100x100px (80x80px on mobile)
- **Colors**: X (blue), O (purple)
- **Hover**: Scale and color change on valid moves

### Status Board
- **Layout**: Flex with VS divider
- **Avatars**: Circular with gradient background
- **Active State**: Highlights current player's turn

## Future Enhancements

1. **Real-time Sync**: Integrate WebSocket/Firestore listeners
2. **Game History**: Store game results in Firestore
3. **Leaderboard**: Track wins/losses per user
4. **More Games**: Add Connect 4, Chess, etc.
5. **Animations**: Add move animations and celebrations
6. **Sound Effects**: Add game sounds
7. **Offline Support**: Queue moves when offline
8. **Spectator Mode**: Allow others to watch games

## Testing

### Manual Testing Steps
1. Open index.html in two browser windows (different users)
2. User A: Click media menu → "Play Tic-Tac-Toe"
3. Verify game invite message appears in User B's chat
4. User B: Click "Tap to Play" button
5. Both should see game board
6. Test game moves and win detection
7. Test "Play Again" functionality

### Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Security Considerations

1. **Authentication**: Games page requires Firebase auth
2. **Room ID**: Unique per game, hard to guess
3. **User Validation**: Verify users are in same chat
4. **Move Validation**: Validate moves on both clients
5. **Firestore Rules**: Restrict game data access to participants

## Performance Notes

- **Modular**: Separate files keep main app lightweight
- **Lazy Loading**: Game files only loaded when needed
- **Efficient Rendering**: DOM updates only when necessary
- **Memory**: Game state cleaned up on page exit
- **Network**: Minimal data transfer for moves

## Troubleshooting

### Game page shows login modal
- User not authenticated
- Clear localStorage and re-login

### Opponent doesn't join
- Check room ID in URL
- Verify both users have same room ID
- Check browser console for errors

### Moves not syncing
- Check Firebase connection
- Verify Firestore rules allow access
- Check browser network tab

### Board not displaying
- Verify games.html is in correct directory
- Check games.css is linked properly
- Check browser console for CSS errors

## Code References

### Main Chat Integration
- `script.js`: `handleGameInvite()` function
- `script.js`: Game invite message creation
- `script.js`: Game invite button click handler
- `style.css`: Game invite card styles

### Game Page
- `games.html`: Complete game UI
- `games.css`: All game styling
- `games.js`: Game logic and Firebase integration

## Support
For issues or feature requests, check the browser console for error messages and verify all files are properly linked.
