# Prompter

Build web apps through sequential prompts.

## Commands
- `run`   - Execute next prompt from marker position, process changes, update indexes
- `reset` - Clear app state, remove temp files, reset indexes, return to start

## Files
- `meta/rule/`                        - Project rules and conventions
  - `prompt.txt`                      - How to execute prompts, track progress, manage state
  - `format.txt`                      - How to format files, structure content, use markers
  - `code.txt`                        - How to write code, align text, maintain style
  - `codename.txt`                    - How to name things, use patterns, follow conventions
  - `index.txt`                       - How to track files, list codenames, maintain order
- `meta/prompter_index.txt`           - List of prompter files, track changes, show structure
- `meta/app_prompt/`                  - Prompt files for app development
- `app/`                              - Your web app code, components, styles, scripts
- `index.html`                        - Web app entry point

## Codename Change List
After each prompt execution, a codename change list must be shown in the response. This list:
- Shows all new identifiers created
- Shows all existing identifiers that were modified
- Uses snake_case format
- Includes type suffix (_file, _dir, _func, _var)
- Is sorted alphabetically
- Is numbered (01, 02, etc.)
- Is grouped by type
- Must be the last part of any update response
- Must be separated from other content by a blank line
- Is shown in the format:
    [Other update information...]

    Codename Change List:
        01. example_file
        02. example_func
        03. example_var

//////////////////////////////////////////////////////////////////////////////// 