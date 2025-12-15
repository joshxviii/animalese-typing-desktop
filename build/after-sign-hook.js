import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import glob from 'glob';

export default async function (context) {
  const { appOutDir } = context;

  const platformName = context.packager.platform.name;

  // macOS specific handling 
  if (platformName === 'mac') {
    const appPath = path.join(appOutDir, 'Animalese Typing.app');
    const resourcesDir = path.join(appPath, 'Contents/Resources');
    const frameworksDir = path.join(appPath, 'Contents/Frameworks');

    const binaryPath = path.join(resourcesDir, 'animalese-listener');

    if (fs.existsSync(binaryPath)) {
      try { 
        fs.chmodSync(binaryPath, 0o755); 
      } catch (err) { 
        console.warn('[afterSign] Could not chmod animalese-listener:', err.message);
      }
    
      try {
        console.log('[afterSign] Signing animalese-listener...');
        execSync(`codesign --force --sign - "${binaryPath}"`);
      } catch (err) {
        console.warn('[afterSign] Failed to codesign animalese-listener:', err.message);
      }
    }
    else {
      console.warn('[afterSign] animalese-listener not found at', binaryPath, '- skipping codesign.');
    }

    console.log('[afterSign] Copying libswift dylibs...');
    fs.mkdirSync(frameworksDir, { recursive: true });

    const dylibSourceDir = '/usr/lib/swift';
    const dylibs = fs.readdirSync(dylibSourceDir).filter(f => f.startsWith('libswift') && f.endsWith('.dylib'));
    dylibs.forEach(file => {
      const src = path.join(dylibSourceDir, file);
      const dest = path.join(frameworksDir, file);
      try {
        fs.statSync(src);
        fs.copyFileSync(src, dest);
        console.log('[afterSign] Copied:', file);
      } catch (err) {
        console.warn('[afterSign] Skipped missing dylib:', src);
      }
    });

    console.log('[afterSign] Signing animalese-listener...');
    execSync(`codesign --force --sign - "${binaryPath}"`);

    console.log('[afterSign] Signing dylibs...');
    dylibs.forEach(file => {
      const dylibPath = path.join(frameworksDir, file);
      try {
        fs.statSync(dylibPath);
        execSync(`codesign --force --sign - "${dylibPath}"`);
      } catch (err) {
        console.warn('[afterSign] Skipped missing dylib:', dylibPath);
      }
    });

    console.log('[afterSign] Signing Electron frameworks...');
    const helperApps = glob.sync(
      path.join(frameworksDir, '*Helper*.app')
    );

    for (const helper of helperApps) {
      console.log(`  └─ Signing helper: ${helper}`);
      execSync(`codesign --force --sign - "${helper}"`);
    }

    const efwHelperDir = path.join(frameworksDir, 'Electron Framework.framework/Versions/A/Helpers');
    if (fs.existsSync(efwHelperDir)) {
      const helperBins = fs.readdirSync(efwHelperDir);
      for (const bin of helperBins) {
        const binPath = path.join(efwHelperDir, bin);
        console.log(`  └─ Signing Electron Framework helper binary: ${binPath}`);
        execSync(`codesign --force --sign - "${binPath}"`);
      }
    }

    const frameworks = fs.readdirSync(frameworksDir)
      .filter(name => name.endsWith('.framework'));

    for (const fw of frameworks) {
      const frameworkPath = path.join(frameworksDir, fw);
      console.log(`  └─ Signing framework: ${frameworkPath}`);
      execSync(`codesign --force --sign - "${frameworkPath}"`);
    }

    console.log('[afterSign] Signing entire app...');
    execSync(`codesign --force --sign - "${appPath}"`);

    console.log('[afterSign] Verifying entire app...');
    execSync(`codesign --verify --strict --verbose=2 "${appPath}"`);
    return;
  }

  if (platformName === 'linux' || platformName === 'win') {
    const listeners = ['animalese-listener', 'animalese-listener.exe'];
    for (const name of listeners) {
      const matches = glob.sync(path.join(appOutDir, '**', name));
      for (const match of matches) {
        try {
          fs.chmodSync(match, 0o755);
          console.log(`[afterSign] Set executable bit for: ${match}`);
        } catch (err) {
          console.warn(`[afterSign] Could not chmod ${match}:`, err.message);
        }
      }
    }
  }
}