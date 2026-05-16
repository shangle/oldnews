const fs = require('fs-extra');
const path = require('path');

async function migrate() {
    const masterPath = path.join(__dirname, '../data/master.json');
    if (!await fs.pathExists(masterPath)) {
        console.error("master.json not found!");
        return;
    }

    const master = await fs.readJson(masterPath);
    
    // Ensure directories exist
    await fs.ensureDir(path.join(__dirname, '../data/extracted'));
    await fs.ensureDir(path.join(__dirname, '../data/generated'));

    // 1. Pages (Derived from master.Sources)
    const pages = (master.Sources || []).map(s => JSON.stringify({
        id: `page_${s.Date}_${s.Source_URL.split('-').pop().replace('.pdf', '')}`,
        type: 'newspaper',
        name: s.Publication || 'North Kent Leader',
        date: s.Date,
        source_url: s.Source_URL,
        page_number: parseInt(s.Source_URL.match(/Page%20(\d+)/)?.[1] || 1)
    }));
    await fs.writeFile(path.join(__dirname, '../data/extracted/pages.jsonl'), pages.join('\n') + '\n');

    // 2. Entities (People, Orgs, Locations)
    const entities = [];
    if (master.People) master.People.forEach(p => entities.push(JSON.stringify({ ...p, entity_type: 'person' })));
    if (master.Organizations) master.Organizations.forEach(o => entities.push(JSON.stringify({ ...o, entity_type: 'organization' })));
    if (master.Locations) master.Locations.forEach(l => entities.push(JSON.stringify({ ...l, entity_type: 'location' })));
    await fs.writeFile(path.join(__dirname, '../data/extracted/entities.jsonl'), entities.join('\n') + '\n');

    // 3. Facts (Seed from Feed items for now)
    const facts = (master.Feed || []).map(f => JSON.stringify({
        id: `fact_${f.id}`,
        content: f.content,
        source_page_url: f.sourcePdf,
        extracted_from: 'initial_migration'
    }));
    await fs.writeFile(path.join(__dirname, '../data/extracted/facts.seed.jsonl'), facts.join('\n') + '\n');

    // 4. Generated UI Files (Backward Compatibility)
    const feedItems = (master.Feed || []).map(f => ({
        ...f,
        truth_status: 'ai_generated',
        migration_note: 'Migrated from master.json v1'
    }));
    await fs.writeJson(path.join(__dirname, '../data/generated/feed_items.generated.json'), feedItems, { spaces: 2 });
    await fs.writeJson(path.join(__dirname, '../data/generated/people.generated.json'), master.People || [], { spaces: 2 });

    console.log("✅ Migration complete. master.json has been split into extracted/ and generated/ layers.");
}

migrate();
