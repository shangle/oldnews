const fs = require('fs-extra');
const path = require('path');

async function fixPaths() {
    const masterPath = path.join(__dirname, '../data/master.json');
    if (!await fs.pathExists(masterPath)) return;

    const master = await fs.readJson(masterPath);

    // 1. Fix People photo_url
    if (master.People) {
        master.People.forEach(p => {
            if (p.photo_url) {
                p.photo_url = p.photo_url.replace(/^\/?assets/, '/oldnews/assets');
                // Handle cases where it might already have /oldnews/
                if (!p.photo_url.startsWith('/oldnews/')) {
                    p.photo_url = '/oldnews' + (p.photo_url.startsWith('/') ? '' : '/') + p.photo_url;
                }
                // De-duplicate if /oldnews/oldnews/
                p.photo_url = p.photo_url.replace(/\/oldnews\/oldnews\//, '/oldnews/');
            }
        });
    }

    // 2. Fix Feed imageUrl and sourcePdf
    if (master.Feed) {
        master.Feed.forEach(item => {
            if (item.imageUrl) {
                item.imageUrl = item.imageUrl.replace(/^\/?assets/, '/oldnews/assets');
                if (!item.imageUrl.startsWith('/oldnews/')) {
                    item.imageUrl = '/oldnews' + (item.imageUrl.startsWith('/') ? '' : '/') + item.imageUrl;
                }
                item.imageUrl = item.imageUrl.replace(/\/oldnews\/oldnews\//, '/oldnews/');
            }
            
            // Fix sourcePdf - convert local temp paths to absolute spartahistory.org URLs
            if (item.sourcePdf && item.sourcePdf.startsWith('temp/')) {
                const filename = item.sourcePdf.replace('temp/', '');
                // Note: This logic assumes 1977 January as the default for current errors. 
                // A better fix is in the processor, but this fixes existing data.
                item.sourcePdf = `https://spartahistory.org/newspaper_splits/North%20Kent%20Leader/1977/01_1977/${filename}`;
            }
        });
    }

    await fs.writeJson(masterPath, master, { spaces: 2 });
    console.log("Existing data paths have been corrected.");
}

fixPaths();
