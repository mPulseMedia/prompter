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

//////////////////////////////////////////////////////////////////////////////// 