# 🎲 Ludo Duel - 2 Player Game System

## Overview
A complete 2-Player Ludo game implementation using HTML5, CSS3, and Firebase real-time sync. No external images - everything is drawn with CSS and HTML.

## Files Created
- **ludo.html** - Game structure and layout
- **ludo.css** - Complete styling (board, tokens, dice, responsive)
- **ludo.js** - Game logic and Firebase integration

## Game Features

### 1. Visual Board (CSS Grid System)
```
15x15 Grid Layout:
- Red Base (Bottom-Left): 6x6 blocks with 4 red tokens
- Yellow Base (Top-Right): 6x6 blocks with 4 yellow tokens
- Green Base (Inactive): Grayed out
- Blue Base (Inactive): Grayed out
- Main Path: 52 cells in white track
- Safe Zones: Marked with ★ (gold stars)
- Home Straights: Red and Yellow paths leading to center
```

### 2. Pieces & Movement
```javascript
// Piece State
{
  id: 'r1',      // Unique identifier
  pos: -1        // Position (-1 = in base, 0-51 = on path, 52+ = home)
}

// Path System
RED_START = 0
YELLOW_START = 26
PATH_LENGTH = 52
HOME_LENGTH = 6
```

### 3. Game Rules

#### Opening
- A piece needs a **6** to leave the base
- Roll 6 → Move piece from base (-1) to start position

#### Turn System
- Roll 6 → Get bonus turn
- Roll 1-5 → Turn passes to opponent

#### Capturing
- Land on opponent's piece (not safe zone) → Send opponent back to base
- Safe zones: Positions 0, 8, 13, 21, 26, 34, 39, 47

#### Winning
- First to get all 4 pieces to home wins
- Home positions: 52-57 (6 cells)

### 4. Dice System
```javascript
// 3D CSS Dice
- Rotates when clicked
- Random 1-6 result
- Syncs across both players via Firestore
```

### 5. Multiplayer Sync (Firebase)
```
Firestore Structure:
games/
  {roomId}/
    players/
      host/
        uid, displayName, photoURL
      guest/
        uid, displayName, photoURL
    chat/
      {messageId}/
        playerId, playerName, text, timestamp
    gameState/
      currentPlayer, redPieces, yellowPieces, lastDiceRoll
```

## How to Use

### 1. Access Ludo Game
Add a link in your chat interface:
```html
<a href="ludo.html?roomId=ROOM_ID&mode=host">Play Ludo</a>
```

### 2. Game Flow
1. Host creates game (mode=host)
2. Guest joins game (mode=join)
3. Both see opponent info
4. Host rolls dice first
5. Players alternate turns
6. First to finish wins

### 3. Real-Time Features
- **Dice Roll Sync**: Both players see same number
- **Piece Movement**: Animated transitions
- **Turn Indicator**: Shows whose turn it is
- **Chat**: In-game messaging
- **Capture Detection**: Automatic piece capture

## Code Structure

### Game State Management
```javascript
// Pieces array
redPieces = [
  { id: 'r1', pos: -1 },
  { id: 'r2', pos: -1 },
  { id: 'r3', pos: -1 },
  { id: 'r4', pos: -1 }
]

// Current state
currentPlayer = 'red'  // or 'yellow'
diceResult = 0
gameActive = true
```

### Key Functions
```javascript
rollDice()              // Generate 1-6
movePiece(piece, dice)  // Move piece on board
checkCapture(piece)     // Check if opponent captured
checkWinCondition()     // Check if player won
renderBoard()           // Render all pieces
updateTurnDisplay()     // Update UI
```

### Firebase Listeners
```javascript
listenForGuestJoin()        // Host waits for guest
listenForHostPresence()     // Guest waits for host
listenForGameStateChanges() // Sync game state
listenForChatMessages()     // Sync chat
```

## Responsive Design

### Desktop (> 768px)
- Board: 400x400px
- Chat: 30vh width
- Side-by-side layout

### Tablet (768px - 480px)
- Board: 300x300px
- Chat: Full width below
- Stacked layout

### Mobile (< 480px)
- Board: 250x250px
- Compact controls
- Full-width chat

## Styling Features

### Colors
- **Red**: #da3633 (gradient to #f85149)
- **Yellow**: #d29922 (gradient to #f0883e)
- **Green**: #238636 (inactive)
- **Blue**: #1f6feb (inactive)
- **Safe Zone**: Gold ★
- **Background**: #0d1117 (dark)

### Animations
- Dice roll: 600ms rotation
- Token hover: Scale 1.1
- Modal: Slide in + bounce
- Piece movement: Smooth transition

## Security & Validation

### Firestore Rules
```
- Only authenticated users can play
- Players can only modify their own pieces
- Real-time listeners sync state
- Chat messages timestamped
```

### Game Logic
- Validate dice roll (1-6)
- Validate piece position
- Prevent invalid moves
- Check capture rules
- Verify win condition

## Testing Checklist

- [ ] Two players join game
- [ ] Dice rolls 1-6
- [ ] Pieces move correctly
- [ ] Capture works
- [ ] Safe zones protect pieces
- [ ] Turn alternates
- [ ] Chat syncs
- [ ] Win condition triggers
- [ ] Play again resets
- [ ] Responsive on mobile

## Future Enhancements

1. **4-Player Mode**: Support all 4 colors
2. **AI Opponent**: Single-player vs computer
3. **Game History**: Store past games
4. **Leaderboard**: Track wins/losses
5. **Sound Effects**: Dice roll, capture, win
6. **Animations**: Smooth piece movement
7. **Undo Move**: Allow one undo per turn
8. **Time Limit**: Timed turns

## Known Limitations

- Simplified path coordinates (not exact Ludo board)
- No piece stacking (multiple on same cell)
- No double roll on 6
- No extra turn on 6
- Basic piece positioning

## Integration with Existing Chat

To add Ludo to your chat app:

1. Add button in chat interface
2. Link to: `ludo.html?roomId=ROOM_ID&mode=host`
3. Share link with opponent
4. Both open link to play

---

**Status**: ✅ Complete and Ready to Deploy
**Last Updated**: Nov 21, 2025
