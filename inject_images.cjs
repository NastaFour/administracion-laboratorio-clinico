const fs = require('fs');

const logoBase64 = fs.readFileSync('logo_base64.txt', 'utf8').trim();
const signatureBase64 = fs.readFileSync('signature_base64.txt', 'utf8').trim();

let template = fs.readFileSync('electron/pdfTemplate.ts', 'utf8');

const injection = `const logoBase64 = '${logoBase64}';\n    const signatureBase64 = '${signatureBase64}';`;

template = template.replace('// BASE64_IMAGES_PLACEHOLDER', injection);

fs.writeFileSync('electron/pdfTemplate.ts', template);
console.log('Images injected successfully');
