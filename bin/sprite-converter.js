const split  = require('./split');
const glob   = require('glob');
const path   = require('path');
const mkdirs = require('node-mkdirs');
const config = require('./config');

(async function() {
    let spritesCollections = {};

    const requiredCollections = config.requiredCollections;
    const assetsDir = path.resolve(config.cachePath, 'files', 'Assets');
    const outputDir = config.spritesOutputDir;

    for (const spritesType in requiredCollections) {
        spritesCollections[spritesType] = [];
    
        for (const pattern of requiredCollections[spritesType]) {
            const files = glob.sync(pattern, {cwd: assetsDir});
            const outputPath = path.resolve(outputDir, spritesType);
    
            for (const file of files) {
                if (file.endsWith('_cn')) continue;

                const fullPath = path.resolve(assetsDir, file);
                try {
                    spritesCollections[spritesType] = spritesCollections[spritesType].concat(
                        await split({ filename: fullPath, outputDir: outputPath, silent: true, createOwnDirectory: false })
                    );
                } catch (e) {
                    console.log('Unable to parse ' + fullPath, e);
                }
            }
        }
    }

    console.log('End');

    return spritesCollections;
})();