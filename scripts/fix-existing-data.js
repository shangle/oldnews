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
            if (item.sourcePdf) {
                // If it's a local path or a wrongly formatted absolute path
                let filename = item.sourcePdf.split('/').pop();
                // Strip out the "-1.jpg" or other temp artifacts that might have been appended
                filename = filename.replace(/-[0-9]+\.jpg$/, '.pdf').replace(/\.json$/, '.pdf');
                
                // Ensure it ends in .pdf and has no double extensions
                if (!filename.endsWith('.pdf')) {
                    filename = filename.split('.')[0] + '.pdf';
                }

                item.sourcePdf = `https://spartahistory.org/newspaper_splits/North%20Kent%20Leader/1977/01_1977/${filename}`;
            }
        });
    }

    await fs.writeJson(masterPath, master, { spaces: 2 });
    console.log("Existing data paths have been corrected.");
}

fixPaths();
