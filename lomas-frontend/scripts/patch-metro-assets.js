// Metro 0.83.3 pasa rutas a image-size 1; image-size 2 recibe bytes.
// Adaptación mínima para utilizar los analizadores corregidos de 2.0.4.
// No descarga archivos ni modifica fuentes de la aplicación.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('metro/package.json'));
const file = path.join(root, 'src/Assets.js');
const original = 'const dimensions = isImage ? (0, _imageSize.default)(isImageInput) : null;';
const replacement = 'const dimensions = isImage ? (0, _imageSize.default)(typeof isImageInput === "string" ? _fs.default.readFileSync(isImageInput) : isImageInput) : null;';
const content = fs.readFileSync(file, 'utf8');
if (content.includes(replacement)) {
  console.log('Adaptación de imágenes de Metro ya aplicada.');
} else {
  if (require('metro/package.json').version !== '0.83.3' || !content.includes(original)) {
    throw new Error('Metro cambió: revisar scripts/patch-metro-assets.js antes de compilar.');
  }
  fs.writeFileSync(file, content.replace(original, replacement));
  console.log('Metro adaptado para image-size 2.0.4.');
}
