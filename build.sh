#!/bin/bash
set -e

# HiPlot Build Script
# For simple builds, you can just run:
#   bun run build && uv build
#
# This script handles the full build including NPM package preparation.

echo "=== Cleaning build directories ==="
rm -rf hiplot/static/built/*
rm -rf npm-dist/*
mkdir -p hiplot/static/built npm-dist

echo "=== Building JavaScript bundles ==="
bun run build

echo "=== Generating TypeScript declarations (for NPM) ==="
bun run prepublish

echo "=== Building Python package ==="
uv build

echo "=== Build complete ==="
echo "NPM artifacts: npm-dist/"
echo "Python artifacts: dist/"
echo "Python bundle: hiplot/static/built/"
