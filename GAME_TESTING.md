# Game System Testing Guide

## Quick Start Testing

### Setup
1. Have two browser windows/tabs open with the chat app
2. Login as two different users in each window
3. Open a chat between the two users

### Test 1: Send Game Invite
**Steps:**
1. In User A's window, click the media menu button (+)
2. Click "Play Tic-Tac-Toe"
3. Verify:
   - Loading screen appears briefly
   - User A redirected to games.html?roomID=game_xxx&mode=host
   - Game invite message appears in User B's chat

**Expected Result:**
- ✅ Game invite card visible in User B's chat
- ✅ Card shows "User A challenged you to Tic-Tac-Toe!"
- ✅ "Tap to Play" button is clickable

### Test 2: Join Game
**Steps:**
1. In User B's window, click the "Tap to Play" button
2. Verify:
   - User B redirected to games.html?roomID=game_xxx&mode=join
   - Both players see game board
   - Status board shows both player names

**Expected Result:**
- ✅ Both windows show the same game board
- ✅ Player X (User A) and Player O (User B) displayed
- ✅ Turn indicator shows "Your Turn" for User A

### Test 3: Make Moves
**Steps:**
1. In User A's window, click a cell (e.g., center)
2. Verify:
   - Cell shows "X"
   - Turn indicator changes to "Opponent's Turn"
   - Board is locked for User A

3. In User B's window:
   - Verify cell shows "X" (synced)
   - Turn indicator shows "Your Turn"
   - Click a different cell
   - Verify cell shows "O"

**Expected Result:**
- ✅ Moves appear on both screens
- ✅ Turn management works correctly
- ✅ Players can only move on their turn

### Test 4: Win Detection
**Steps:**
1. Continue playing until someone gets 3 in a row
2. Verify:
   - Game over modal appears
   - Shows winner's name or "Draw"
   - "Play Again" button is visible

**Expected Result:**
- ✅ Win/Loss/Draw message displays correctly
- ✅ Modal appears on both screens
- ✅ Game board is locked

### Test 5: Play Again
**Steps:**
1. Click "Play Again" button
2. Verify:
   - Modal closes
   - Board resets to empty
   - Turn indicator shows "Your Turn" for User A
   - Game continues

**Expected Result:**
- ✅ Board clears completely
- ✅ New game starts with same room ID
- ✅ User A (X) goes first again

### Test 6: Back to Chat
**Steps:**
1. Click "Back to Chat" button
2. Verify:
   - Redirected to index.html
   - Chat history is preserved
   - Game invite message still visible

**Expected Result:**
- ✅ Smooth navigation back to chat
- ✅ No data loss
- ✅ Can start new game from same chat

## Edge Cases to Test

### Test 7: Authentication Check
**Steps:**
1. Open games.html directly in URL bar
2. Without being logged in
3. Verify:
   - Login modal appears
   - Cannot access game without auth

**Expected Result:**
- ✅ Login modal shows
- ✅ "Go to Login" button redirects to index.html

### Test 8: Invalid Room ID
**Steps:**
1. Open games.html?roomID=invalid&mode=host
2. Verify:
   - Page loads
   - Waiting screen shows
   - No errors in console

**Expected Result:**
- ✅ Page handles gracefully
- ✅ No JavaScript errors

### Test 9: Mobile Responsiveness
**Steps:**
1. Open games.html on mobile device
2. Verify:
   - Board fits on screen
   - Buttons are touchable
   - Status board is readable
   - Game over modal is visible

**Expected Result:**
- ✅ Layout adapts to mobile
- ✅ All elements are accessible
- ✅ Touch events work

### Test 10: Multiple Games
**Steps:**
1. Complete one game
2. Go back to chat
3. Start a new game with same user
4. Verify:
   - New room ID is different
   - Previous game data doesn't interfere

**Expected Result:**
- ✅ Each game has unique room ID
- ✅ Games are independent
- ✅ No data mixing

## Browser Console Checks

### What to look for:
- No red error messages
- No warnings about missing files
- Firebase connection logs
- Socket events (when implemented)

### Common Issues:
```
❌ "games.html not found" → Check file location
❌ "games.css not found" → Check CSS link in HTML
❌ "Firebase not initialized" → Check Firebase config
❌ "Cannot read property 'roomId'" → Check URL parameters
```

## Performance Testing

### Test 11: Load Time
**Steps:**
1. Open games.html
2. Check browser DevTools Network tab
3. Verify:
   - Page loads in < 2 seconds
   - All assets load successfully
   - No failed requests

**Expected Result:**
- ✅ Fast page load
- ✅ All resources available
- ✅ No 404 errors

### Test 12: Memory Usage
**Steps:**
1. Play multiple games
2. Check DevTools Memory tab
3. Verify:
   - Memory doesn't continuously increase
   - No memory leaks

**Expected Result:**
- ✅ Stable memory usage
- ✅ No memory leaks detected

## Accessibility Testing

### Test 13: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate
2. Use Enter to click buttons
3. Verify:
   - All buttons are reachable
   - Focus indicators visible
   - Game cells selectable via keyboard

**Expected Result:**
- ✅ Full keyboard support
- ✅ Clear focus indicators
- ✅ Accessible to keyboard users

### Test 14: Screen Reader
**Steps:**
1. Use screen reader (NVDA, JAWS, VoiceOver)
2. Verify:
   - Game status announced
   - Button labels clear
   - Board state readable

**Expected Result:**
- ✅ Screen reader compatible
- ✅ All content accessible
- ✅ Clear announcements

## Regression Testing

After any code changes, verify:
- [ ] Game invites still send
- [ ] Game page loads correctly
- [ ] Moves sync between players
- [ ] Win detection works
- [ ] Back button navigates correctly
- [ ] No console errors
- [ ] Mobile layout intact
- [ ] Game card styles display

## Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Test 1 (Send Game Invite): ✅ ❌
Test 2 (Join Game): ✅ ❌
Test 3 (Make Moves): ✅ ❌
Test 4 (Win Detection): ✅ ❌
Test 5 (Play Again): ✅ ❌
Test 6 (Back to Chat): ✅ ❌
Test 7 (Auth Check): ✅ ❌
Test 8 (Invalid Room): ✅ ❌
Test 9 (Mobile): ✅ ❌
Test 10 (Multiple Games): ✅ ❌

Issues Found:
_________________________________
_________________________________

Notes:
_________________________________
_________________________________
```

## Known Limitations

1. **Real-time Sync**: Currently uses simulation. Production needs WebSocket/Firestore listeners
2. **Opponent Detection**: No automatic opponent detection. Manual room join via URL
3. **Timeout**: No timeout if opponent doesn't join
4. **Offline**: No offline support yet
5. **Game History**: Games not saved to Firestore yet

## Next Steps for Production

1. Implement WebSocket server for real-time sync
2. Add Firestore listeners for game state
3. Implement game history storage
4. Add timeout handling
5. Add reconnection logic
6. Add game notifications
7. Add leaderboard
8. Add more games

## Support

If tests fail:
1. Check browser console for errors
2. Verify all files are in correct location
3. Clear browser cache
4. Check Firebase configuration
5. Verify internet connection
6. Try in different browser
