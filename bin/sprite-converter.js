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
        for (const file of requiredCollections[spritesType]) {
            const fullPath   = path.resolve(assetsDir, file);
            const outputPath = path.resolve(outputDir, spritesType);

            spritesCollections[spritesType] = spritesCollections[spritesType].concat(
                await split({ filename: fullPath, outputDir: outputPath, silent: true, createOwnDirectory: false })
            );
        }
    }

    return spritesCollections;
})();