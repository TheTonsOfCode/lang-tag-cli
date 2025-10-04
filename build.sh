#!/bin/bash

set -e

# Make sure we're in the project root directory
if [ ! -f "package.json" ]; then
  echo "Error: Run this script from the project root directory."
  exit 1
fi

# First build the project
echo "Building project..."
rm -rf dist/
tsc
vite build
chmod 777 dist/cli/index.js

# Check if dist exists
if [ ! -d "dist" ]; then
  echo "Error: The dist directory was not created. Check the build process."
  exit 1
fi

# Copy important files to dist
echo "Copying files to dist..."
[ -f "README.md" ] && cp README.md dist/
[ -f "LICENSE" ] && cp LICENSE dist/
# Copy mustache templates for init-tag command
mkdir -p dist/cli/template
cp src/cli/core/init-tag/template/* dist/cli/template/ 2>/dev/null || true
# Exclude docs. README links points to github
#cp -r docs dist/docs/

# Create new package.json in dist
echo "Creating package.json in dist..."
node -e "
const fs = require('fs');
const pkg = require('./package.json');

// Remove fields not needed in the published package
delete pkg.scripts;
delete pkg.devDependencies;
delete pkg.files;
delete pkg.private;

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));
"

echo "Build completed!"