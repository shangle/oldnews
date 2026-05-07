const fs = require('fs-extra');
const path = require('path');

async function preparePrompt() {
    const systemPromptPath = path.join(__dirname, 'SYSTEM_PROMPT.txt');
    const masterPath = path.join(__dirname, '../data/master.json');
    
    let systemPrompt = await fs.readFile(systemPromptPath, 'utf8');
    
    let dictionary = [];
    if (await fs.pathExists(masterPath)) {
        const master = await fs.readJson(masterPath);
        // Build minified dictionary
        if (master.People) {
            master.People.forEach(p => {
                dictionary.push({ id: p.id, type: 'person', name: `${p.first_name} ${p.last_name}` });
            });
        }
        // ... add orgs and locs if needed
    }

    const finalPrompt = systemPrompt.replace('{{INJECT_DICTIONARY_HERE}}', JSON.stringify(dictionary));
    process.stdout.write(finalPrompt);
}

preparePrompt();
