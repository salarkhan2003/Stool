# Stool - Life Command Center

A high-performance personal productivity tool built with React, Vite, and Tailwind CSS.

## Features
- **Immediate Capture**: High-speed entry for ephemeral thoughts.
- **Top 10 Engine**: Focused list management capped at 10 items.
- **Outreach Pipeline**: Track contacts, priorities, and feedback.
- **Dark Mode**: Sleek glassmorphism/claymorphism UI.

## Vercel Deployment

This project is optimized for Vercel.

### 1. Environment Variables
Ensure you set the following environment variable in your Vercel Project Settings:
- `GEMINI_API_KEY`: Your Google Gemini API Key (if using AI features).

### 2. Build Settings
Vercel should automatically detect the settings, but here they are for reference:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3. SPA Routing
A `vercel.json` file is included to handle Single Page Application (SPA) routing. This ensures that refreshing the page on a sub-route doesn't result in a 404 error.

## Local Development
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open `http://localhost:3000`
