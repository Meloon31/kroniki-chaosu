import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const versionObj = {
  appVersion: pkg.version || '1.0.0',
  buildId: `${pkg.version || '1.0.0'}-${Date.now().toString(36)}`,
  builtAt: new Date().toISOString(),
};

const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(versionObj, null, 2));
console.log(`[Kroniki Chaosu] Stamped live build version: ${versionObj.buildId}`);
