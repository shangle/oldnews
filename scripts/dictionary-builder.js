const fs = require('fs-extra');
const path = require('path');

async function buildDictionary() {
    const masterPath = path.join(__dirname, '../data/master.json');
    if (!await fs.pathExists(masterPath)) {
        console.log('[]');
        return;
    }

    const master = await fs.readJson(masterPath);
    const dictionary = [];

    // People
    if (master.People) {
        master.People.forEach(p => {
            const aliases = [];
            if (p.nickname) aliases.push(p.nickname);
            if (p.maiden_name) aliases.push(p.maiden_name);
            dictionary.push({
                id: p.id,
                type: 'person',
                name: `${p.first_name} ${p.last_name}`,
                aliases: aliases
            });
        });
    }

    // Organizations
    if (master.Organizations) {
        master.Organizations.forEach(o => {
            dictionary.push({
                id: o.id,
                type: 'organization',
                name: o.name
            });
        });
    }

    // Locations
    if (master.Locations) {
        master.Locations.forEach(l => {
            dictionary.push({
                id: l.id,
                type: 'location',
                name: l.name
            });
        });
    }

    console.log(JSON.stringify(dictionary));
}

buildDictionary();
