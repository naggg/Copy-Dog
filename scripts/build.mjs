#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * ディレクトリを再帰的にコピー
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * ファイルをコピー
 */
async function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(src, dest);
}

/**
 * ディレクトリ内の.DS_Storeファイルを再帰的に削除
 */
async function removeDSStore(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await removeDSStore(entryPath);
      } else if (entry.name === '.DS_Store') {
        console.log(`Removing .DS_Store file: ${entryPath}`);
        try {
          await fs.unlink(entryPath);
        } catch (err) {
          // ファイルが存在しない場合は無視
        }
      }
    }
  } catch (err) {
    // ディレクトリが存在しない場合は無視
  }
}

/**
 * Firefox拡張のビルド処理
 */
async function buildFirefox() {
  console.log('Building Firefox extension...');
  
  const tmpDir = path.join(rootDir, 'dist', 'firefox', 'tmp');
  const distDir = path.join(rootDir, 'dist', 'firefox');
  const commonDir = path.join(rootDir, 'src', 'common');
  const manifestSrc = path.join(rootDir, 'src', 'manifests', 'firefox', 'manifest.json');
  const manifestDest = path.join(tmpDir, 'manifest.json');
  const xpiPath = path.join(distDir, 'copy-dog-fx.xpi');
  
  // dist/firefox/tmp ディレクトリをクリーンアップ
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // ディレクトリが存在しない場合は無視
  }
  
  // common ディレクトリを dist/firefox/tmp にコピー
  console.log('Copying common files to dist/firefox/tmp...');
  await copyDir(commonDir, tmpDir);
  
  // manifest.json を dist/firefox/tmp にコピー
  console.log('Copying manifest.json...');
  await copyFile(manifestSrc, manifestDest);
  
  // .DS_Storeファイルを削除
  console.log('Removing .DS_Store files...');
  await removeDSStore(tmpDir);
  
  // dist/firefox/tmp をzipパッケージングして dist/firefox フォルダに生成
  console.log('Creating XPI file...');
  await fs.mkdir(distDir, { recursive: true });
  
  // zipコマンドでXPIファイルを作成
  // macOS/Linux: zip -r, Windows: 別の方法が必要な場合あり
  const zipCommand = `cd "${tmpDir}" && zip -r "${xpiPath}" . -x ".*" -x "__MACOSX"`;
  
  try {
    await execAsync(zipCommand);
    console.log(`XPI file created: ${xpiPath}`);
  } catch (err) {
    console.error('Failed to create XPI file:', err.message);
    throw err;
  }
  
  // dist/firefox/tmp フォルダを削除
  console.log('Cleaning up tmp directory...');
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log('Tmp directory removed.');
  } catch (err) {
    console.warn('Failed to remove tmp directory:', err.message);
  }
  
  console.log('Firefox build completed!');
  console.log(`Output file: ${xpiPath}`);
}

/**
 * Chrome拡張のビルド処理
 */
async function buildChrome() {
  console.log('Building Chrome extension...');
  
  const distDir = path.join(rootDir, 'dist', 'chrome');
  const commonDir = path.join(rootDir, 'src', 'common');
  const manifestSrc = path.join(rootDir, 'src', 'manifests', 'chrome', 'manifest.json');
  const manifestDest = path.join(distDir, 'manifest.json');
  
  // dist/chrome ディレクトリをクリーンアップ
  try {
    await fs.rm(distDir, { recursive: true, force: true });
  } catch (err) {
    // ディレクトリが存在しない場合は無視
  }
  
  // common ディレクトリを dist/chrome にコピー
  console.log('Copying common files to dist/chrome...');
  await copyDir(commonDir, distDir);
  
  // manifest.json を dist/chrome にコピー
  console.log('Copying manifest.json...');
  await copyFile(manifestSrc, manifestDest);
  
  // .DS_Storeファイルを削除
  console.log('Removing .DS_Store files...');
  await removeDSStore(distDir);
  
  console.log('Chrome build completed!');
  console.log(`Output directory: ${distDir}`);
}

/**
 * メインビルド処理
 */
async function build() {
  try {
    await buildFirefox();
    await buildChrome();
    console.log('\nAll builds completed successfully!');
  } catch (err) {
    console.error('Build failed:', err);
    throw err;
  }
}

// 実行
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

