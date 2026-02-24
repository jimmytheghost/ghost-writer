# Ghost Writer To Dos

## Simple Fixes / Tweaks
[x] Links in “About” don’t work
[x] The blinking cursor in edit mode is MASSIVE
  - It’s the size of the line and not the size of the text   
[x] Make it so when the file has a name, and the user clicks cmd+s it just saves without dialog
[x] When changes are made to file, add * to tab headline text.
[x] Hide .md in tab headlines
[ ] The — emdash problem is back — if user types two or three dashes in a row it auto-converts to emdash 
[ ] In markdown preview - if user hits “exit” it takes them back to text editor
[ ] In “view” - add feature to “Hide Tab Bar”


## Edge Cases
[ ] Tabbed list problem —> tabbed-problem.png

## LLM Integration Bugs
[ ] Make sure LLM generation never deletes what is currently written
[ ] If no text is highlighted - LLM generation should insert where cursor is - if text is highlighted it should replace that text and any {{}} text and leave everything else untouched 
[ ] Stop button is buggy

## New Features

### Inline prompts

[ ] New Feature- In the editor a user can put text in some kind of syntax, like {{ }} or something but if a user uses that code the “send” button in the prompt input is activated. If the user clicks send, it reads all text, finds all {{}} and reads the text in those brackets as prompts.

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

## Stretch Goals

[ ] Enable / Disable Line focus
[ ] Enable / Disable Paragraph focus
[ ] Text zoom (100%, 150%, 200%)
