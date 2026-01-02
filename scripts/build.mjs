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
 * ビルド処理
 */
async function build() {
  console.log('Building Firefox extension...');
  
  const distDir = path.join(rootDir, 'dist', 'firefox');
  const commonDir = path.join(rootDir, 'src', 'common');
  const manifestSrc = path.join(rootDir, 'src', 'manifests', 'firefox', 'manifest.json');
  const manifestDest = path.join(distDir, 'manifest.json');
  
  // dist/firefox ディレクトリをクリーンアップ
  try {
    await fs.rm(distDir, { recursive: true, force: true });
  } catch (err) {
    // ディレクトリが存在しない場合は無視
  }
  
  // common ディレクトリを dist/firefox にコピー
  console.log('Copying common files...');
  await copyDir(commonDir, distDir);
  
  // manifest.json を dist/firefox にコピー
  console.log('Copying manifest.json...');
  await copyFile(manifestSrc, manifestDest);
  
  console.log('Build completed!');
  console.log(`Output directory: ${distDir}`);
  
  // XPIファイルを作成
  console.log('Creating XPI file...');
  const deployDir = path.join(rootDir, 'deploy');
  await fs.mkdir(deployDir, { recursive: true });
  const xpiPath = path.join(deployDir, 'copy-dog-fx.xpi');
  
  // zipコマンドでXPIファイルを作成
  // macOS/Linux: zip -r, Windows: 別の方法が必要な場合あり
  const zipCommand = `cd "${distDir}" && zip -r "${xpiPath}" . -x ".*" -x "__MACOSX"`;
  
  try {
    await execAsync(zipCommand);
    console.log(`XPI file created: ${xpiPath}`);
  } catch (err) {
    console.warn('Failed to create XPI file:', err.message);
    console.warn('You can create it manually using:');
    console.warn(`  cd ${distDir}`);
    console.warn(`  zip -r ${xpiPath} . -x ".*" -x "__MACOSX"`);
  }
}

// 実行
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

