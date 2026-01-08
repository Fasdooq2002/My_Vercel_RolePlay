<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VelvetCore // EREBOS

A high-fidelity, dark-themed roleplay platform designed for immersive character interactions with advanced context management and uncensored model integration.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Quick Deployment Steps

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com) and import your repository
3. Vercel will auto-detect Vite configuration
4. (Optional) Add `GEMINI_API_KEY` environment variable in project settings
5. Deploy!

The project is pre-configured with:
- `vercel.json` for optimal routing and caching
- Build command: `npm run build`
- Output directory: `dist`

## Run Locally

**Prerequisites:** Node.js (v18+)

### Installation

1. Install dependencies:
```bash
npm install
```

2. (Optional) Configure API key:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000

### Build for Production

```bash
npm run build
npm run preview
```

## Features

- Multi-provider AI support (Gemini, OpenAI, OpenRouter, Horde, DeepSeek, Custom)
- Advanced character creation and management
- Lorebook system for world-building
- Smart context management with automatic summarization
- Multi-swipe responses with branching conversations
- Customizable themes and backgrounds
- Export/Import characters and chats

## Tech Stack

- React 19 + TypeScript
- Vite build tool
- TailwindCSS styling
- Google Gemini API
- Lucide React icons

## Environment Variables

- `GEMINI_API_KEY` - (Optional) Google Gemini API key
  - Get yours at: https://aistudio.google.com/app/apikey
  - Can also be configured in-app settings

## Support

For issues or questions, please open an issue on GitHub or visit:
https://ai.studio/apps/drive/1AxHvYpyWfrTrhZTLk4N-LrN9MUlVMrkp
