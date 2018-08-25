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

function createImage(width, height) {
    return new Promise((resolve, reject) => {
        new Jimp(width, height, 0x0, function (err, image) {
            if (err) return reject(err);
            resolve(image);
        });
    });
}

const parseCommaFloat = (i) => parseFloat(i.replace(',', '.'));

const checkOrder = (a, b, c, d) => {
    const uvs = [a, b, c, d];
    let hx = -1, hy = -1, lx = 9999999999, ly = 9999999999;

    for (let j = 0; j < uvs.length; j++) {
        const uv = uvs[j];
        const x = uv.x;
        const y = uv.y;

        hx = Math.max(hx, x); lx = Math.min(lx, x);
        hy = Math.max(hy, y); ly = Math.min(ly, y);
    }

    return a.x == lx && a.y == ly &&
           b.x == hx && b.y == ly &&
           c.x == lx && c.y == hy &&
           d.x == hx && d.y == hy;
};

const diagonalFlop = img => img.flip(false, true).rotate(90, false);
const diagonalFlip = img => img.flip(true, false).rotate(-90, false);

function getDecimal(num) {
  var str = "" + num;
  var zeroPos = str.indexOf(".");
  if (zeroPos == -1) return 0;
  str = str.slice(zeroPos);
  return +str;
}

function split(outputDir, createOwnDirectory, file, sourceImages) {
    return new Promise(async (resolve, reject) => {
        try {
            let spritesOutputDir = outputDir;

            if (createOwnDirectory)
                spritesOutputDir = path.join(spritesOutputDir, file.spriteCollectionName);

            mkdirs(spritesOutputDir);

            let images = [];

            const font = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK);

            for (const spriteRaw of file.spriteDefinitions.Array) {
                const sprite = spriteRaw.data;
                const image = sourceImages[sprite.material.m_PathID];

                if (!image) {
                    console.log(`Unable to find ${sprite.material.m_PathID}`);
                    continue;
                }

                const { width, height } = image.bitmap;

                const uvs = sprite.uvs.Array.map(uv => ({ 
                        x: parseCommaFloat(uv.data.x),
                        y: parseCommaFloat(uv.data.y),
                }));

                const pos = sprite.positions.Array.map(p => ({ 
                        x: parseCommaFloat(p.data.x),
                        y: parseCommaFloat(p.data.y),
                }));

                const idxs = sprite.indices.Array.map(i => parseInt(i.data));

                const zoomX = parseCommaFloat(sprite.texelSize.x),
                      zoomY = parseCommaFloat(sprite.texelSize.y);

                const shiftX = Math.abs(_.minBy(pos, p => p.x).x);
                const shiftY = Math.abs(_.minBy(pos, p => p.y).y);

                const totalWidth = Math.abs(parseCommaFloat(sprite.untrimmedBoundsData.Array[0].data.x)) +
                    parseCommaFloat(sprite.untrimmedBoundsData.Array[1].data.x);
                const totalHeight = Math.abs(parseCommaFloat(sprite.untrimmedBoundsData.Array[0].data.y)) +
                    parseCommaFloat(sprite.untrimmedBoundsData.Array[1].data.y);

                let spriteCanvas = await createImage(totalWidth, totalHeight);

                for (let i = 0; i < uvs.length / 4; i++) {
                    let hx = -9999999999, hy = -9999999999, lx = 9999999999, ly = 9999999999;
                    let posX = 9999999999, posY = -9999999999;

                    for (let j = i * 4; j < (i + 1) * 4; j++) {
                        const uv = uvs[j], p = pos[j];
                        const x = Math.round(uv.x * width);
                        const y = Math.round(uv.y * height);

                        hx = Math.max(hx, x); lx = Math.min(lx, x);
                        hy = Math.max(hy, y); ly = Math.min(ly, y);

                        posX = Math.round(Math.min(p.x, posX));
                        posY = Math.round(Math.max(p.y, posY));
                    }

                    const spriteWidth = hx - lx;
                    const spriteHeight = hy - ly;

                    let sprImg = await image.clone().crop(
                        lx,
                        height - hy,
                        spriteWidth,
                        spriteHeight,
                    );

                    if (parseInt(sprite.flipped)) {
                        sprImg = diagonalFlop(sprImg);
                    }

                    if (!checkOrder(uvs[i * 4], uvs[i * 4 + 1], uvs[i * 4 + 2], uvs[i * 4 + 3])){
                        sprImg = diagonalFlip(sprImg);
                    }

                    const zoomedWidth = sprImg.bitmap.width * zoomX;
                    const zoomedHeight = sprImg.bitmap.height * zoomY;

                    spriteCanvas = spriteCanvas.composite(
                        sprImg.resize(
                            zoomedWidth, 
                            zoomedHeight, 
                            Jimp.RESIZE_NEAREST_NEIGHBOR
                        ),
                        posX + shiftX, totalHeight - (posY + shiftY)
                    );

                    if (uvs.length === 4) {
                        spriteCanvas = spriteCanvas.crop(0, 0, zoomedWidth, zoomedHeight);
                    }
                }

                const fullFileName = path.join(spritesOutputDir, sprite.name + '.png');    

                spriteCanvas.write(fullFileName);

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