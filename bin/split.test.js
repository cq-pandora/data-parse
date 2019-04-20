const path     = require('path');
const glob     = require('glob');
const exec     = require('child_process').exec;
const mkdirs   = require('node-mkdirs');

const { 
	unityPath, assetDecompileProject, requiredCollectionsMulti, 
	cachePath, spritesOutputDir,
} = require('./config');

async function run(cmdline) {
	return new Promise((resolve, reject) => {
		exec(cmdline, function(err, out) {
            if (err) return reject(err);

		    resolve();
		});
	});
}

(async () => {
    const assetsDir = path.resolve(cachePath, 'files', 'Assets');

    for (const spritesType in requiredCollectionsMulti) {
        for (const pattern of requiredCollectionsMulti[spritesType]) {
            const files = glob.sync(pattern, {cwd: assetsDir});
            const outputPath = path.resolve(spritesOutputDir, spritesType);
    
            mkdirs(outputPath);

            const filePaths = files.filter(f => !f.endsWith('_cn')).map(f => path.resolve(assetsDir, f));

            let prefix = `"${unityPath}" -batchmode -projectPath "${assetDecompileProject}" -executeMethod EditorAutoplay.AutoPlay --scriptPaths ${outputPath}`;
            let paths = '';

            while (filePaths.length) {
                const entry = filePaths.pop();
                
                if (`${prefix}${paths} "${entry}"`.length < 4000) {
                    paths += ` "${entry}"`;
                } else {
                    try {
                        await run(`${prefix}${paths}`);
                    } catch (e) {
                        console.log(e);
                    }
                    paths = ` "${entry}"`;
                }
            }

            if (paths) {
                try {
                	await run(`${prefix}${paths}`);
                } catch (e) {
                	console.log(e);
                }
            }
        }
    }

    console.log('End');
})();