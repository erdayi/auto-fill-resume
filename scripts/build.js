/**
 * Build script — generates a .zip package for Chrome/Edge extension distribution
 * Usage: node scripts/build.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const version = manifest.version;
const outName = `auto-fill-resume-v${version}.zip`;
const outPath = path.join(ROOT, 'dist', outName);

// Files/dirs to include
const includes = [
  'manifest.json',
  'background.js',
  'popup/',
  'content/',
  'icons/',
];

// Ensure dist folder
const distDir = path.join(ROOT, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Remove old zip if exists
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

// Check if 7z or tar is available, fallback to node-based zip
try {
  // Try using PowerShell Compress-Archive (available on Windows)
  const includeList = includes.map(f => `"${path.join(ROOT, f)}"`).join(',');

  // Create a temp dir with only needed files
  const tmpDir = path.join(distDir, '_tmp_build');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  for (const item of includes) {
    const src = path.join(ROOT, item);
    const dest = path.join(tmpDir, item);
    if (item.endsWith('/')) {
      copyDirSync(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  // Use PowerShell to create zip
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${outPath}' -Force"`,
    { stdio: 'inherit' }
  );

  // Cleanup temp
  fs.rmSync(tmpDir, { recursive: true });

  const size = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\n  ✅ Build complete: dist/${outName} (${size} KB)\n`);
  console.log(`  Install:`);
  console.log(`    Chrome: chrome://extensions → Load unpacked / drag .zip`);
  console.log(`    Edge:   edge://extensions   → Load unpacked / drag .zip\n`);

} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
