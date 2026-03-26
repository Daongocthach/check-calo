#!/usr/bin/env bash
# PreToolUse hook: blocks eslint-disable, @ts-ignore, @ts-nocheck, bare @ts-expect-error
# Runs on Write and Edit tool calls. Exit 2 = block, Exit 0 = allow.
# Only checks .ts/.tsx/.js/.jsx files — allows documentation files (.md, etc.) to reference these patterns.

set -euo pipefail

INPUT=$(cat)

# Get the file path to determine if this is a code file
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check code files — skip markdown, json, config, shell scripts, etc.
if [[ -n "$FILE_PATH" && ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Extract the text being written/edited
FILE_TEXT=$(echo "$INPUT" | jq -r '.tool_input.file_text // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')

CONTENT="${FILE_TEXT}${NEW_STRING}"

if [ -z "$CONTENT" ]; then
  exit 0
fi

# Check for forbidden suppression patterns (actual comment usage in code)
VIOLATIONS=""

if echo "$CONTENT" | grep -qE '//\s*eslint-disable|/\*\s*eslint-disable'; then
  VIOLATIONS="${VIOLATIONS}\n- eslint-disable comment found. Fix the code instead of suppressing the rule."
fi

if echo "$CONTENT" | grep -qE '//\s*@ts-ignore|/\*.*@ts-ignore'; then
  VIOLATIONS="${VIOLATIONS}\n- @ts-ignore found. Use proper types, type narrowing, or @ts-expect-error with a description."
fi

if echo "$CONTENT" | grep -qE '//\s*@ts-nocheck|/\*.*@ts-nocheck'; then
  VIOLATIONS="${VIOLATIONS}\n- @ts-nocheck found. Every file must be type-checked. Fix the type errors instead."
fi

# Bare @ts-expect-error (without a description after it)
if echo "$CONTENT" | grep -qE '//\s*@ts-expect-error\s*$|/\*\s*@ts-expect-error\s*\*/'; then
  VIOLATIONS="${VIOLATIONS}\n- Bare @ts-expect-error found. You must include a description: // @ts-expect-error -- reason why this is needed"
fi

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: Suppression comments are forbidden in this project."
  echo -e "$VIOLATIONS"
  echo ""
  echo "Alternatives:"
  echo "  - Fix the underlying type/lint error"
  echo "  - Use proper type narrowing (unknown + type guards)"
  echo "  - Define correct interfaces/types"
  echo "  - Ask the user if you're stuck"
  exit 2
fi

exit 0
