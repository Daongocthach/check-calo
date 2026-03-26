#!/usr/bin/env bash
# PreToolUse hook: blocks git commit/push --no-verify
# Runs on Bash tool calls. Exit 2 = block, Exit 0 = allow.

set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE 'git\s+(commit|push)\s+.*--no-verify'; then
  echo "BLOCKED: --no-verify is forbidden. Pre-commit hooks exist to catch errors."
  echo ""
  echo "If the commit fails due to lint/type errors, fix them instead of skipping hooks."
  echo "Run 'npm run validate' to see what needs fixing."
  exit 2
fi

exit 0
