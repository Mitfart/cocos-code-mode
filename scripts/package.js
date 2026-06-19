const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Read package.json to get the package name
const packageJsonPath = path.join(__dirname, '../package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json not found!');
    process.exit(1);
}

const packageJson = require(packageJsonPath);
const packageName = packageJson.name; // cocos-code-mode-ai
const zipFileName = `${packageName}.zip`;

// List of files/folders to include in the list
const filesToInclude = [
    '@types',
    'dist',
    'i18n',
    'node_modules',
    'static',
    'package-lock.json',
    'package.json',
    'README.md'
];

// Check for missing items (optional, but good for feedback)
const projectRoot = path.join(__dirname, '..');
const missingItems = filesToInclude.filter(item => !fs.existsSync(path.join(projectRoot, item)));

if (missingItems.length > 0) {
    console.warn('Warning: The following items to be packaged were not found:');
    missingItems.forEach(item => console.warn(` - ${item}`));
    // We proceed anyway, zip will just skip or fail depending on strictness, but usually it warns.
    // If 'dist' is missing, it's significant.
}

console.log(`Packaging project into ${zipFileName}...`);

try {
    const zipPath = path.join(projectRoot, zipFileName);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    if (process.platform === 'win32') {
        // ponytail: Windows ships tar.exe; avoid requiring Git/MSYS `zip`.
        execFileSync('tar.exe', ['-a', '-cf', zipFileName, ...filesToInclude.map(f => `./${f}`)], { cwd: projectRoot, stdio: 'inherit' });
    } else {
        execFileSync('zip', ['-r', zipFileName, ...filesToInclude], { cwd: projectRoot, stdio: 'inherit' });
    }

    console.log(`\nPackage created successfully: ${zipPath}`);
} catch (error) {
    console.error('Error creating package:', error.message);
    process.exit(1);
}
