**Ghost Writer Project Tasks**

### 1. Footer Collapse Implementation

* [x] Create a toggle arrow to the right of the light mode button with a vertical line (`|`) separating them.
* [x] Ensure the footer collapses by default.
* Completion notes: Added a footer collapse toggle button to the right of the theme button with a `|` divider and set the initial footer state to collapsed on each launch (no persistence).

### 2. Custom Syntax Parsing for Checkbox Formatting

* [x] Introduce custom syntax or parsing mechanism that allows users to format checkboxes using `[ ]` brackets at the beginning of lines (similar to `#`).
* [x] Limit this syntax to only affect checkbox formatting.
* Completion notes: Added parsing that converts leading-line `[ ]` / `[x]` syntax to markdown task-list format for preview rendering only; no other syntax was changed.
* Completion notes: Preview checkboxes are now interactive and update the source markdown line when toggled.

### 3. Transparent Background Update

* [x] Update the background styling to a glassy, transparent effect, while keeping the container at full opacity.
* Completion notes: Updated body/app background to layered gradients with a glass effect; editor/prompt/footer containers remain opaque.

### 4. "Generation Stopped" Message Styling

* [x] Apply proper CSS styling to the "Generation stopped." message for improved visual consistency.
* Completion notes: Added a dedicated stopped-status style (`prompt-panel__status--stopped`) so abort notices are warning-styled instead of error-styled.

### 5. Prompt Hardening and Refinement

* [x] Modify the backend prompt to only output requested text, excluding any introductory phrases (e.g., "Sure! Here's an outline for your essay: ...").
* Completion notes: Replaced the raw prompt payload with instruction-hardened prompt templates that explicitly disallow lead-in phrases, explanations, and code fences.

### 6. Collapse Prompt Input and Implement Tooltips

* [x] Or simply make it the size of a single line input field.
* Completion notes: Switched the prompt control from multiline textarea to a single-line text input.
* Completion notes: "Collapse prompt input + tooltips" path intentionally not implemented, per decision to use single-line input.

### 7. Enable Tab and Shift+Tab Navigation in Text Input

* [x] Allow users to navigate text input using TAB keys, moving the cursor an appropriate number of spaces (not switching containers).
* [x] Determine optimal behavior for SHIFT+TAB key combinations.
* Completion notes: Implemented `Tab` indentation using two spaces in the editor textarea.
* Completion notes: Implemented `Shift+Tab` unindent behavior across current line/selected lines (removes up to one indent level).

### 8. Only Edit Selected Text

* [x] When the user selects a chunk of text and prompts "Rephrase for coding agent" it should not rephrase the entire document. It should only rephrase that chunk of text.
* Completion notes: Added selection-aware prompt instructions and selection-aware replacement behavior so selected text gets replaced directly rather than rewriting the entire document.

### 9. Make a "Clickable App"

* [ ] For both Mac and PC that can be downloaded, added to the dock, double clicked and opened.
* Completion notes: Deferred per user instruction ("Skip Task 9 for now").
