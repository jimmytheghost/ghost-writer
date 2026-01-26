## Wraider: AI-Assisted Writing with Ollama

Wraider is an open-source web-based writing tool designed to leverage the power of Large Language Models (LLMs) through Ollama. It aims to provide a streamlined writing experience for creating articles, essays, novels, and various other content types.

**Core Concept:**

Wraider features an intentionally simple and intuitive interface, resembling Ollama's existing chat or Byword's markdown friendly interface for ease of use.  The primary interaction model centers around keyboard shortcuts that summon AI assistance directly within the writing area.

**How it Works:**

Users can write freely within the Wraider text editor. At any point during the writing process, a predefined keyboard shortcut (e.g., Ctrl+Shift+A) will activate a prompt box. This box requests a specific instruction from the user.

The user can then enter a natural language prompt directing the LLM (powered by Ollama) to perform actions on the existing text or generate new content.  Examples of prompts include:

*   "Edit all of the text above for clarity and conciseness."
*   "Write a paragraph here explaining the above points in more detail."
*   "Rewrite the previous sentence in a more formal tone."
*   "Expand on the idea presented in the last paragraph."
*   "Summarize the entire document."
*   "Create this character's backstory."

Wraider then utilizes Ollama to process the prompt and either modify the existing text or insert new content directly into the editor.

**Key Features & Goals:**

*   **Simplicity:** Minimalist interface to avoid distractions.
*   **Ollama Integration:** Leverages local LLMs via Ollama.
*   **Contextual Assistance:** AI responds to prompts relative to the current document content.
*   **Keyboard-Driven:** Efficient workflow using keyboard shortcuts.
*   **Open Source:** Promotes community contribution and customization.
