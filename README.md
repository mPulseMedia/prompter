# Prompter

Build web apps through sequential prompts.

## Commands
- `run` - Execute next prompt
- `reset` - Reset app state

## Structure
- `prompter/` - Core prompter files
  - `rule/` - Cursor behavior and naming rules
  - `codename/` - Approved naming patterns and terms
- `prompt/` - Sequential prompts for cursor
- `app/` - Application code

## Naming
- Follow `prompter/codename/` patterns exactly
- Use snake_case, lowercase
- Root terms (cmd_, rule_, prompt_)
- Present tense verbs, singular nouns
- Keep terms under 15 chars

## Usage
1. Cursor processes `prompt/` files
2. Execute prompts in sequence
3. Marker shows current position
4. Use `run` for next prompt
5. Use `reset` to start over

//////////////////////////////////////////////////////////////////////////////// 