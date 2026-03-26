#!/usr/bin/env bash
# PostToolUse hook: runs ESLint --fix on edited ts/tsx/js/jsx files
# Always exits 0 (informational, non-blocking).

set -uo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only lint TypeScript/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Only lint if file exists
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Run ESLint --fix (informational only)
npx eslint --fix "$FILE_PATH" 2>&1 || true

exit 0
