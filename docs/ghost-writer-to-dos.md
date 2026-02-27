# Ghost Writer To-Dos

---

## Bugs

[ ] (PC) Around line 10, things start getting buggy with the cursor.  Not is it buggy visually but words start getting jumbled while typing. 
    - This is an example of what it looks like        |
    
    - (macOS/PC)Text cursor issues also appear on macOS. When a long word has a line break and the cursor deletes the final letters, the word breaks back to the top line while the cursor remains on the bottom line.

[ ] (macOS/PC) In-line spell check doesn't seem to be working.

[ ] (macOS/PC) Page scrolling is “synced" between tabs. If tab one scrolls to the bottom of the doc and the user clicks on the second tab, the second tab will be at the bottom of the doc. If the user scrolls to the top of tab 2 and switches back tab 1, it will be at the top of tab 1.
  - Conversely the Markdown preview scroll is *NOT* synced to its respective text window when it should be.

[ ] (macOS/PC) Adding cmd+b or cmd+i continues to add * to text like: ******example****** 


---

## GPT Audit

**Was markdown sanitization driven by paranoia or real awareness?** <--  What in the hell does this mean

**Why strict protocol allowlists?**

**Did desktop context change your threat model?**

[ ] Remove 2mb file guardrail.

---

## Tweaks

[ ] cmd + z should go back further.

[ ] (macOS/PC) When a user opens a file - it should open in a new tab, not the current tab.

[ ] (macOS/PC) When a user is in list mode and returns to new line, a new - is created. This is great. But we need to make it if the user then hits "tab" the new  - indents with the text.
   - Similarly, if they are in list mode and in a tabbed list item and hit return, then a new tabbed - is created -- if the user hits "backspace" it should unindent the -.

[ ] (macOS/PC) Related to the previous - Ordered/Numbered lists, when the user returns to the next line and indents, it should create an indented - tab.
   
[ ] (On PC) The menu bar's first dropdown is "Ghost Writ" and when the user clicks it, the only item is "About Ghost Writer"
  - Make it so the PC menu dropdown is "About" and the item remains "About Ghost Writer"
  
[ ] “cmd+*" should add a single * to both sides of the selected text.

[ ] Add a close all tabs to the menu.

---

## New Features

[ ] (macOS/PC) Auto Save - Set the time and number of file iterations, etc in settings.

[ ] [macOS/PC} Trad Spell Check - In Edit dropdown add a “Spell Check" option - custom modal that scans doc and reports any spelling, grammar or anything else.

    - Stretch Goal - For down the line, add a Grammarly like feature where the LLM reads your doc and suggests changes to any problematic text.
    
[ ] Parse <-- and --> as ← and →

[x] Search - Find and Replace