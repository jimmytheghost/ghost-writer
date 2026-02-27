# 1️⃣ Origin & Motivation

1. What specifically annoyed you about existing markdown + AI workflows?

   * Was it copy/paste?
   * Browser switching?
   * Privacy?
   * Cost?
   * Latency?
   * Something else?
  
**ANSWER:** All of the above. I like using Ollama to write but didn't like having to copy the outputs and paste them into my document. But I didn't want/need a bulky text editor with tons of distractions. I needed it to be lighting fast and small so when I needed to jot down a quick note, it wouldn't take forever to load. I wanted it to be visually small, both vertically and horizontally for screen real estate. I wanted it to be clean and void of distractions like buttons, page layouts and crop marks, etc. And I wanted it to have easy Ollama integration so my work can remain private, but more importantly, free of API charges. I'm sure there are other apps out there that do this very thing but: A. I couldn't find any at the time. I looked on GitHub, I had an OpenAI Agent search for me. If I could find it at the time, I would have used it happily.  B. Since I started developing this, I've seen numerous “Markdown editor with locall LLM integration…" with even better features like “…and RAG!”. But they are all big, bulky, enterprise-looking word processing applications. One was advertised as “small file size! Only 30mb" while Ghost Writer is less than 5mb.

2. Why Byword specifically as inspiration?

   * Minimalism?
   * Native feel?
   * Typographic calm?
   * Something nostalgic?

**ANSWER:** Byword is the standard and I've used it for 10+ years. I've always wished I could make it smaller on my screen for various reasons. Using Ollama, I love the dropdown in the bottom right corner that allows you to easily hotswap LLM models. “If only Byword had this…" and Ghost Writer was born.

3. Did you build this primarily:

   * For yourself?
   * As a portfolio flagship?
   * As a product experiment?
   * To explore local LLMs?

**ANSWER:** My whole life, I've worked on a lot of creative stuff like screenplays, character backgrounds, songs, short stories, novels, etc. As I've begun to work in the more technical world, I naturally made fun creative experiments that had no real practical use other than “Well this is fun!" As I was building more and more AI tools I found myself writing a lot of markdown (the official language of AI) documents in VSCode, Cursor, Ollama, ChatGPT and, obviously, Byword. When I started building my mix of TextEdit/Byword/Ollama, I thought - this could be a good portfolio piece. So instead whipping it up in a weekend - bugs and all - and using it for myself. I spent close to a month working on it dilligently to showcase that I can build a realworld, application. And as I continue to use it and learn more about agentic engineering, I will continue update the project and make it better.

4. Was there a “moment” where you realized:

   > “Oh, this should be a desktop app, not a web app”?

**ANSWER:** Yes - and it's kind of funny. I kept opening Byword and TextEdit *after* a stable version of Ghost Writer was built and I was tinkering with it and working on other projects. I was using Byword and TextEdit/Notepad because they're in my Dock or Taskbar and I can click them and open them instantly. Even after building a “launch.command” file, I had to navigate to my cumbersome “ghost-writer-editor" file and launch it - in browser. Making a “real *app* app, type app" sounded like a good milestone and once I learned it was pretty easy, the idea of making this a feature portfolio piece caught on.

---

# 2️⃣ Target User

5. Who is Ghost Writer for?

   * Developers?
   * Novelists?
   * Journalers?
   * AI power users?
   * Privacy-first users?

**ANSWER:** All of the above. There is obviously a little bit of a learning curve to understand how to install a local Ollama model - all of which can easily be instructed by ChatGPT or any popular LLM.  Otherwise it’s a free, private, LLM powered, distraction free, markdown text editor. That is something anyone on this planet can use.

6. What kind of writing is it optimized for?

   * Long-form?
   * Technical docs?
   * Notes?
   * Prompt drafting?
   * Something else?
   
**ANSWER:** I have yet to test out a truly long form document - which I will do soon. But otherwise, any and everything else. 

7. What kind of user is this NOT for?

**ANSWER:** Users who want their documents on a cloud service or users who dispise any and all forms of LLM integration.
---

# 3️⃣ Design Philosophy

8. What were your 3 non-negotiables in UX?
    - Simple, clean, elegant, and easy to look at UI.
    - Frictionless local LLM integration (selecting text and sending a prompt replaces text -- otherwise it prints where the cursor is)
    - Don't reinvent the wheel -- besides a few unique features (such as {{…}}) -- it should look, feel and function like a common markdown text editor like Byword.

9. Why single-pane editor instead of split-by-default?
    - I personally can't stand the split side-by-side editors. More importantly, Ghost Writer was designed to be 400px wide and 500px tall to be a small note taker or 400px wide and the height of your screen so you can easily have a “main screen" while drafting text.

10. Why local-first instead of cloud fallback?
    - I love AI and the tools of OpenAI, Gemini, and Anthropic, but subscription fees, API charges and internet requirements make them costly and limited. If I go to the park and want to get some work done, with no internet, no LLMs. And frankly, I'm not a big paranoid conspiracy theorist but the more private you can make your work, the better.

11. Why streaming output instead of waiting for full completion?
    - Ghost Writer was designed to work with limited, consumer grade equipment. If a user has a slow system and even the smallest model can take a moment to “warm up" and generate a response. Having a simple “loading…" heartbeat while your laptop fan starts spinning - it's easy to feel anxious and question if it's still generating and stop the generation and then try a “simpler" prompt -- even if it was working perfectly. At the same time, working with LLMs, it's very easy to see quickly if they're on the right or wrong track. Again, if the user has a slow system and waits for a full generation and immediately recognizes the output is not up to par, they have to start over.  That's a terrible system. With streaming output, the user can see - in real time - it's working and generating as well as read the output - allowing them to stop it if necessary. Saving time, energy and tokens.

12. Why inline `{{...}}` token system?
    - It allows the user to read through a document and add “prompt notes” throughout. When reading a document and then thinking of something the user wants to change -- instead of moving their mouse down to the prompt input, enter the prompt, hit enter, watch the generation, and then edit the output -- the user can type {{…}} and enter their prompt idea as many times as they want throughout the document, never breaking flow. Then at the end, hit send once in the prompt input and get all the outputs at once. But that's just how I use it and the only way I've thought to use it.  It's sequential, so a user could write {{Write an argument explaining why Michael Jordan is the best basketball player ever}} and then {{Debate the previous argument points and explain how Lebron is better in each category}} and chain them together in creative or inventive ways.

---

# 4️⃣ Technical Decisions (Important)

13. Why Tauri over Electron?
    - Thank you for asking! Electron is big, bulky, and pre-loaded with all kinds of stuff that is difficult to remove that Ghost Writer will never need. Electron is the “go-to" because it immediately makes your app compatible with macOS, PC, and Linux - but a rudimentary MVP version of Ghost Writer was ~80mb and that was before nearly all of it's advanced features. I was thinking Ghost Writer would be less than 10mb. Tauri has a few drawbacks. Some features that work fine in browser don't translate 1-to-1 with the Tauri shell. So after most iterations, my agent builds a new DMG or EXE for testing which takes time (and tokens). But Ghost Writer is currently ~3mb in total size and version 1.0 is close to shipping.

14. Why Ollama specifically?
    - Familiarity, popularity, and ease of use. I know there are other open source LLMs out there, but Ollama is the most popular and the one I've used the longest. If it was difficult to work with, I'd investiget those other options. But building with Ollama integration has been painfree. I'm a big believer in promoting the use of opensource and free AI technology and since Ollama is the leader in that market, I figured it was the way to go.

15. How did you think about model determinism and snapshotting?
    - There is a technical barrier necessary for this app. Most people aren't familiar with opening a computer terminal let alone pulling an opensource LLM model. My hope was to explain it enough to the people who have no tech background but not too much for tech savvy. I personally like using various models for different things. Ollama is very easy to use and experimenting with all kinds of models is very easy. I didn't want to edit a config file with my preferred model one time. A mandatory feature was “when this app opens, it needs to auto load all Ollama LLMs on your system…”. 

16. What was the hardest engineering problem?
    - I didn't write a single line of code and haven't read a single line of code. The hardest part of this project was making sure it's not full of AI slop code because - quite frankly - I don't even know what AI slop code looks like. So after many major mile stones, I'd have brand new agents, sometimes in completely new systems, do full audits of the entire repo, create a laundry list of things to clean up, move and fix, then work on project until the list was completed. I would manually test after each iteration and provide feedback. Then I'd open a new agent in a new app, use a new promotional model, have it audit my repo, and do it all again. But eventually, you give it to an agent and they say “This is in good shape and requires no major adjustments”. And then you move on. 

17. What part are you most proud of architecturally?
    - The simple yet incredibly effective {{..}} feature. It reminds me of Cursor's “tab complete" feature but for LLM writing.

18. What did you deliberately *not* build?
    - As mention previously, the frontend was intentionally minimal. Before I release 1.0 I might even cull down the footer bar to just light mode, dropdown and pin. I also had no desire to integrate with publishing services like Medium, website/blogs like wordpress, or cloud services like iCloud, Drive or Dropbox. That seemed like a lot of extra weight for a stripped down editor. And most importantly, a now traditional LLM chat panel which we will get to next.

---

# 5️⃣ AI Integration Strategy

19. Why selection-aware rewriting instead of separate “chat panel”?
  - I wanted Ghost Writer to feel like you're sharing a Google Doc with an LLM, not like you're in a chat panel with an LLM. The goal is for the user to spend as little time thinking about how to communicate with the LLM as possible to concentrate their thinking on their writing. That is why the prompt input is a single line tall and the {{...}} function is designed to act like writing partner notes than a DM to a friend. 

20. Why no conversation history model like ChatGPT?
  - Because there is no chat history or chat. The less the user thinks about communicating with the LLM, the more they concentrate on what they are writing. The LLM's can write your entire document.  But Ghost Writer was designed for writer's who want a clean, distraction free markdown editor with the ability to instantly access an LLM for any reason.

21. How do you think about AI as:

* A collaborator?
* A tool?
* A function?

  - As a lifelong creative who had 35+ years experience before generative AI was available, AI as a collaborator, tool and function has been life altering in the greatest of ways. I've never felt more creative, inspired, and able to do anything I can imagine. I can't tell you how many times I would write a screenplay and write the equivelant of {{..}} with notes like “Figure out what a nurse would actually do in this situation…" or “figure out what the actual government protocol is for this…”. Those notes would sit there for days or even years until I did the proper research. Now those details can be filled in instantly.
  
22. How do you prevent AI from breaking writing flow?
    - The lack of conversation and messaging is designed to make the LLM integration as “additive" as possible and the minimal, distraction free design keeps the focus on the text.

---

# 6️⃣ Security & Safety

23. Was markdown sanitization driven by paranoia or real awareness?
   - This relates directly to question 16. During an audit I was told this was something that should be implemented. Why say no? 

24. Why strict protocol allowlists?
    - I have no idea - in fact, I'm open to your input and if you think it's something I should change, I'm all ears.

25. Did desktop context change your threat model?
    - I have no idea what that means but sounds like something I should look into!

---

# 7️⃣ Performance & Constraints

26. Why 2MB file guardrail?
    - That's a damn good question. That's one of those things an agent put in at some point that keeps slippping through the cracks. That's a good catch and something that will be removed before v1.0 ships.

27. Why lightweight mode fallback? 
    - To keep it functional in all regards.

28. What performance constraints shaped decisions?
    - As I discussed earlier the streaming tokens and lightweight build.

---

# 8️⃣ Product Thinking

29. If you had to sell this:

* What’s the killer differentiator? - Lightweight, simple, distraction free, private, LLM text generation and word processing.

30. Would you ever monetize it?
    - Sure but monetizing might be more trouble than it's worth while free allows for a broader user base.

31. What’s v1.0 look like?
    - Very close to what it looks now but with a few more features.

32. What’s v2.0 look like?
    - RAG integration 
    - non-Ollama integration 
    - easily switchable front end design themes

---

# 9️⃣ Reflection

33. What did this project teach you?
    - How to agentically engineer a desktop app. Instead of a scrappy browser app that's functional but sloppy, I saw a professional grade project through end-to-end.

34. How is this different from your previous projects?
    - This is not a niche online game or small business tool, this is a product with a universal appeal.

35. Did this change how you think about AI apps?
    - Yes, I don't think I've even scratched the surface of what this app can do. Like I mentioned about, chaining together {{…}} prompts could produce really interesting and creative results.  This is just one unique this app could be used.

---

# 10️⃣ Positioning

36. If a hiring manager reads this case study, what do you want them to think?
    - I know there is a lot of negative noise about “vibe coders" but this guy clearly knows how to use these tools to create and ship professional grade tools. And he doesn't just build something and call it a day - this is a thorough full stack agentic engineer who keeps UX front of mind with a background and passion for frontend design.

37. What title should sit at the top?

Distraction Free Writing Environment with Free and Private AI Integration?

# Other

I built this using OpenAI's Codex 5.3 Desktop App on macOS and then VSCode + Codex on PC. I'd write out a step by step plan (which I now do in Ghost Writer) and give them to Codex in related chunks. If a step required it's own plan, I'd switch the agent to plan mode and then build. I used GitHub for version control and commited every tested step and pushed every major milestone. This made switching and testing multiple systems simple and efficient.