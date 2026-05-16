const fs = require('fs-extra');
const path = require('path');

async function validate() {
    const feedPath = path.join(__dirname, '../data/generated/feed_items.generated.json');
    if (!await fs.pathExists(feedPath)) {
        console.error("Validation failed: feed_items.generated.json not found.");
        process.exit(1);
    }

    const feed = await fs.readJson(feedPath);
    let errors = 0;

    feed.forEach((item, index) => {
        const missing = [];
        if (!item.id) missing.push('id');
        if (!item.sourcePdf) missing.push('sourcePdf');
        if (!item.content) missing.push('content');
        if (!item.truth_status) missing.push('truth_status');
        if (!item.derived_from_fact_ids && !item.migration_note) missing.push('derived_from_fact_ids/migration_note');

        if (missing.length > 0) {
            console.error(`❌ Item at index ${index} is missing: ${missing.join(', ')}`);
            errors++;
        }
    });

    if (errors > 0) {
        console.error(`\n🔴 Validation failed with ${errors} errors.`);
        process.exit(1);
    } else {
        console.log("✅ All data validated successfully.");
    }
}

validate();
