# Our Household Ledger

A beautiful, collaborative household management app for tracking shopping lists, cleaning tasks, to-dos, calendar events, and receipts. Features voice commands and AI-powered receipt scanning.

## Features

- 👥 **Multi-user support** with optional PIN protection
- 🛒 **Shopping list** with receipt scanning
- ✨ **Cleaning tasks** with frequency tracking
- ✅ **To-do list** for household tasks
- 📅 **Calendar** with recurring reminders
- 🎤 **Voice commands** for hands-free use
- 📸 **Receipt scanning** with AI to auto-match shopping items
- 📊 **Activity feed** to track who did what

## Quick Start

The app is now running on your development server!

### Local Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000/`

### Building for Production

```bash
npm run build
npm run preview
```

## Important Notes

### API Key Required

This app uses the Anthropic Claude API for:
- Voice command interpretation
- Receipt scanning (extracting items and prices from photos)

**⚠️ The current implementation makes API calls directly from the browser, which exposes your API key.** For production use, you should:

1. Set up a backend API to proxy Anthropic API calls
2. Store your API key securely on the server
3. Never commit API keys to the repository

To use the voice and receipt scanning features, you'll need to:
1. Get an Anthropic API key from https://console.anthropic.com/
2. Either:
   - Add it to the app (not recommended for production)
   - Set up a backend proxy (recommended)

### Data Storage

The app uses `window.storage` API for data persistence. In a browser environment without this API, data will be stored in memory only and lost on refresh. For production, you should integrate with a proper storage solution like:
- LocalStorage (for single-device use)
- A database with API backend (for multi-device sync)
- Vercel KV or similar cloud storage

## Architecture

- **React 18** for UI components
- **Vite** for fast development and building
- **Lucide React** for beautiful icons
- **Tailwind-style inline CSS** for styling
- **Anthropic Claude API** for AI features

## Design System

The app features a beautiful paper-like design with:
- Vintage ledger aesthetic
- Brass accents and stamp effects
- Custom fonts (Fraunces for display, Space Mono for monospace)
- Card-based UI with subtle shadows
- Cream background with paper-white cards

## License

MIT
