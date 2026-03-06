Comprehensive feature list for **Ghost Writer** (current repo state, v`1.4.7`):

1. **Core Editor Experience**
- Distraction-focused single-document editing pane with tabbed multi-document workflow.
- True distraction-free layout controls: hide/show prompt input panel, footer, and tab bar.
- Native-feel textarea editor with custom syntax overlays for headings, lists, checkboxes, links, emphasis, strikethrough, quotes, inline markdown tokens, and fenced code markers (``` + language tag).
- Prompt-focused selection highlight overlay while AI prompt input is focused.
- Automatic fallback to lightweight editor mode for large documents (disables heavy overlays for performance).

2. **AI Writing With Local Models (Ollama)**
- Local LLM integration via Ollama (`/api/generate`) with streaming token output into the editor.
- Optional colored streaming-token overlay (View menu toggle) for generated text.
- Selection-aware generation:
  - Rewrites selected text.
  - Inserts at cursor when no selection is active.
- Inline placeholder generation using `{{...}}` tokens, processed sequentially across a document.
- Live inline placeholder highlighting: typing `{{` immediately turns placeholder text blue, and blue state continues until `}}` is typed.
- Global prompt + inline prompt composition for richer instructions.
- Start/Stop generation controls.
- Undo/Redo specifically for last AI generation output per tab.
- Prompt clear action and generation error surfacing.
- Model picker in footer with selected-model persistence behavior.
- Snapshot-based model loading (`public/ollama-models.json` + `src/generated/ollama-models.json`) with graceful fallback messaging.

3. **Markdown Preview and Interaction**
- Full preview mode toggle (editor <-> rendered preview).
- Safe markdown rendering pipeline (`markdown-it` + sanitizer).
- Supported markdown extras include task lists, footnotes, definition lists, attrs/IDs, mark/highlight, sub/sup, emoji shortcode.
- Arrow token rendering in preview (`<--` -> `←`, `-->` -> `→`).
- Local filesystem markdown images render in preview (desktop asset protocol support for `file://` image paths).
- Oversized preview images auto-scale to fit the markdown render container width while preserving aspect ratio.
- Clickable preview checkboxes that sync state back into source markdown.
- Toggle to show/hide inline prompt tokens (`{{...}}`) in preview/output rendering.
- Editor/preview scroll behavior tuned for usability:
  - Editor scroll is isolated per tab.
  - Markdown preview stays synchronized with its corresponding document context.
- Preview link safety enforcement (allowed protocols only), with desktop external-open behavior.
- Escape key exits preview mode.

4. **Document Tabs and State**
- Multi-tab editing with monotonic untitled naming (`Untitled`, `Untitled 2`, etc.).
- Dirty-state tracking (`*` on tab label when unsaved).
- Duplicate current tab.
- Rename current tab (native rename flow on desktop for saved files).
- Close-tab behavior with nearest-tab fallback and automatic replacement tab if last tab is closed.
- Open-file tab behavior:
  - Opening a file generally opens it in a new tab.
  - If current tab is empty/untitled, opening a file replaces that tab.
- Per-tab prompt text/error and generation history isolation.

5. **File Operations**
- New/Open/Save/Save-to-existing-path flows.
- Desktop-native file dialogs for markdown open/save.
- Close and Close All Tabs actions in desktop File menu.
- Closing an unchanged saved tab skips unnecessary save confirmation prompts.
- Browser fallback download flow when not in desktop runtime.
- Markdown-only guardrails for open/overwrite paths.
- File load size guardrail enforced at 10MB with explicit user-facing error message.
- Copy behavior prioritizes:
  - OS text selection,
  - editor selection,
  - then full document.
- Desktop “Open Recent” menu with persisted recent-file list and auto-pruning of invalid entries.

6. **Export and Print**
- Export actions:
  - Copy HTML
  - Copy rich text (HTML + plain text clipboard item when available)
  - Save as HTML
  - Save as PDF (print pipeline)
  - Save as RTF
  - Save as Word-compatible `.doc` (HTML payload)
  - Save as LaTeX `.tex`
  - Diagnostics bundle (`.json`)
- Print/export markdown rendering respects the inline-prompt visibility toggle.
- Desktop-native print invocation (custom macOS print handling; fallback to web print where needed).

7. **Spellcheck System**
- Optional spellcheck toggle (default configurable).
- In-app misspelling overlay rendering (underlines misspellings).
- “Committed word” behavior: marks words after delimiter/whitespace boundary, reducing noisy in-progress flags.
- Traditional on-demand spellcheck flow via Edit menu option with modal scan/report behavior.
- Custom word list management modal:
  - Add comma-separated terms.
  - Enable/disable individual terms.
  - Remove terms.
- Default extension-like terms pre-allowed (`.png`, `.jpg`, `.md`, etc.).

8. **Smart Writing Helpers and Editing Shortcuts**
- Find and Replace support for in-document editing.
- List continuation on Enter (ordered and unordered).
- Empty-list-item exit behavior on Enter.
- Tab / Shift+Tab indentation and outdent across lines/selections.
- No dash auto-conversion in editor input: `-`, `--`, and `---` stay literal with stable caret behavior.
- Inline formatting shortcuts:
  - Bold (`Cmd/Ctrl+B`)
  - Italic (`Cmd/Ctrl+I`)
  - Strikethrough (`Cmd/Ctrl+\`` and `Cmd/Ctrl+Shift+X`)
- Formatting shortcut stability improvements:
  - Prevents repeated wrapping artifacts (e.g., `******example******`) on repeated bold/italic actions.
  - `Cmd/Ctrl+*` applies a single `*` wrapper around selected text.
- Select all in editor (`Cmd/Ctrl+A`).
- Prompt-open from editor selection (`Cmd/Ctrl+Shift+K`).

9. **Global App Shortcuts**
- `Cmd/Ctrl+S` save
- `Cmd/Ctrl+Shift+S` save as
- `Cmd/Ctrl+O` open
- `Cmd/Ctrl+N` new tab/doc
- `Cmd/Ctrl+W` close active tab
- `Cmd/Ctrl+Shift+W` close all tabs
- `Cmd/Ctrl+F` find and replace
- `Cmd/Ctrl+P` print
- `Cmd/Ctrl+M` toggle preview
- `Cmd/Ctrl+T` toggle always-on-top
- `Cmd/Ctrl+Shift+B` collapse/expand footer
- `Cmd/Ctrl+Shift+H` toggle tab bar (runtime shortcut hook)
- `Cmd/Ctrl+Shift+D` hide/show prompt input bar
- `Cmd/Ctrl+Shift+P` hide/show inline prompt tokens in preview
- `Cmd/Ctrl+Shift+Y` hide/show colored streaming output

10. **Desktop (Tauri) Integration**
- Desktop app shell with menu-driven commands mapped to frontend events.
- Native menus for File/Edit/View/Settings/About.
- Dynamic “Open Recent” submenu (up to 10 items).
- Native always-on-top window control.
- Native save/open/rename dialogs and export dialogs.
- Auto-attempt to ensure Ollama server is running on desktop app startup.
- Desktop metadata surfaced in About modal (app name/version).
- Default desktop window sizing: initial `1100x700`, centered, with minimum `430x560`.
- Packaging targets configured: NSIS (Windows), DMG (macOS).

11. **Settings and Persistence**
- Persisted settings include:
  - default model
  - theme
  - text zoom
  - default always-on-top
  - default footer collapsed state
  - startup preview mode
  - default spellcheck
  - default show/hide inline prompt tokens in preview/export
  - autosave preferences
  - custom word list + disabled set
- Session restore:
  - previously opened saved-tab file paths
  - active tab path restoration
- Theme toggle (dark/light).
- Text zoom modal (50/75/100/125/150).
- Footer collapsed/expanded interaction model with keyboard accessibility.

12. **Security and Safety**
- Sanitized markdown HTML output with explicit allowed tags/attributes.
- URL protocol allowlist for links/images (`http`, `https`, `mailto`, `tel` + safe relative/hash patterns).
- Strips unsafe attrs (`on*`, inline style, unsafe href/src).
- Restricts rendered `<input>` elements to checkbox type only.
- Desktop external URL opening enforces protocol allowlist at command layer too.
- Tauri capability restrictions deny unsafe window/webview creation actions.

13. **Developer/Project Features**
- Quality gate command: lint + tests + build.
- Node version preflight enforcement (`>=20.19` or `>=22.12`).
- Automated model snapshot sync script (`ollama list` -> JSON snapshots).
- Renderer/package/Tauri size measurement scripts.
- Cross-platform launch scripts that check/start Ollama and validate prerequisites.
- Automated test coverage across app behavior, tabs, shortcuts, inline prompts, markdown safety, spellcheck, and error paths.
