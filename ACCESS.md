# How to Access Your Household Ledger App

## Current Status

✅ **The app is set up and running!**

The development server is currently running inside the cloud agent environment on port 3000.

## For Local Development

To run the app on your local machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Basewebdevelopment/HomeLedger.git
   cd HomeLedger
   git checkout cursor/household-ledger-app-cf93
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   ```
   http://localhost:3000
   ```

## For Production Deployment

To make this app accessible online, I recommend deploying to **Vercel** (free and easy):

1. **Push your code to GitHub** (already done ✅)

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your `HomeLedger` repository
   - Select the branch: `cursor/household-ledger-app-cf93`
   - Click "Deploy"

3. **Your app will be live at:**
   ```
   https://your-project-name.vercel.app
   ```

### Alternative Deployment Options:
- **Netlify**: Similar to Vercel, free tier available
- **GitHub Pages**: Free static hosting (requires build step)
- **Railway**: Easy deployment with free tier

## Important: Before Full Use

⚠️ **The app currently requires some setup for full functionality:**

1. **Anthropic API Key** (for AI features):
   - Voice commands
   - Receipt scanning
   - Get one at: https://console.anthropic.com/

2. **Data Storage**:
   - Currently uses `window.storage` (not standard)
   - For production, integrate:
     - LocalStorage (simple, single-device)
     - Vercel KV (recommended for multi-device)
     - Or your preferred database

3. **Security**:
   - Set up a backend API to proxy Claude API calls
   - Never expose API keys in the frontend

## Quick Test

To test the app without AI features:
1. Open the app (locally or deployed)
2. Click "Add someone new"
3. Enter a name and optional PIN
4. Explore the tabs: Home, Shopping, Cleaning, To-do, Calendar

The basic features (adding items, marking complete, etc.) work without any API keys!

## Need Help?

Check the README.md for more detailed information about the app's features and architecture.
