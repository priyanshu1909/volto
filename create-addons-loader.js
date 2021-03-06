const fs = require('fs');
const tmp = require('tmp');
const cryptoRandomString = require('crypto-random-string');

const titleCase = (w) => w.slice(0, 1).toUpperCase() + w.slice(1, w.length);

/*
 * Transforms a package name to javascript variable name
 */
function nameFromPackage(name) {
  name =
    name.replace(/[@~./\\:\s]/gi, '') ||
    cryptoRandomString({ length: 10, characters: 'abcdefghijk' });
  return name
    .split('-')
    .map((w, i) => (i > 0 ? titleCase(w) : w))
    .join('');
}

/*
 * Creates a static file with code necessary to load the addons configuration
 *
 */
function getAddonsLoaderCode(addons = []) {
  let buf = `/*
This file is autogenerated. Don't change it directly.
Instead, change the "addons" setting in your package.json file.
*/

`;
  let configsToLoad = [],
    counter = 0;

  addons.forEach((addonConfigString) => {
    let extras = [];
    const addonConfigLoadInfo = addonConfigString.split(':');
    const pkgName = addonConfigLoadInfo[0];
    const defaultImport = nameFromPackage(pkgName);
    if (addonConfigLoadInfo.length > 1) {
      extras = addonConfigLoadInfo[1].split(',');
    }
    extras = extras.map((name) => [name, `${name}${counter++}`]);

    const line = `import ${defaultImport}${
      extras.length
        ? `, { ${extras
            .map((ex) => {
              return `${ex[0]} as ${ex[1]}`;
            })
            .join(', ')} }`
        : ''
    } from '${pkgName}';\n`;
    buf += line;
    configsToLoad = [
      ...configsToLoad,
      defaultImport,
      ...extras.map((ex) => ex[1]),
    ];
  });

  buf += `
const safeWrapper = (func) => (config) => {
  const res = func(config);
  if (typeof res === 'undefined') {
    throw new Error("Configuration function doesn't return config");
  }
  return res;
}

const load = (config) => {
  const addonLoaders = [${configsToLoad.join(', ')}];
  if(!addonLoaders.every((el) => typeof el === "function")) {
    throw new TypeError(
      'Each addon has to provide a function applying its configuration to the projects configuration.',
    );
  }
  return addonLoaders.reduce((acc, apply) => safeWrapper(apply)(acc), config);
};
export default load;
`;

  return buf;
}

module.exports = (addons) => {
  // const addonsLoaderPath = path.join(
  //   process.cwd(),
  //   'src',
  //   'load-volto-addons.js',
  // );
  //
  const addonsLoaderPath = tmp.tmpNameSync({ postfix: '.js' });
  const code = getAddonsLoaderCode(addons);
  fs.writeFileSync(addonsLoaderPath, new Buffer.from(code));
  return addonsLoaderPath;
};

module.exports.getAddonsLoaderCode = getAddonsLoaderCode;
module.exports.nameFromPackage = nameFromPackage;
