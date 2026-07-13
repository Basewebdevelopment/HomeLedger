# Data Storage Guide

## Current Implementation: LocalStorage

The Household Ledger app now uses **browser localStorage** for data persistence. This means:

✅ **Your data persists across page refreshes**  
✅ **Works offline - no internet required**  
✅ **Simple and fast**  
✅ **No server setup needed**

## How It Works

### Storage Location
- Data is stored in your browser's localStorage
- Key: `household-data`
- Format: JSON string containing all app data

### What Gets Stored
```json
{
  "members": [...],
  "shoppingList": [...],
  "cleaningTasks": [...],
  "todos": [...],
  "events": [...],
  "receipts": [...],
  "activity": [...]
}
```

### Automatic Saving
- Every action automatically saves to localStorage
- No "save" button needed
- Instant persistence

## Limitations

### 📱 Per-Browser Storage
- Data is stored separately in each browser/device
- Chrome, Firefox, Safari each have their own storage
- Incognito/private browsing doesn't persist data
- Clearing browser data will delete app data

### 💾 Storage Limits
- Typical limit: 5-10 MB per domain
- Our app uses: typically < 100 KB
- Should easily handle years of household data

### 👥 Single Device Only
- No automatic sync between devices
- No collaborative real-time updates
- Each device has its own independent data

## Data Management

### Backup Your Data
You can export your data as a JSON file for safekeeping:

```javascript
// In browser console:
import { exportData } from './src/storage-utils.js';
exportData();
```

Or add an export button in the UI (future feature).

### Import Data
To restore from a backup:

```javascript
// In browser console:
import { importData } from './src/storage-utils.js';
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.onchange = (e) => {
  importData(e.target.files[0]).then(() => location.reload());
};
fileInput.click();
```

### Clear All Data
To start fresh:

```javascript
localStorage.removeItem('household-data');
location.reload();
```

## Upgrading to Multi-Device Sync

If you need data sync across devices, you'll need to upgrade to a backend solution:

### Option 1: Vercel KV (Easiest)
```bash
npm install @vercel/kv
```
- Redis-based storage
- Serverless
- Free tier available
- ~5 minutes to set up

### Option 2: Supabase (Most Features)
```bash
npm install @supabase/supabase-js
```
- PostgreSQL database
- Real-time subscriptions
- Built-in auth
- Generous free tier
- ~15 minutes to set up

### Option 3: Firebase (Google)
```bash
npm install firebase
```
- Firestore database
- Real-time sync
- Google auth integration
- Free tier available
- ~20 minutes to set up

### Option 4: Custom Backend
- Build your own API with Express/Fastify
- Use PostgreSQL/MongoDB/MySQL
- Full control
- More work required

## Privacy & Security

### What's Secure
✅ Data never leaves your device  
✅ No tracking or analytics  
✅ No account signup required  
✅ Works completely offline

### What's Not Secure
⚠️ PINs are just courtesy locks (stored in plain text)  
⚠️ Anyone with access to your device can read localStorage  
⚠️ No encryption at rest  
⚠️ No audit trail or versioning

### For Production Use
If you need real security:
1. Implement proper authentication
2. Use backend database with encryption
3. Add HTTPS
4. Implement proper session management

## Troubleshooting

### Data Not Persisting?
1. Check if in private/incognito mode
2. Check browser storage settings
3. Check available storage space
4. Try a different browser

### Data Lost After Update?
- Browser updates shouldn't clear data
- If data is lost, check if you have a backup
- Consider implementing automatic cloud backups

### Storage Full?
- Very unlikely with normal use
- Check storage usage in browser DevTools
- Clear old activity entries if needed

## Technical Details

### Code Location
- Storage logic: `src/App.jsx` (lines 194-214)
- Utilities: `src/storage-utils.js`

### Key Functions
```javascript
// Load data on app start
loadData() → returns Promise<data>

// Save data after every change
persistData(data) → void

// All mutations go through this
mutate((currentData) => newData)
```

### Error Handling
- Failed loads fall back to empty data
- Failed saves log warning but don't crash
- All storage operations are wrapped in try/catch

## Future Enhancements

Planned improvements:
- [ ] Export/import UI buttons
- [ ] Automatic backup to file
- [ ] Storage usage indicator
- [ ] Data compression for large datasets
- [ ] Migration to cloud storage option
- [ ] Conflict resolution for multi-device
- [ ] Version control / undo history

## Questions?

See the main README.md or check the inline code comments for more details.
