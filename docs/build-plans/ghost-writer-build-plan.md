## High-Level Development Plan

This outlines the key phases and steps for building Ghost Writer.

**Phase 1: Core Editor & UI (Estimated: 1-2 days)**

*   **Objective:** Establish the basic text editor with a functional UI.
*   **Tasks:**
    *   Choose a web framework (e.g., React, Vue, Svelte).  React is currently favored for its component-based architecture and large ecosystem.
    *   Implement a simple text editor component with basic text input and rendering.
    *   Design a minimalist UI resembling Byword or a clean chat interface.
    *   Implement basic keyboard navigation.
    *   Set up a basic build process (e.g., using Vite or Webpack).
*   **Deliverables:** A functional web page with a basic text editor and minimal UI.

**Phase 2: Ollama Integration - Prompting (Estimated: 2-3 days)**

*   **Objective:** Connect the editor to Ollama and enable basic prompting functionality.
*   **Tasks:**
    *   Establish communication with the Ollama API (likely via `curl` or a dedicated Ollama client library in JavaScript/TypeScript).
    *   Implement the keyboard shortcut (Ctrl+Shift+A) to trigger the prompt box.
    *   Create a simple prompt input field.
    *   Send the user's prompt and the current editor content to the Ollama API.
    *   Receive the response from Ollama.
*   **Deliverables:** The ability to send a prompt to Ollama and receive a response.

**Phase 3: Ollama Integration - Content Insertion (Estimated: 1-2 days)**

*   **Objective:** Integrate the Ollama response into the editor content.
*   **Tasks:**
    *   Implement logic to insert the response from Ollama into the editor at the cursor position or replace selected text.
    *   Handle potential errors from the Ollama API.
    *   Add basic formatting to the inserted content (e.g., markdown).
*   **Deliverables:** The ability to insert AI-generated content into the editor.

**Phase 4: Advanced Features & Refinement (Estimated: Ongoing)**

*   **Objective:** Add more advanced features and refine the user experience.
*   **Tasks:**
    *   Implement more sophisticated prompting strategies (e.g., context awareness, prompt templates).
    *   Add support for different Ollama models.
    *   Implement more advanced keyboard shortcuts.
    *   Improve UI/UX based on user feedback.
    *   Add features like saving/loading documents, export to various formats.
*   **Deliverables:** A fully featured and polished writing tool.

**Dependencies:**

*   Ollama (local installation)
*   React (or chosen web framework)
*   A package for making HTTP requests (e.g., `axios`, `fetch`)
*   Potentially a markdown editor component.

**Testing:**

*   Unit tests for individual components.
*   Integration tests to verify the interaction between the editor and Ollama.
*   Manual testing to ensure a smooth user experience.
