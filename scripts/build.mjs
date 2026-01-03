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
 * ビルド処理
 */
async function build() {
  console.log('Building Firefox extension...');
  
  const tmpDir = path.join(rootDir, 'dist', 'tmp');
  const distDir = path.join(rootDir, 'dist');
  const commonDir = path.join(rootDir, 'src', 'common');
  const manifestSrc = path.join(rootDir, 'src', 'manifests', 'firefox', 'manifest.json');
  const manifestDest = path.join(tmpDir, 'manifest.json');
  const xpiPath = path.join(distDir, 'copy-dog-fx.xpi');
  
  // dist/tmp ディレクトリをクリーンアップ
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // ディレクトリが存在しない場合は無視
  }
  
  // common ディレクトリを dist/tmp にコピー
  console.log('Copying common files to dist/tmp...');
  await copyDir(commonDir, tmpDir);
  
  // manifest.json を dist/tmp にコピー
  console.log('Copying manifest.json...');
  await copyFile(manifestSrc, manifestDest);
  
  // .DS_Storeファイルを削除
  console.log('Removing .DS_Store files...');
  await removeDSStore(tmpDir);
  
  // dist/tmp をzipパッケージングして dist フォルダに生成
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
  
  // dist/tmp フォルダを削除
  console.log('Cleaning up tmp directory...');
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log('Tmp directory removed.');
  } catch (err) {
    console.warn('Failed to remove tmp directory:', err.message);
  }
  
  console.log('Build completed!');
  console.log(`Output file: ${xpiPath}`);
}

// 実行
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

