# Test Real-Time Sync & Game Persistence

## Quick Test (5 minutes)

### Setup
1. Open two browser windows
2. Login as User A in Window 1
3. Login as User B in Window 2
4. Open chat between them

### Test 1: Real-Time Move Sync

**Step 1: Start Game**
- User A: Click media menu (+) → "Play Tic-Tac-Toe"
- User B: Click "Tap to Play" on invite card
- Both should see game board

**Step 2: Make Moves**
- User A: Click center cell (index 4)
- **Check**: User B's screen shows X in center instantly
- User B: Click top-left cell (index 0)
- **Check**: User A's screen shows O in top-left instantly

**Expected Result**: ✅ Moves appear instantly on both screens

**Console Check**: Look for:
```
Move saved to Firestore
Moves listener triggered
Game state updated from Firestore
```

---

### Test 2: Game Persistence (Resume Game)

**Step 1: Play a Few Moves**
- Make 3-4 moves in the game
- Board should show: X, O, X, O...

**Step 2: User A Refreshes**
- User A: Press F5 to refresh page
- **Check**: Game board shows same position as before

**Step 3: User B Continues**
- User B: Make another move
- **Check**: User A's refreshed page shows the new move

**Expected Result**: ✅ Game state persists after refresh

**Console Check**: Look for:
```
Loading game state from Firestore...
Game state loaded: {gameState: [...]}
```

---

### Test 3: Play Again Functionality

**Step 1: Play Until Win**
- Continue playing until someone gets 3 in a row
- Game over modal appears

**Step 2: Click "Play Again"**
- Both players click "Play Again"
- **Check**: Board clears completely
- **Check**: Turn indicator shows "Your Turn" for User A (X)

**Step 3: Play New Game**
- Make moves in new game
- **Check**: Moves work normally

**Expected Result**: ✅ Board resets for both players

**Console Check**: Look for:
```
All moves cleared for new game
Game state saved to Firestore
Moves listener triggered, count: 0
```

---

### Test 4: Back to Chat & Resume

**Step 1: Play a Few Moves**
- Make 3-4 moves

**Step 2: User A Clicks "Back to Chat"**
- User A: Click "Back to Chat" button
- Redirected to index.html

**Step 3: User B Continues**
- User B: Make another move
- Game continues

**Step 4: User A Rejoins**
- User A: Go back to chat
- User A: Click "Play Tic-Tac-Toe" again
- **Check**: Game board shows current state
- **Check**: Can continue playing

**Expected Result**: ✅ Can leave and rejoin game

---

## Advanced Testing

### Test 5: Simultaneous Moves
1. Both players try to click at same time
2. **Check**: Only one move registers
3. **Check**: Turn switches correctly

### Test 6: Network Delay
1. Open DevTools → Network tab
2. Throttle to "Slow 3G"
3. Make moves
4. **Check**: Moves still sync (slower but work)

### Test 7: Multiple Games
1. Play one game to completion
2. Click "Play Again"
3. Play second game
4. **Check**: Both games work independently

### Test 8: Leave Mid-Game
1. Play a few moves
2. User A: Close browser completely
3. User B: Continue playing
4. User A: Reopen browser and rejoin
5. **Check**: Game state restored

---

## Debugging Checklist

- [ ] Firestore rules are published
- [ ] Both players see game board (no waiting screen)
- [ ] Moves appear instantly (< 1 second)
- [ ] Console shows "Move saved to Firestore"
- [ ] Console shows "Game state updated from Firestore"
- [ ] Refreshing page loads game state
- [ ] Play Again clears board for both
- [ ] Can leave and rejoin game
- [ ] Game state persists after refresh

---

## Common Issues

### Moves Not Syncing
**Symptom**: Make move, opponent doesn't see it

**Check**:
1. Console for errors
2. Firestore Database → games/{roomId}/moves
3. Verify moves collection has documents

**Fix**:
1. Refresh page
2. Check Firestore rules
3. Try different browser

### Game State Not Loading
**Symptom**: Refresh page, board is empty

**Check**:
1. Console for "Loading game state" message
2. Firestore Database → games/{roomId}
3. Verify gameState field exists

**Fix**:
1. Make a move to save state
2. Refresh page
3. Check Firestore rules

### Play Again Not Working
**Symptom**: Click Play Again, board doesn't clear

**Check**:
1. Console for "All moves cleared" message
2. Firestore Database → games/{roomId}/moves
3. Verify moves collection is empty

**Fix**:
1. Refresh page
2. Try again
3. Check Firestore rules

---

## Performance Expectations

| Action | Expected Time |
|--------|---|
| Make move | < 1 second |
| Move appears on opponent screen | < 1 second |
| Load game state on refresh | < 2 seconds |
| Play Again reset | < 1 second |

---

## Console Commands

Check game state in console:

```javascript
// Check current game state
console.log('Game State:', gameState);
console.log('Current Turn:', currentTurn);
console.log('Game Over:', gameOver);
console.log('Room ID:', roomId);

// Check opponent data
console.log('Opponent:', opponentData);

// Check Firestore connection
console.log('DB:', db);
```

---

## Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________

Test 1 (Real-Time Sync): ✅ ❌
Test 2 (Persistence): ✅ ❌
Test 3 (Play Again): ✅ ❌
Test 4 (Resume): ✅ ❌

Issues Found:
_________________________________

Notes:
_________________________________
```

---

## Next Steps

1. ✅ Run all tests
2. ✅ Check console for errors
3. ✅ Verify Firestore data
4. ✅ Share results

**Start with Test 1 now!** 🎮
