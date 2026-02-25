# Ghost Writer To Dos

## Simple Fixes / Tweaks
[x] Links in “About” don’t work
[x] The blinking cursor in edit mode is MASSIVE
  - It’s the size of the line and not the size of the text   
[x] Make it so when the file has a name, and the user clicks cmd+s it just saves without dialog
[x] When changes are made to file, add * to tab headline text.
[x] Hide .md in tab headlines
[x] The — emdash problem is back — if user types two or three dashes in a row it auto-converts to emdash 
[x] In markdown preview - if user hits “exit” it takes them back to text editor
[x] In “view” - add feature to “Hide Tab Bar”
[x] The check boxes need better alignment in markdown preview


## Edge Cases
[x] Tabbed list problem —> tabbed-problem.png

## LLM Integration Bugs
[x] Ensure LLM generation never deletes what is currently written
[x] If no text is highlighted - LLM generation should insert where cursor is - if text is highlighted it should replace that text and any {{}} text and leave everything else untouched 
[x] Stop button is buggy -- when a message is generating, the stop button works.  But once it starts streaming tokens in the main editor, when the user clicks “stop” nothing happens - it keeps generating. It should stop.
[x] When the clicks stop and the “STOPPED” pill displays, when it fades away, the text behind the prompt should reappear. Instead it stays missing until the user clicks the prompt input.
[x] When user clicks stop and the “STOPPED” pill displays, instead of having it fade away, have it disappear instantly and the prompt text returns when it disappears.
[x] Remove output token cap


## New Features

### Inline prompts

[x] New Feature- In the editor a user can put text in some kind of syntax, like {{ }} or something but if a user uses that code the “send” button in the prompt input is activated. If the user clicks send, it reads all text, finds all {{}} and reads the text in those brackets as prompts.

Example:
Markdown has become a widely accepted and easy-to-read markup language.  It's used for documentation, README files, and even some websites. {{Give a quick example of what readme files are}}. The simplicity of Markdown makes it appealing to users who want to create content without extensive knowledge of HTML or other markup languages.

If they clicked the send button it would read whatever is in the prompt input first and then “Give a quick example of what readme files are” and then it would replace {{}} and the text with the output.

### Print

[ ] Users should be able to press cmd/crtl+p and bring up the print options to print their document in Markdown

### Share

[ ] In MD Preview mode - leave the “prompt input container” box as is.  In MD Preview, turn the input into buttons. “Copy HTML”, “Export” which saves as HTML, and “SHARE” which saves a compact digital image of the markdown preview so the user can share on Social Media, texts, etc.

### Text Stats

[ ] In the new ‘button bar’ in MD preview mode, list the document stats (Markdown • 330 words • 1928 characters  |  [Copy HTML] [Export] [Share])
[ ] In view - add ability to hide this

### Reopen Documents

[ ] When the user shuts down Ghost Writer with saved tabs open. The next time they open Ghost Writer, those tabs are preserved.

### Spelling Word List

[ ] In settings add a “Word List” function. A custom modal with a blank, plain text container where the user can enter words, separated by comma.  These words will not be flagged as spelling mistakes. Comes with a pre-loaded list with things like .png, .jpg, etc.

### Open Recent
[ ] Add an Open Recent to file with a list of recent files.

### Export / Share
[ ] Export and Share options similar to Byword

### Save
[ ] When a user opens / edits a file with a known file name and file path and then clicks cmd/ctrl+s -- it should not trigger the OS save as pop up.  It should just save. 

## Stretch Goals

[ ] Enable / Disable Line focus
[ ] Enable / Disable Paragraph focus
[ ] Text zoom (100%, 150%, 200%)
