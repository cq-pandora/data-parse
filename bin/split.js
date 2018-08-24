const fs       = require('fs');
const parse    = require('./parse');
const path     = require('path');
const exec     = require('child_process').exec;
const Jimp     = require('jimp');
const tmp      = require('tmp');
const mkdirs   = require('node-mkdirs');
const _        = require('lodash');

function splitImageAndText(files) {
    let images = {};
    let text = null;

    for (let file of files) {
        if (!file || file.match(/^ *$/) !== null)
            continue;

        const [filePath, id] = file.split('"');
        
        if (filePath.endsWith('png')) {
            images[id] = filePath;
            continue;
        }

        text = filePath;
    }

    return {
        images: images,
        text: text,
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

function split(outputDir, createOwnDirectory, file, sourceImages) {
    return new Promise(async (resolve, reject) => {
        try {
            let spritesOutputDir = outputDir;

            if (createOwnDirectory)
                spritesOutputDir = path.join(spritesOutputDir, file.spriteCollectionName);

            mkdirs(spritesOutputDir);

            let images = [];

            for (const spriteRaw of file.spriteDefinitions.Array) {
                const sprite = spriteRaw.data;
                const image = sourceImages[sprite.material.m_PathID];

                if (!image) {
                    console.log(`Unable to find ${sprite.material.m_PathID}`);
                    continue;
                }

                const { width, height } = image.bitmap;

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
                
                sprImg.scale(2, Jimp.RESIZE_NEAREST_NEIGHBOR).write(fullFileName);

                images.push(fullFileName);
            }

            resolve(images);
        } catch (e) {
            return reject(e);
        }
    });
}

const silence = (e) => {console.log(e)};

module.exports = function(options) {
    options = _.defaults(options, {
        createOwnDirectory: true, 
        executablePath: path.join(__dirname, 'AssetStudio', 'AssetStudio.exe'),
        silent: false
    });

    const tmpAssetsOutputPath = tmp.dirSync({ unsafeCleanup: true });
    const assetsOutputPath = tmpAssetsOutputPath.name;

    return new Promise((resolve, reject) => {
        run(options.filename, assetsOutputPath, options.executablePath)
        .then(splitImageAndText)
        .then(async ({images, text}) => {
            let imgs = {};

            for (const entry of _.entries(images)) {
                imgs[entry[0]] = (await Jimp.read(entry[1])).flip(false, true);
            }

            return {
                file: parse(await readFile(text, {encoding: 'utf8'})),
                images: imgs,
            }
        })
        .then(r => split(options.outputDir, options.createOwnDirectory, r.file, r.images))
        .then(r => { tmpAssetsOutputPath.removeCallback(); return r; })
        .then(resolve)
        .catch(e => options.silent ? silence(e) : reject(e));
    });
}