#!/bin/bash

# Usage: ./batch-process.sh <BASE_URL>
# Example: ./batch-process.sh https://spartahistory.org/newspaper_splits/North%20Kent%20Leader/1977/01_1977/

BASE_URL=$1

echo "Fetching PDF list from $BASE_URL..."

# Save the list to a temporary file to avoid stdin issues with the loop
PDF_LIST=$(mktemp)
curl -s "$BASE_URL" | grep -oE "href=\"[^\"]+\.pdf\"" | sed 's/href="//;s/"//' > "$PDF_LIST"

while read -r ENCODED_PDF; do
    if [ -z "$ENCODED_PDF" ]; then continue; fi
    
    FULL_URL="${BASE_URL}${ENCODED_PDF}"
    
    # Check if URL is already in master.json
    if [ -f "data/master.json" ]; then
        if grep -q "$FULL_URL" "data/master.json"; then
            echo "Skipping $ENCODED_PDF (already processed)."
            continue
        fi
    fi

    echo "-----------------------------------"
    echo "Processing $ENCODED_PDF..."
    # Redirect stdin from /dev/null to ensure the loop isn't interrupted
    if ./run-pipeline.sh "$FULL_URL" < /dev/null; then
        echo "Successfully processed $ENCODED_PDF."
        # Optional: Sleep to avoid hitting rate limits too fast
        sleep 5
    else
        echo "Failed to process $ENCODED_PDF. Moving to next file."
    fi
done < "$PDF_LIST"

rm "$PDF_LIST"
