#!/bin/bash

# Exit on error
set -e

if [ -z "$1" ]; then
    echo "Usage: ./run-pipeline.sh <PDF_URL>"
    exit 1
fi

URL=$1
FILENAME=$(basename "$URL")
BASE_NAME="${FILENAME%.*}"

echo "Step 1: Downloading $FILENAME..."
curl -s "$URL" -o "temp/$FILENAME"

echo "Step 2: Converting PDF to image..."
if command -v pdftoppm >/dev/null 2>&1; then
    pdftoppm -jpeg -r 300 "temp/$FILENAME" "temp/$BASE_NAME"
    IMAGE_PATH="temp/$BASE_NAME-1.jpg"
else
    echo "Error: pdftoppm not found. Please install poppler-utils."
    exit 1
fi

echo "Step 3: Preparing prompt with known entities..."
PROMPT=$(node scripts/prompt-preparer.js)

echo "Step 4: Calling Gemini AI for extraction..."
# Headless mode with @ syntax for vision
# Use explicit redirection to avoid consuming loop stdin
if ! gemini -p "${PROMPT} @${IMAGE_PATH}" --output-format text < /dev/null > "temp/${BASE_NAME}.json"; then
    echo "Error: Gemini CLI failed for ${FILENAME}."
    exit 1
fi

echo "Step 5: Processing AI output and merging into database..."
node scripts/processor.js "temp/${BASE_NAME}.json" "${IMAGE_PATH}" "${URL}"

echo "Pipeline complete for $FILENAME."
