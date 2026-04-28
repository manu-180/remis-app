#!/usr/bin/env bash
set -euo pipefail

# Block direct pushes to main.
current_branch=$(git symbolic-ref HEAD 2>/dev/null | sed 's|refs/heads/||')

if [ "$current_branch" = "main" ]; then
  echo "ERROR: Direct push to main is not allowed. Open a PR instead." >&2
  exit 1
fi

echo "Running lint and typecheck before push..."
pnpm lint && pnpm typecheck
echo "All checks passed."
