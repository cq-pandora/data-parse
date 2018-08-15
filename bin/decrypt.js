const path     = require('path');
const config   = require(path.join(process.cwd(), './config.json'));
const Blowfish = require('egoroof-blowfish');
const {ungzip} = require('node-gzip');
const fs       = require('fs');
const mkdirs   = require('node-mkdirs');

const bf = new Blowfish(Buffer.from(config.key, 'hex'), Blowfish.MODE.CBC);
bf.setIv(Buffer.from(config.key2, 'hex'));

const dataDir = path.join(process.cwd(), 'Datas');
const outputDir = path.join(process.cwd(), 'decrypted');

mkdirs(outputDir);

fs.readdirSync(dataDir).forEach(async file => {
	if (!file.endsWith('.bf'))
		return;
	
	const absoluteFile = path.join(dataDir, file);

	try {
		const json = await ungzip(bf.decode(fs.readFileSync(absoluteFile), Blowfish.TYPE.UINT8_ARRAY));

		const outfile = path.join(outputDir, path.basename(file, path.extname(file)) + '.json');

		fs.writeFileSync(outfile, JSON.stringify(JSON.parse(json.toString()), null, 4), 'utf8');
	} catch (e) {
		console.log('Failed decrypting ' + absoluteFile);
	} 
});