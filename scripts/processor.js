const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

async function processOutput(aiJsonPath, imagePath, sourceUrl) {
    let rawData = "";
    try {
        rawData = await fs.readFile(aiJsonPath, 'utf8');
    } catch (e) {
        console.error(`Error reading AI output file: ${aiJsonPath}`);
        process.exit(1);
    }
    
    const cleanedData = rawData.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    if (!cleanedData) {
        console.error("CRITICAL: AI output is empty.");
        process.exit(1);
    }

    let aiData;
    try {
        aiData = JSON.parse(cleanedData);
    } catch (e) {
        console.error("CRITICAL: Failed to parse AI JSON.");
        await fs.writeFile('temp/error_log.txt', rawData);
        process.exit(1);
    }

    // Paths
    const dataDir = path.join(__dirname, '../data');
    const extractedDir = path.join(dataDir, 'extracted');
    const generatedDir = path.join(dataDir, 'generated');
    const assetsDir = path.join(__dirname, '../assets');

    // 1. Source Anchoring & Page Indexing
    const metadata = aiData.Metadata || {};
    metadata.Source_URL = sourceUrl;
    metadata.Source_Type = metadata.Source_Type || "newspaper";
    const pageId = `page_${metadata.Date}_${sourceUrl.split('-').pop().replace('.pdf', '')}`;
    
    await fs.appendFile(path.join(extractedDir, 'pages.jsonl'), JSON.stringify({ id: pageId, ...metadata }) + '\n');

    // 2. Image Processing (using Sharp)
    const imgMetadata = await sharp(imagePath).metadata();
    const { width, height } = imgMetadata;

    if (aiData.Entities) {
        for (const entity of aiData.Entities) {
            if (entity.has_photo && entity.photo_coordinates) {
                const [ymin, xmin, ymax, xmax] = entity.photo_coordinates;
                const cropY = Math.round((ymin / 1000) * height);
                const cropX = Math.round((xmin / 1000) * width);
                const cropW = Math.round(((xmax - xmin) / 1000) * width);
                const cropH = Math.round(((ymax - ymin) / 1000) * height);

                const subDir = entity.type === 'person' ? 'people' : 'objects';
                const fileName = `${entity.id}.webp`;
                const destPath = path.join(assetsDir, subDir, fileName);

                console.log(`📸 Extracting ${entity.type} image: ${entity.id}`);
                await sharp(imagePath)
                    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
                    .webp({ quality: 80 })
                    .toFile(destPath);
                
                entity.photo_url = `/assets/${subDir}/${fileName}`;
            }
            // Append to Extracted Truth
            await fs.appendFile(path.join(extractedDir, 'entities.jsonl'), JSON.stringify({ ...entity, page_id: pageId }) + '\n');
        }
    }

    // 3. Fact Extraction
    if (aiData.Facts) {
        for (const fact of aiData.Facts) {
            await fs.appendFile(path.join(extractedDir, 'facts.jsonl'), JSON.stringify({ ...fact, page_id: pageId }) + '\n');
        }
    }

    // 4. Feed Items (Derived for UI)
    if (aiData.Feed) {
        const feedPath = path.join(generatedDir, 'feed_items.generated.json');
        let currentFeed = [];
        if (await fs.pathExists(feedPath)) currentFeed = await fs.readJson(feedPath);
        
        const newItems = aiData.Feed.map(item => ({
            ...item,
            sourcePdf: sourceUrl,
            page_id: pageId
        }));

        currentFeed.push(...newItems);
        await fs.writeJson(feedPath, currentFeed, { spaces: 2 });
    }

    // 5. Update Legacy master.json (Backward Compatibility)
    // We will keep updating this for now so the current viewer doesn't break
    const masterPath = path.join(dataDir, 'master.json');
    if (await fs.pathExists(masterPath)) {
        const master = await fs.readJson(masterPath);
        master.Sources.push(metadata);
        if (aiData.Entities) {
            aiData.Entities.forEach(e => {
                if (e.type === 'person') {
                    const idx = master.People.findIndex(p => p.id === e.id);
                    if (idx === -1) master.People.push(e);
                    else master.People[idx] = { ...master.People[idx], ...e };
                }
            });
        }
        if (aiData.Feed) master.Feed.push(...aiData.Feed);
        await fs.writeJson(masterPath, master, { spaces: 2 });
    }

    console.log(`✅ Pipeline processed ${pageId}.`);
}

const args = process.argv.slice(2);
processOutput(args[0], args[1], args[2]);
