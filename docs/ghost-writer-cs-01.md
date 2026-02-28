# Ghost Writer

## Small, Powerful, Private — A Local-First AI Writing Environment

---

## Overview

Ghost Writer is a distraction-free Markdown desktop editor with built-in local LLM assistance via Ollama. It is less than 5mb in size. It launches instantly. It works offline. It requires no API keys and incurs no subscription fees.

It was designed to solve a simple but persistent problem: modern AI writing workflows are fragmented.

You write in one application.
You prompt in another.
You copy.
You paste.
You edit.
You repeat.

Over time, this constant context switching becomes friction. Not dramatic friction. Not catastrophic friction. Just enough to break flow and open Twitter.

Ghost Writer collapses that loop into a single environment without the distraction. The editor and the model live in the same space. The writing remains private and the workflow remains clean.

Small software can be pretty, powerful, and private.

---

## The Problem That Wouldn’t Go Away

As I began building more AI-powered tools, I found myself writing Markdown constantly. Markdown had become the lingua franca of AI systems which is great because I *also* love the syntax. I was drafting documents in VSCode, Cursor, ChatGPT, Ollama sessions, Byword, and even TextEdit.

I loved using Ollama for local, free generation but I did not love copying its output back into my document. 

I didn’t love waiting for web UIs to load when all I wanted to do was jot down a quick idea. 

I didn't love the bulky and cumbersome “AI editors" that felt like enterprise dashboards.

And I definitely didn’t playing API fees for drafting personal essays.

I didn’t want a chat panel taking up half my screen. I didn’t want toolbars, crop marks, floating widgets, or integrations I would never use. I wanted something visually small — both vertically and horizontally — so it could sit beside my main screen like a drafting companion.

I searched for something like this. I used GitHub. I even had an OpenAI agent search for me. If I had found the right tool, I would have happily used it.

I didn’t find one.

So I built it.

---

## Why Byword?

Ghost Writer is directly inspired by the app Byword.

Byword has been my writing standard for over a decade. It is minimal. It is typographically calm. It stays out of the way. I've used it forever.

For years, I wished I could shrink it further — a narrower drafting column that could live beside whatever I was building, researching, or designing. It's small, but not small enough.

At the same time, I loved Ollama’s simplicity — especially the dropdown in the bottom corner that lets you swap models instantly.

I thought constantly:

“If only Byword had this.”

Ghost Writer was born.

---

## Design Non-Negotiables

From the beginning, three principles were non-negotiable.

First, the interface had to be simple, clean, elegant, and easy to look at. Cluttered UI is the enemy of creativity.

Second, local LLM integration had to feel frictionless. Selecting text and sending a prompt should replace that text. If nothing is selected, generation should insert at the cursor. No config file personalization or tricky user commands.

Third, it should not reinvent the editor. It should feel like a normal Markdown tool. Familiar behaviors reduce cognitive overhead. AI should make the tool more useful, not make the tool feel foreign.

Ghost Writer was intentionally designed to be narrow — 400 pixels wide by default — and small enough to function as a drafting sidecar. It can stretch vertically, but it never demands your full screen. But when it does, it's a beautiful place to work.

---

## Interaction Philosophy: AI Without Conversation

Ghost Writer does not include a chat history, a conversational transcript, or sidebar of messages. The AI is not presented as a friend or a chatbot but a function of the document.

If text is selected, and the user wants AI to rewrite that text, it will replace only that text. If nothing is selected, it inserts at the cursor. The prompt input is intentionally one line tall. You communicate with the model, but you do not converse with it.

The goal is simple: the user should think about their writing, not about socializing with an LLM.

⸻

## Inline {{...}} Prompt Tokens

The architectural feature I am most proud of is the inline token system.

You can write:

{{Expand this paragraph with a stronger counterargument}}

These tokens act like writer’s notes. Instead of stopping, moving to the prompt input, generating, editing, and resuming, you stay in flow. You annotate your document with intent.

At any point, you can process these sequentially.

You can even chain them creatively:

{{Write an argument explaining why Michael Jordan is the best basketball player ever}}
{{Debate the previous argument and explain how LeBron James is better in each category}}

The document becomes an executable drafting surface. It feels less like messaging an AI and more like leaving notes to yourself — except the notes can resolve instantly.

This was inspired by years of writing screenplays and leaving bracketed notes like “Research what a nurse would actually do here” or “translate this to Latin." Those notes used to sit for days or months. Now they can be resolved immediately.

---

## Streaming as a Trust Mechanism

Generation streams live into the editor. This was not a cosmetic frontend showcase. It was practical.

Ghost Writer was designed to work on consumer-grade hardware. Local models take time to warm up. Without streaming, you see nothing but a repeating visual “heartbeat". You hear your fan spin. You start wondering if something broke.

Streaming shows you that it is working in real-time. It lets you stop early if the model goes off track. It saves tokens, energy, and time.

---

## Why Desktop?

I initially ran Ghost Writer in the browser. But I kept opening Byword and TextEdit instead.

They were in my Dock and launched instantly. They're “real" apps.

Even with a launch script, navigating to a project folder and spinning up a browser version was a drag.

Once I realized packaging it as a proper desktop app was achievable, that became the milestone. I wanted a “real app” with an icon. Something that lived alongside the tools I already trusted.

Ghost Writer is built with Tauri rather than Electron. An early Electron MVP was roughly 80mb before most features were even added. Ghost Writer’s current build is approximately 3–5MB.

Tauri is not perfect. Some browser behaviors do not translate one-to-one. Packaging takes iteration. But the size difference makes it more than worth it.

Small software was the core of the philosophy, not an afterthought.

---

## Local-First AI Integration

Ghost Writer integrates with Ollama via its /api/generate endpoint.

I chose Ollama because it is familiar, popular, easy to install, and free. It is currently the most approachable open-source local LLM runner available. It allows offline usage and eliminates API charges.

When Ghost Writer launches, it loads available local models automatically. There is no config file editing required. Model switching is instantaneous.

This encourages experimentation while keeping the experience simple.

---

## Security & Hardening

Ghost Writer includes sanitized Markdown rendering, explicit allowed tags and attributes, URL protocol allowlists, stripped unsafe inline attributes, restricted rendered input types, and enforced desktop external-open validation.

These were implemented following multi-agent audit passes.

Rather than assuming security was unnecessary because the app is local-first, I chose to implement audit-driven hardening when it was flagged. The process was iterative, not reactive.

---

## Agentic Engineering Workflow

Ghost Writer was built entirely through AI-directed development. I did not manually write or review the code.

Instead, I wrote structured, step-by-step implementation plans and executed them through OpenAI Codex on macOS and Windows, supplemented with VSCode workflows.

Every tested step was committed to GitHub. Every major milestone was pushed.

After significant iterations, I opened new agents — often in different systems or with different models — and had them audit the entire repository. They generated structured cleanup lists. I executed those lists. I manually tested again.

The loop looked like this:

Plan → Build → Manual Test → Audit → Refactor → Re-test → Commit.

Multiple agents auditing the same codebase reduced blind spots. Switching systems increased reproducibility. Persistence replaced guesswork.

The value here is not that I typed code. It is that I orchestrated architecture, scope, quality control, and UX integrity through AI systems.

Ghost Writer is less about “can I write a computer program” and more about “can I direct AI systems to ship stable and clean software.”

---

## What I Deliberately Did Not Build

Ghost Writer does not integrate with Medium, WordPress, iCloud, Dropbox, or Google Drive. It does not include publishing pipelines. It does not include a multi-panel chat history.

It is not trying to be a platform.

It is trying to be a writing tool.

RAG integration, non-Ollama backends, and theme modularity are part of the v2.0 vision. They are not required for 1.0.

---

### Is This Revolutionary?

Not at all.

There are almost certainly dozens — perhaps hundreds — of Markdown + local LLM projects on GitHub.

Ghost Writer is not a moonshot.

It is, in some ways, a sophisticated “hello world.” But it is one I use daily.

It proves that I can take an idea from concept to packaged, cross-platform desktop application and maintain it with discipline.

This was not “vibe coded in a weekend." It was vibe coded for about a month which is likely too long but I wanted to learn and make something real.

It is the goldfish I am keeping alive to prove I can take care of a dog.

--- 

## What It Changed

Before Ghost Writer, many of my AI projects were creative experiments. Fun. Interesting. Niche.

But Ghost Writer has universal utility. It is not a game. It is not a novelty. It is a tool.

It changed how I think about AI applications. AI does not need to live in a separate window. It can live inside tools — invisibly, functionally, productively.

Small software can be powerful.

Small software can be private.

And small software can pretty.

---

## What I Want You to See

If you are a long time tech person, I do not expect you to be impressed that I wrote clever code. As I said earlier - I didn't write *any* code.

I want you to see that I:
	•	Identify real workflow problems.
	•	Make principled UX decisions.
	•	Choose intentional constraints.
	•	Ship production-ready artifacts.
	•	Use AI systems strategically and honestly.
	•	Maintain discipline through iteration.

Ghost Writer exists because I needed it.

Now anyone who needs a small, powerful, and private writing tool can have it too.