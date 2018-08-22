const fs       = require('fs');
const parse    = require('./parse');
const path     = require('path');
const exec     = require('child_process').exec;
const Jimp     = require('jimp');
const tmp      = require('tmp');
const mkdirs   = require('node-mkdirs');
const defaults = require('lodash').defaults;

function splitImageAndText(files) {
    return {
        imagePath: files.filter(f => !f.endsWith('txt'))[1] || files.filter(f => !f.endsWith('txt'))[0],
        textPath: files.filter(f => f.endsWith('txt'))[0]
    };
}

function run(inputFilename, outputDir, executablePath) {
    return new Promise((resolve, reject) => {
        exec(`"${executablePath}" -c -f "${inputFilename}" -e "${outputDir}"`, function(err, out) {
            if (err) return reject(err);

            resolve(out.replace(/\r/g, '').split('\n'));
        });
    });
}

function readFile(filename, options) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, options, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
}

function split(outputDir, createOwnDirectory, file, image) {
    return new Promise(async (resolve, reject) => {
        try {
            const { width, height } = image.bitmap;
            
            let spritesOutputDir = outputDir;

            if (createOwnDirectory)
                spritesOutputDir = path.join(spritesOutputDir, file.spriteCollectionName);

            mkdirs(spritesOutputDir);

            let images = [];

            for (const spriteRaw of file.spriteDefinitions.Array) {
                const sprite = spriteRaw.data;
                let hx = -1, hy = -1, lx = 9999999999, ly = 9999999999;

                for (const uv of sprite.uvs.Array) {
                    const x = Math.round(parseFloat(uv.data.x.replace(',', '.')) * width);
                    const y = Math.round(parseFloat(uv.data.y.replace(',', '.')) * height);

                    hx = Math.max(hx, x); lx = Math.min(lx, x);
                    hy = Math.max(hy, y); ly = Math.min(ly, y);   
                }

                const spriteWidth = hy - ly;
                const spriteHeight = hx - lx;

                let sprImg = await image.clone().crop(
                    lx,
                    height - hy,
                    spriteHeight,
                    spriteWidth,
                );

                if (parseInt(sprite.flipped)) {
                    sprImg = sprImg.flip(false, true).rotate(90);
                }

                const fullFileName = path.join(spritesOutputDir, sprite.name + '.png');
                
                sprImg.write(fullFileName);

                images.push(fullFileName);
            }

            resolve(images);
        } catch (e) {
            return reject(e);
        }
    });
}

const silence = () => {};

module.exports = function(options) {
    options = defaults(options, {
        createOwnDirectory: true, 
        executablePath: path.join(__dirname, 'AssetStudio', 'AssetStudio.exe'),
        silent: false
    });

    const tmpAssetsOutputPath = tmp.dirSync({ unsafeCleanup: true });
    const assetsOutputPath = tmpAssetsOutputPath.name;

    return new Promise((resolve, reject) => {
        run(options.filename, assetsOutputPath, options.executablePath)
        .then(splitImageAndText)
        .then(async ({imagePath, textPath}) => {
            return {
                file: parse(await readFile(textPath, {encoding: 'utf8'})),
                image: (await Jimp.read(imagePath)).flip(false, true)
            }
        })
        .then(r => split(options.outputDir, options.createOwnDirectory, r.file, r.image))
        .then(r => { tmpAssetsOutputPath.removeCallback(); return r; })
        .then(resolve)
        .catch(e => options.silent ? silence(e) : reject(e));
    });
}