#!/bin/bash

set -e

./build.sh

# Navigate to dist directory and publish
echo "Moving to dist directory and publishing..."
cd dist && npm publish

echo "Publication completed!"