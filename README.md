# Prompter

Build web apps through sequential prompts.

## Commands
- `run`   - Execute next prompt from marker position, process changes, update indexes
- `reset` - Clear app state, remove temp files, reset indexes, return to start

## Files
- `app`                      - folder with app files
   - `index.html`            - default landing page for app
- `meta`                     - folder of tools to enhance prompts
   - `app_req`               - reqirements for app in development
      - `##_epic`            - file with many prompts, part and future
      - `app_index.txt`      - index of codenames used by app's code
   - `rule`                  - folder of files containing rules for cursor.ai
      - `code.txt`           - rules on code alignmentment and format
      - `codename.txt`       - rules on selecting names for identifiers in the code
      - `format.txt`         - rules on format files, structure content, use markers
      - `index.txt`          - rules on the format of codename indexes
      - `prompt.txt`         - rules on how the cursor.ai should handel prompts
   - `meta_index.txt`        - index of codenames in the meta files

//////////////////////////////////////////////////////////////////////////////// 