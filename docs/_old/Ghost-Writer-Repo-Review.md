Comprehensive Review: Ghost Writer Repository
1. PROJECT OVERVIEW
Ghost Writer is a local-first, distraction-free Markdown editor that embeds AI assistance directly into the writing workflow using on-device LLMs via Ollama. It's designed as a lightweight, privacy-focused writing tool with immediate AI integration capabilities.
Purpose: Create an efficient writing environment where users can generate content locally without exposing data to cloud services, using the free and open-source Ollama server running on their local machine.
---
2. TECH STACK AND MAIN COMPONENTS
Frontend:
- React 19.2.x - UI framework for building the editor interface
- Vite 7.2.x - Build tool and dev server
- Electron-free Tauri 2.x - Desktop app wrapper (instead of Electron for smaller bundles)
- JavaScript (ES Module) source - Pure JavaScript files (.js, .jsx) - no TypeScript
Core Libraries:
- Markdown-it 14.x - Markdown parsing and rendering
- @tauri-apps/api 2.10.1 - Tauri bindings for frontend
- @tauri-apps/cli 2.10.0 - Tauri CLI tool
- nspell + dictionary-en-us - Spellcheck capabilities
- React Testing Library 16.3 - Test utilities
Backend (Tauri Rust):
- Rust - Native system programming
- Tauri 2.x - Desktop framework binding
Integration:
- Ollama - Local LLM server (expected at http://localhost:11434/api/generate)
- Markdown Extras: markdown-it-attrs, markdown-it-deflist, markdown-it-emoji, markdown-it-footnote, markdown-it-mark, markdown-it-sub/sup, markdown-it-task-lists
---
3. KEY FEATURES AND HOW THEY WORK
AI Editing Features:
- Local LLM Integration: Streams AI response tokens directly into editor
- Selection-Aware Generation: 
  - Replaces selected text with AI output
  - Inserts at cursor if no selection
- Inline Placeholder Workflow: Uses {{...}} tokens for sequential inline prompts
  - Typing {{ immediately highlights placeholder text in blue
  - Text stays highlighted until }} closes it
- Streaming Output: Real-time token generation with Stop/Undo/Redo support
- Model Picker: Footer dropdown showing installed Ollama models
Document Features:
- Multi-tab Editor: Multiple markdown documents with clean workspace
- Markdown Preview: Toggle between editor and rendered HTML preview
  - Supports task lists, footnotes, definition lists, attributes, emojis
  - Synced scroll behavior
- Rich Export Options: Copy as HTML, save as PDF/RTF/Word, copy RTF/Plain Text
- Save/Load Files: Native dialogs for working with .md files
- Always-on-Top: Desktop feature to keep window visible
Smart Editing:
- Keyboard Shortcuts:
  - Cmd/Ctrl+S: Save document
  - Cmd/Ctrl+O: Open document
  - Cmd/Ctrl+N: New document
  - Cmd/Ctrl+M: Toggle markdown preview
  - Cmd/Ctrl+T: Always-on-top toggle
  - Cmd/Ctrl+B/I: Bold/Italic
  - Text shortcuts for list continuation
- Spellcheck System:
  - Optional toggle, red underline rendering
  - Committed word behavior (marks after whitespace)
  - Custom word list management
Unique Features:
- Compact Footer: Collapsible 24-button control bar with:
  - Document actions (New, Save, Load, Copy, Preview)
  - Ollama model selector
  - Theme toggle
  - Always-on-top pin
- Inline Prompt Highlighting: Visual feedback for {{...}} tokens
- Auto-Model Snapshots: Pre-caches Ollama models into JSON for deterministic startup
---
4. CONFIGURATION FILES AND SETUP REQUIREMENTS
Required for Application:
- Node.js: >=20.19.0 or >=22.12.0
- npm: package manager
- Rust Toolchain: Required for Tauri desktop builds
- Ollama Server: Runs at http://localhost:11434 with installed models
Important Configuration Files:
- .nvmrc - Specifies Node.js version requirement (20.19.0)
- src/ghost-writer-editor/package.json - Main app dependencies and scripts
- src/ghost-writer-editor/vite.config.js - Build configuration, port 5174
- src/ghost-writer-editor/src-tauri/tauri.conf.json - Desktop app settings, window size 400x500
- src/ghost-writer-editor/vite-env.d.ts - TypeScript declarations
Environment Variables:
- VITE_OLLAMA_BASE_URL - Override Ollama endpoint (default: http://127.0.0.1:11434)
Model Configuration:
- Ollama models automatically snapshot via npm run sync:models to:
  - public/ollama-models.json
  - src/generated/ollama-models.json
Build Scripts:
npm run dev          # Start development server on port 5174
npm run dev:tauri    # Start Tauri desktop app
npm run build        # Build for web
npm run build:tauri  # Build desktop app
npm run build:tauri:win  # Build Windows NSIS installer
npm run build:tauri:mac  # Build macOS DMG
npm run check        # Pre-flight, lint, tests, build
npm run sync:models  # Update Ollama model snapshots
---
5. OVERALL ARCHITECTURE AND STRUCTURE
Folder Structure:
ghost-writer/
├── src/ghost-writer-editor/
│   ├── assets/            # Local assets
│   ├── build/            # Build outputs
│   ├── dist/             # Production build (Vite output)
│   ├── public/           # Static assets (ollama-models.json, icons)
│   ├── scripts/          # Utility scripts (sync models, build Mac)
│   ├── src/
│   │   ├── components/   # React components (AppModals, Editor, FooterBar, PromptPanel, TabBar)
│   │   ├── hooks/        # Custom hooks (usePromptGeneration, useGlobalShortcuts, etc.)
│   │   ├── lib/          # Core utilities (ollama, desktopRuntime, markdown, spellcheck, prompting)
│   │   ├── generated/    # Auto-generated files (ollama-models.json)
│   │   ├── test/         # Test setup files
│   │   ├── App.css       # Styling
│   │   ├── App.jsx       # Main app component (~1964 lines)
│   │   └── main.jsx      # Entry point
│   ├── src-tauri/        # Rust backend for desktop
│   │   ├── src/
│   │   ├── Cargo.toml    # Rust dependencies
│   │   └── tauri.conf.json
│   ├── .backups/         # Backup files
│   ├── index.html        # HTML entry point
│   ├── vite.config.js    # Vite configuration
│   └── package.json      # App dependencies
├── docs/                 # Documentation
│   ├── agent-workflows/  # Operational runbooks
│   ├── dev-logs/         # Development logs
│   └── reference/        # Reference materials
└── .github/workflows/    # CI/CD pipelines
Component Architecture:
Main Components (~1963 lines in App.jsx):
- State Management: Comprehensive React state with hooks
  - Multiple tabs with isolated content (tabState.js)
  - Theme, settings, and UI state
  - Streaming ranges and generation history tracking
Core Libraries:
Ollama Integration:
- ollama.js - Handles API calls, URL building, timeouts
- prompting.js - Constructs prompts (global and inline formats)
- usePromptGeneration.js - Manages AI generation process (~526 lines)
  - Streaming token handling
  - Abort controllers for stopping generation
  - Undo/Redo history for last AI output
  - Inline token extraction and highlighting
Editor Features:
- Editor.jsx - Textarea with syntax highlighting overlays (~993 lines)
  - Custom syntax rendering for headings, lists, checkboxes, links
  - Prompt overlay support
  - Light/Heavy mode performance optimization
  - Input behavior handling (list continuation, formatting)
Desktop Features:
- desktopRuntime.js - Native OS integration
  - File dialogs, open file paths, always-on-top
  - Diagnostics logging
  - Export operations
- main.rs - Rust backend (~1706 lines)
  - Tauri commands
  - Ollama server auto-detection
  - Menu handling, settings persistence
  - Security sanitization
Quality Metrics:
- Size: ~5.7GB total (dominated by node_modules and build artifacts)
- Code: ~4,600 lines across React components and Rust backend
- Tests: Comprehensive test suite with Vitest and React Testing Library
- Linter: ESLint configured for React 19
---
NOTABLE ARCHITECTURE DECISIONS:
1. Pure JavaScript Over TypeScript: No TypeScript used for speed and simplicity
2. Agentic Development: Built with multiple AI agents across different systems (OpenAI Codex)
3. Model Determinism: Pre-snapshots Ollama models into JSON for consistent startup
4. Split Preview/Editor: Markdown preview runs separately from editor for performance
5. Streaming Design: Token-by-token streaming for better UX on slower systems
6. Safety-First: Extensive sanitization for Markdown HTML rendering
7. Lightweight UI: Minimal JavaScript bundles, code-split vendor chunks
---
PROJECT PHILOSOPHY:
From docs/ghost-writer-about.md:
- Designed to be "lighting fast and small" with minimal screen real estate
- Privacy-first: works offline, no API charges, no cloud dependencies
- Distraction-free: minimalist UI similar to Byword text editor
- Seamless LLM integration: "don't reinvent the wheel" - standard markdown editor feel with AI capabilities
---
This project represents a professional-grade desktop application built with modern React patterns, Rust system integration, and AI-native writing workflow focus. The architecture balances performance, security, and developer experience while maintaining simplicity for end users.