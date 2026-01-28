#!/bin/bash

# PWA Icon Generator Script
# Requires: ImageMagick (brew install imagemagick)
# Usage: ./generate-icons.sh

SIZES="72 96 128 144 152 192 384 512"
SOURCE="icon.svg"
OUTPUT_DIR="."

echo "🖼️  Generating PWA icons from $SOURCE..."

for size in $SIZES; do
    output="icon-${size}x${size}.png"
    echo "  Creating $output..."
    
    # Using ImageMagick to convert SVG to PNG
    convert -background none -resize ${size}x${size} "$SOURCE" "$output" 2>/dev/null || \
    magick "$SOURCE" -resize ${size}x${size} "$output" 2>/dev/null || \
    echo "    ⚠️  Failed to create $output (Install ImageMagick: brew install imagemagick)"
done

echo ""
echo "✅ Icon generation complete!"
echo ""
echo "If icons weren't generated, install ImageMagick:"
echo "  brew install imagemagick"
echo ""
echo "Or use an online tool like:"
echo "  https://realfavicongenerator.net/"
echo "  https://www.pwabuilder.com/imageGenerator"
