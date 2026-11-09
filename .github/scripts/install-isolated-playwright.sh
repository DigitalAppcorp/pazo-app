#!/usr/bin/env bash
set -euo pipefail

# Install the browser-test tool in an independent dependency tree.
# npm install --package-lock=false inside PAZO re-resolves unrelated ranges
# and can select a newer, unavailable Tailwind oxide package.
repo_dir="$(pwd)"
install_dir="${RUNNER_TEMP:?RUNNER_TEMP must be set}/pazo-playwright-1.56.1"
mkdir -p "$install_dir" "$repo_dir/node_modules/.bin"
npm install --prefix "$install_dir" --no-save --package-lock=false --ignore-scripts --no-audit --no-fund playwright@1.56.1

for package in playwright playwright-core; do
  target="$repo_dir/node_modules/$package"
  if [[ -e "$target" || -L "$target" ]]; then
    echo "Refusing to overwrite existing $target" >&2
    exit 1
  fi
  ln -s "$install_dir/node_modules/$package" "$target"
done

cli="$repo_dir/node_modules/.bin/playwright"
if [[ -e "$cli" || -L "$cli" ]]; then
  echo "Refusing to overwrite existing $cli" >&2
  exit 1
fi
ln -s "$install_dir/node_modules/.bin/playwright" "$cli"

node -e "import('playwright').then(() => console.log('Isolated Playwright import OK'))"
