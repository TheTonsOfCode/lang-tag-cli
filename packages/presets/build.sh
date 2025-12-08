#!/bin/bash

set -e

if [ ! -f "package.json" ]; then
  echo "Error: Run this script from the package root."
  exit 1
fi

echo "Building @lang-tag/presets..."
rm -rf dist/
tsc -b

if [ ! -d "dist" ]; then
  echo "Error: The dist directory was not created. Check the build process."
  exit 1
fi

echo "Copying files to dist..."
[ -f "README.md" ] && cp README.md dist/
[ -f "LICENSE" ] && cp LICENSE dist/

echo "Creating package.json in dist..."
node -e "
const fs = require('fs');
const pkg = require('./package.json');

delete pkg.scripts;
delete pkg.devDependencies;
delete pkg.files;
if (pkg.private) delete pkg.private;

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));
"

echo "Build completed!"

