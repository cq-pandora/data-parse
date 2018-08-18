const split  = require('./split');
const glob   = require('glob');
const path   = require('path');
const mkdirs = require('node-mkdirs');

const config = require(path.join(process.cwd(), 'config.json'));

(async function() {
    let spritesCollections = {};

    const requiredCollections = config.requiredCollections;
    const assetsDir = path.join(config.cachePath, 'files', 'Assets');
    const outputDir = config.outputDir;

    for (const spritesType in requiredCollections) {
        spritesCollections[spritesType] = [];
        for (const file of requiredCollections[spritesType]) {
            const fullPath   = path.join(assetsDir, file);
            const outputPath = path.join(outputDir, spritesType);

            spritesCollections[spritesType] = spritesCollections[spritesType].concat(
                await split({ filename: fullPath, outputDir: outputPath, silent: true, createOwnDirectory: false })
            );
        }
    }

    return spritesCollections;
})();