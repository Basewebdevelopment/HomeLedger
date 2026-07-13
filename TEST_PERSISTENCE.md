# Testing Data Persistence

## Quick Test Guide

To verify that data persistence is working:

### Test 1: Basic Persistence
1. Open the app in your browser (`http://localhost:3000`)
2. Click "Add someone new"
3. Enter your name (e.g., "John")
4. Click "Join household"
5. Add a shopping item (e.g., "Milk")
6. **Refresh the page** (F5 or Cmd+R)
7. ✅ Your name and shopping item should still be there!

### Test 2: Multiple Actions
1. Add multiple shopping items
2. Check off a few items
3. Go to the Cleaning tab and mark a task done
4. Go to the To-do tab and add a task
5. **Close the browser tab completely**
6. Reopen `http://localhost:3000`
7. ✅ All your data should be preserved!

### Test 3: Cross-Session Persistence
1. Make some changes in the app
2. **Shut down your computer**
3. Turn it back on tomorrow
4. Open the app again
5. ✅ Your data should still be there!

## What's Being Stored

Open your browser's DevTools (F12) and check:

1. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
2. Click **Local Storage** in the sidebar
3. Find your domain (e.g., `http://localhost:3000`)
4. You should see a key: `household-data`
5. The value is a JSON string with all your app data

## Storage Details

```javascript
// View your stored data in browser console:
JSON.parse(localStorage.getItem('household-data'))

// Check storage size:
const data = localStorage.getItem('household-data');
console.log(`Size: ${(new Blob([data]).size / 1024).toFixed(2)} KB`);

// Clear all data (for testing):
localStorage.removeItem('household-data');
location.reload();
```

## Expected Behavior

### ✅ Should Persist:
- Household members
- Shopping list items and their checked state
- Cleaning tasks and completion dates
- To-do items and completion status
- Calendar events
- Receipt data
- Activity feed
- User who performed each action

### ❌ Won't Persist Across:
- Different browsers (Chrome data ≠ Firefox data)
- Different devices (laptop data ≠ phone data)
- Private/Incognito mode
- After clearing browser data

## Troubleshooting

### Data Not Saving?
1. Check if in private/incognito mode
2. Check browser console for errors
3. Try a different browser
4. Check available storage: `navigator.storage.estimate()`

### Data Disappeared?
1. Did you clear browser data/cookies?
2. Are you in a different browser?
3. Are you on a different device?
4. Check if you're on the same domain (localhost vs 127.0.0.1)

### Storage Full?
Unlikely! The app typically uses < 100 KB. localStorage limit is 5-10 MB.

## Advanced Testing

### Concurrent Tabs
1. Open the app in two tabs
2. Make a change in tab 1
3. Refresh tab 2
4. ✅ Tab 2 should see the changes

Note: Changes don't sync in real-time between tabs. You need to refresh to see updates from other tabs.

### Large Dataset
1. Add 100+ shopping items
2. Create 50+ to-dos
3. Mark tasks done repeatedly over several days
4. Check storage size (should still be < 1 MB)

### Export/Import (Manual Testing)
```javascript
// Export your data:
const data = localStorage.getItem('household-data');
console.save(data, 'backup.json');

// To import:
// 1. Copy JSON content
// 2. localStorage.setItem('household-data', 'PASTE_HERE')
// 3. location.reload()
```

## Performance Notes

- ✅ Saving is instant (synchronous)
- ✅ Loading is fast (< 10ms for typical data)
- ✅ No network latency
- ✅ Works completely offline

## Next Steps

Once you verify persistence is working:
1. ✅ Use the app for daily household tasks
2. Consider deploying to Vercel for online access
3. Consider upgrading to cloud storage for multi-device sync
4. Set up Anthropic API for voice commands and receipt scanning

See STORAGE.md for upgrade options!
