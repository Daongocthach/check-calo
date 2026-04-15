const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appConfigPath = path.join(rootDir, 'app.config.ts');
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

function updateFile(filePath, matcher, replacer) {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(matcher);

  if (!match || typeof match[1] !== 'string') {
    throw new Error(`Could not find version in ${path.relative(rootDir, filePath)}`);
  }

  const currentVersion = Number.parseInt(match[1], 10);

  if (!Number.isInteger(currentVersion)) {
    throw new Error(`Invalid version value in ${path.relative(rootDir, filePath)}`);
  }

  const nextVersion = currentVersion + 1;
  const updatedSource = source.replace(matcher, replacer(nextVersion));

  fs.writeFileSync(filePath, updatedSource, 'utf8');

  return {
    currentVersion,
    nextVersion,
  };
}

const appConfigResult = updateFile(
  appConfigPath,
  /versionCode:\s*(\d+),/,
  (nextVersion) => `versionCode: ${nextVersion},`
);

const gradleResult = updateFile(
  buildGradlePath,
  /versionCode\s+(\d+)/,
  (nextVersion) => `versionCode ${nextVersion}`
);

if (appConfigResult.nextVersion !== gradleResult.nextVersion) {
  throw new Error('Android versionCode is out of sync after update.');
}

console.log(
  `Android versionCode bumped from ${appConfigResult.currentVersion} to ${appConfigResult.nextVersion}.`
);
