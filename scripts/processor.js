const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function processOutput(aiJsonPath, imagePath, sourceUrl) {
    let rawData = "";
    try {
        rawData = await fs.readFile(aiJsonPath, 'utf8');
    } catch (e) {
        console.error(`Error reading AI output file: ${aiJsonPath}`);
        process.exit(1);
    }
    
    // Strip markdown code blocks if present
    const cleanedData = rawData.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    if (!cleanedData) {
        console.error("CRITICAL: AI output is empty. Gemini may have failed to generate content or was rate-limited.");
        process.exit(1);
    }

    let aiData;
    try {
        aiData = JSON.parse(cleanedData);
    } catch (e) {
        console.error("CRITICAL: Failed to parse AI JSON. Raw output saved to temp/error_log.txt for inspection.");
        await fs.writeFile('temp/error_log.txt', rawData);
        process.exit(1);
    }

    const masterPath = path.join(__dirname, '../data/master.json');
    
    let master = {
        Feed: [],
        People: [],
        Organizations: [],
        Locations: [],
        Sources: []
    };

    if (await fs.pathExists(masterPath)) {
        master = await fs.readJson(masterPath);
        if (!master.Feed) master.Feed = [];
    }

    // Inject Source URL into Metadata
    if (!aiData.Metadata) aiData.Metadata = {};
    aiData.Metadata.Source_URL = sourceUrl;
    master.Sources.push(aiData.Metadata);

    // Detect available ImageMagick command
    let imCommand = 'convert';
    let idCommand = 'identify';
    try {
        execSync('magick -version', { stdio: 'ignore' });
        imCommand = 'magick';
        idCommand = 'magick identify';
    } catch (e) {
        // Fallback to IM6
    }

    // Get image dimensions
    let width, height;
    try {
        const info = execSync(`${idCommand} -format "%w %h" "${imagePath}"`).toString().trim().split(' ');
        width = parseInt(info[0]);
        height = parseInt(info[1]);
    } catch (e) {
        console.error("Warning: Could not get image dimensions.");
    }

    const photoMap = {};

    // 1. Process People & Crop Photos
    if (aiData.People) {
        for (const person of aiData.People) {
            if (person.has_photo && person.photo_coordinates && width && height) {
                const [ymin, xmin, ymax, xmax] = person.photo_coordinates;
                const cropY = Math.round((ymin / 1000) * height);
                const cropX = Math.round((xmin / 1000) * width);
                const cropW = Math.round(((xmax - xmin) / 1000) * width);
                const cropH = Math.round(((ymax - ymin) / 1000) * height);

                const photoPath = path.join(__dirname, `../assets/people/${person.id}.jpg`);
                try {
                    console.log(`Cropping photo for ${person.id}...`);
                    execSync(`${imCommand} "${imagePath}" -crop ${cropW}x${cropH}+${cropX}+${cropY} -quality 85 "${photoPath}"`);
                    photoMap[person.id] = `/oldnews/assets/people/${person.id}.jpg`;
                } catch (e) {
                    console.error(`Crop failed for ${person.id}: ${e.message}`);
                }
            }

            // Sync person to master
            const existingIdx = master.People.findIndex(p => p.id === person.id);
            if (existingIdx === -1) {
                master.People.push(person);
            } else if (photoMap[person.id]) {
                master.People[existingIdx].has_photo = true;
                master.People[existingIdx].photo_url = photoMap[person.id];
            }
        }
    }

    // 2. Process Feed & Link Photos
    if (aiData.Feed) {
        aiData.Feed.forEach(item => {
            item.sourcePdf = sourceUrl;
            if (item.type === 'post' && item.person_id) {
                const person = master.People.find(p => p.id === item.person_id);
                if (photoMap[item.person_id]) {
                    item.imageUrl = photoMap[item.person_id];
                } else if (person && person.photo_url) {
                    item.imageUrl = person.photo_url;
                }
            }
            master.Feed.push(item);
        });
    }

    await fs.writeJson(masterPath, master, { spaces: 2 });
    console.log(`Master database updated with ${aiData.Feed ? aiData.Feed.length : 0} items.`);
}

const args = process.argv.slice(2);
processOutput(args[0], args[1], args[2]);
