#!/usr/bin/env bash
set -euo pipefail

# Reads version from root package.json and updates pubspec.yaml for driver and passenger.
# Build number = total git commit count (auto-incremental).

VERSION=$(node -p "require('./package.json').version")
BUILD_NUMBER=$(git rev-list --count HEAD)

echo "Bumping mobile apps to $VERSION+$BUILD_NUMBER"

for app in driver passenger; do
  pubspec="apps/$app/pubspec.yaml"
  # Replace version line: version: X.Y.Z+N
  sed -i "s/^version: .*/version: $VERSION+$BUILD_NUMBER/" "$pubspec"
  echo "  ✓ $pubspec → $VERSION+$BUILD_NUMBER"
done
