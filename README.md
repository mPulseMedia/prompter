# Meta

Build structured web apps using [Cursor.ai](https://cursor.ai) through sequential prompts, codename indexing, and enforced naming conventions.

## Commands

Use these commands within the Cursor.ai chat to control execution:

- `run`  
  Execute the next prompt from the current marker. Apply changes, update indexes, and continue forward.
  
- `reset`  
  Clear the app state: remove temporary files, reset indexes, and return to the starting point.

## Folder Structure

Cursor.ai generates app files in the `app` folder based on sequential requirements in `app_prompt`, guided by rules in the `meta/rule` folder. All identifiers are tracked in codename index files.

```
app/                    → Generated web app files  
  └── index.html        → Default landing page

app_prompt/            → Requirements and prompt sequence  
  ├── ##_epic          → Master prompt file (includes past and future prompts)  
  └── app_index.txt    → Index of code identifiers used in `app/`  

meta/                   → Support files for prompt guidance and code structure  
  ├── rule/             → Formatting and naming rules  
  │   ├── format_code.txt    → Code layout and alignment rules  
  │   ├── codename.txt       → Rules for naming identifiers  
  │   ├── rule.txt           → Rules for how to structure and format rule files  
  │   └── format_index.txt   → Rules for maintaining codename indexes  
  └── meta_index.txt    → Index of identifiers used in `meta/` files
```

## Notes

- Prompts should be consistently formatted and follow rules in the `rule` folder.
- Codename indexes (`*_index.txt`) must be updated after each prompt cycle.
- Always start with `##_epic` as the central prompt thread.

