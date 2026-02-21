**Ghost Writer Project Tasks**

### 1. Footer Collapse Implementation

* Create a toggle arrow to the right of the light mode button with a vertical line (`|`) separating them.
* Ensure the footer collapses by default.

### 2. Custom Syntax Parsing for Checkbox Formatting

* Introduce custom syntax or parsing mechanism that allows users to format checkboxes using `[ ]` brackets at the beginning of lines (similar to `#`).
* Limit this syntax to only affect checkbox formatting.

### 3. Transparent Background Update

* Update the background styling to a glassy, transparent effect, while keeping the container at full opacity.

### 4. "Generation Stopped" Message Styling

* Apply proper CSS styling to the "Generation stopped." message for improved visual consistency.

### 5. Prompt Hardening and Refinement

* Modify the backend prompt to only output requested text, excluding any introductory phrases (e.g., "Sure! Here's an outline for your essay: ...").

### 6. Collapse Prompt Input and Implement Tooltips

* Develop functionality to collapse the prompt input field.
* Explore alternative methods for displaying tooltips for prompt input.
* Or simply make it the size of a single line input field.

### 7. Enable Tab and Shift+Tab Navigation in Text Input

* Allow users to navigate text input using TAB keys, moving the cursor an appropriate number of spaces (not switching containers).
* Determine optimal behavior for SHIFT+TAB key combinations.

### 8. Only Edit Selected Text

* When the user selects a chunk of text and prompts "Rephrase for coding agent" it should not rephrase the entire document. It should only rephrase that chunk of text.

### 9. Make a "Clickable App"

* For both Mac and PC that can be downloaded, added to the dock, double clicked and opened.