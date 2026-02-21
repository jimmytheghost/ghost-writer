# Ghost Writer Web App

This folder contains the Vite + React web app for Ghost Writer.

## Commands

```bash
npm run dev
npm run lint
npm run test
npm run test:run
npm run build
npm run check
```

## Environment variables

- `VITE_OLLAMA_BASE_URL` (optional): Override the Ollama base URL.  
  Default: `http://localhost:11434`

Example:

```bash
cp .env.example .env
npm run dev
```
