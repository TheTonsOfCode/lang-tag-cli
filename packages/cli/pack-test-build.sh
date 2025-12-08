#!/bin/bash

./build.sh

NAME="lang-tag-cli"
DIST_DIR="dist"
PACKAGE_JSON="$DIST_DIR/package.json"

test -f "$PACKAGE_JSON" || exit 1

node -e "
const fs = require('fs');
const pkgPath = '$PACKAGE_JSON';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.name = '$NAME';
pkg.private = true;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
"

cd "$DIST_DIR" || exit 1

TAR_FILE=$(npm pack)

NEW_NAME="$NAME.tgz"
mv "$TAR_FILE" "$NEW_NAME"

echo "Package successfully modified and renamed."
