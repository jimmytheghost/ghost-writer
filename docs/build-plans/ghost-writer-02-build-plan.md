## Phase 2: Ollama Integration - Prompting - Detailed Build Plan

**Objective:** Connect the editor to Ollama and enable a basic prompting workflow with a small inline prompt box, model selection, and non-streaming responses.

**Scope (Phase 2):**
- Prompt UI (small box near cursor) triggered by **Ctrl+Shift+A**.
- Model selection dropdown (model-agnostic, user chooses from available models).
- Send prompt + current document text to Ollama (`http://localhost:11434`).
- Display response in a temporary panel (do not insert into document yet; Phase 3 handles insertion).
- Non-streaming responses only.

**Out of Scope (Phase 3+):**
- Inserting responses into the editor content.
- Streaming responses.
- Advanced prompt templates or context management.

---

## 1. Requirements & Dependencies

**Technical Requirements:**
- Ollama running locally at `http://localhost:11434`.
- Access to Ollama REST API endpoints:
  - `GET /api/tags` for model list (recommended).
  - `POST /api/generate` for prompt execution.

**Dependencies:**
- Use built-in `fetch` for HTTP requests (no extra library required).

---

## 2. UX Flow & UI Behavior

**User Flow:**
1. User presses **Ctrl+Shift+A** inside the editor.
2. A small prompt box appears near the cursor position.
3. User selects a model from a dropdown (default to the first available model).
4. User types an instruction and submits.
5. The app sends the prompt + current editor text to Ollama.
6. The response is displayed in a response panel (below editor or in a small modal).
7. User can close the prompt box or request another prompt.

**Prompt Box Placement:**
- Use cursor coordinates from the textarea to position the prompt box.
- Fallback: if coordinates cannot be determined, anchor near top-right of editor.

**Keyboard & Focus:**
- **Ctrl+Shift+A** opens prompt box.
- **Esc** closes prompt box.
- Auto-focus the prompt input when opened.

---

## 3. Data Flow & State Management

**State to Add (App or Editor):**
- `isPromptOpen` (boolean)
- `promptText` (string)
- `selectedModel` (string)
- `models` (array of model names)
- `isLoading` (boolean)
- `promptResponse` (string)
- `promptError` (string | null)

**Suggested Ownership:**
- Manage Ollama request state in **App.jsx**.
- Keep Editor responsible for keybinding events and cursor position.
- Introduce a `PromptOverlay` component to keep UI clean.

---

## 4. Ollama API Integration

**Model List:**
```http
GET http://localhost:11434/api/tags
```
Expected response (example):
```json
{
  "models": [
    { "name": "llama3" },
    { "name": "mistral" }
  ]
}
```

**Prompt Execution:**
```http
POST http://localhost:11434/api/generate
Content-Type: application/json

{
  "model": "<selected-model>",
  "prompt": "<user prompt>\n\n---\n\n<document content>",
  "stream": false
}
```

**Response Parsing:**
- Use `response.json()` and read `response` field.
- Surface errors when HTTP status is not OK or response is malformed.

---

## 5. Component Design

**New Components:**
- `PromptOverlay` (renders prompt input, model dropdown, submit/cancel).
- `PromptResponsePanel` (renders Ollama response + error).

**Suggested Props:**
- `PromptOverlay`
  - `isOpen`
  - `position` (x/y)
  - `models`
  - `selectedModel`
  - `promptText`
  - `onPromptChange`
  - `onModelChange`
  - `onSubmit`
  - `onClose`
  - `isLoading`
- `PromptResponsePanel`
  - `response`
  - `error`
  - `onClear`

---

## 6. Editor Integration

**Keybinding:**
- Replace placeholder alert for Ctrl+Shift+A.
- Pass a callback from App to Editor: `onPromptOpen(cursorCoords)`.

**Cursor Position:**
- Use a helper to determine caret position in the textarea.
- If too complex, allow an approximation (top-right anchor) and track TODO for refinement.

---

## 7. Error Handling & Edge Cases

- Ollama not running → show a clear error: “Ollama not detected at localhost:11434”.
- Empty model list → disable prompt and show message.
- Large document content → note potential latency.
- Failed request → display error message in response panel.

---

## 8. Testing & Verification Checklist

- Press Ctrl+Shift+A → prompt box opens.
- Prompt box appears near cursor (or fallback).
- Model dropdown is populated from Ollama tags.
- Submitting prompt sends request to Ollama.
- Response displays in panel.
- Errors appear if Ollama is offline.
- ESC closes prompt box.

---

## 9. Deliverables

- Prompt overlay UI with model selector.
- Non-streaming Ollama request integration.
- Response display panel.
- Updated keyboard shortcut handling.

---

## 10. Notes for Phase 3

- Phase 3 will insert response into document content at cursor position or replace selection.
- Streaming can be added by setting `stream: true` and handling incremental responses.
