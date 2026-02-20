## Wraider: AI-Assisted Writing with Ollama

Wraider is an open-source web-based writing tool designed to leverage the power of Large Language Models (LLMs) through Ollama. It aims to provide a streamlined writing experience for creating articles, essays, novels, and various other content types.

**Core Concept:**

Wraider features an intentionally simple and intuitive interface, resembling Ollama's existing chat or Byword's markdown friendly interface for ease of use. The primary interaction model centers around a focused editor with a permanent prompt box below it for AI assistance.

**How it Works:**

Users can write freely within the Wraider text editor. The prompt box is always available beneath the editor, so users can type an instruction at any time.

When submitting a prompt, Wraider uses the current cursor or selection in the editor as the insertion point:

- If text is highlighted, the AI output replaces the highlighted selection.
- If there is no selection, the AI output inserts at the current cursor position.

The user can then enter a natural language prompt directing the LLM (powered by Ollama) to perform actions on the existing text or generate new content.  Examples of prompts include:

*   "Edit all of the text above for clarity and conciseness."
*   "Write a paragraph here explaining the above points in more detail."
*   "Rewrite the previous sentence in a more formal tone."
*   "Expand on the idea presented in the last paragraph."
*   "Summarize the entire document."
*   "Create this character's backstory."

Wraider then utilizes Ollama to process the prompt and either replace the selection or insert new content at the cursor position.

**Key Features & Goals:**

*   **Simplicity:** Minimalist interface to avoid distractions.
*   **Ollama Integration:** Leverages local LLMs via Ollama.
*   **Contextual Assistance:** AI responds to prompts relative to the current document content.
*   **Keyboard-Driven:** Efficient workflow using keyboard shortcuts. (Shortcut-based prompt invocation has been retired in favor of the permanent prompt box.)
*   **Open Source:** Promotes community contribution and customization.

## Launching the App (macOS)

### Web Version
Use the provided launchers from the project root:

- **Start the app:** double-click `launch.command` to install dependencies, stop any process on port 5173, start the Vite dev server, and open the browser.
- **Stop the app:** double-click `stop.command` to stop the Vite dev server running on port 5173.

If macOS blocks the file the first time, right-click → **Open**. You can also verify permissions in Finder via **Get Info** → **Sharing & Permissions**.

### Desktop App (Electron)
You can also run Wraider as a standalone desktop application:

```bash
cd src/wraider-editor
npm run electron:dev
```

### Building Desktop App
To build distributable desktop apps:

```bash
cd src/wraider-editor

# Build for current platform
npm run electron:build

# Build specifically for macOS
npm run electron:build:mac

# Build for Windows
npm run electron:build:win

# Build for Linux
npm run electron:build:linux
```

The built desktop app will be in `src/wraider-editor/release/`.
