#!/usr/bin/env node
// Run from a checkout of main; first argument is an Android-branch worktree.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const target = resolve(process.argv[2] || 'android-worktree');
const stateFile = '.github/android-sync-state.json';
const mainRef = 'HEAD';
const androidRef = 'refs/remotes/origin/android-only-app';
const sharedDependencies = [
  '@supabase/supabase-js', 'lucide-react', 'mammoth',
  'react', 'react-dom', 'react-router-dom'
];
const excludedFiles = new Set([
  'src/App.jsx', 'src/main.jsx', 'src/styles.css',
  'src/components/Layout.jsx',
  'src/pages/DeleteAccount.jsx', 'src/pages/LegalPage.jsx',
  'src/pages/admin/AccountDeletions.jsx',
  'src/pages/admin/Admin.jsx',
  // These are currently different implementations across the platforms.
  'src/pages/admin/LearningAdmin.jsx'
]);
function git(...args) {
  return execFileSync('git', args, {cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
}
function blob(ref, path) {
  try { return git('rev-parse', '--verify', `${ref}:${path}`); }
  catch { return null; }
}
function contents(ref, path) {
  try {return execFileSync('git', ['show', `${ref}:${path}`], {cwd: process.cwd(), encoding:'utf8'});}
  catch {return null;}
}
function shared(path) {
  if (excludedFiles.has(path)) return false;
  if (!/\.(?:js|jsx|ts|tsx|mjs)$/.test(path)) return false;
  return /^src\/(?:lib|contexts|components|pages)\//.test(path)
    || /^verification\//.test(path)
    || /^supabase\/functions\//.test(path);
}
const head = git('rev-parse', mainRef);
const previousStatePath = join(target, stateFile);
let base;
if (existsSync(previousStatePath)) {
  const state = JSON.parse(readFileSync(previousStatePath, 'utf8'));
  base = state.lastSyncedMain;
  if (!/^[0-9a-f]{40}$/.test(base)) throw new Error('Invalid Android sync baseline SHA.');
  try {git('merge-base', '--is-ancestor', base, head);}
  catch {throw new Error('Stored Android sync baseline is not an ancestor of main. Refusing sync.');}
} else {
  base = git('merge-base', head, androidRef);
  console.log(`Initial sync: using shared merge base ${base.slice(0, 12)}`);
}
if (!base) throw new Error('No safe synchronization baseline exists.');
const changedPaths = git('diff', '--no-renames', '--name-only', '-z', base, head)
  .split('\0').filter(Boolean).filter(shared);
const conflicts = [];
const updates = [];
for (const path of changedPaths) {
  const oldBlob = blob(base, path);
  const newBlob = blob(head, path);
  const androidBlob = blob(androidRef, path);
  if (androidBlob === newBlob) continue;
  if (androidBlob !== oldBlob) {
    conflicts.push(path);
    continue;
  }
  updates.push({path, content: newBlob === null ? null : contents(head, path)});
}
const oldPkg = JSON.parse(contents(base, 'package.json') || '{}');
const newPkg = JSON.parse(contents(head, 'package.json') || '{}');
const androidPkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
let packageChanged = false;
for (const name of sharedDependencies) {
  const find = obj => obj.dependencies?.[name] ?? obj.devDependencies?.[name] ?? null;
  const oldValue = find(oldPkg), newValue = find(newPkg), androidValue = find(androidPkg);
  if (oldValue === newValue || androidValue === newValue) continue;
  if (androidValue !== oldValue) {
    conflicts.push(`package.json dependency: ${name}`);
    continue;
  }
  // Keep native Android dependencies, scripts, and unrelated tooling untouched.
  if (androidPkg.devDependendencies?.[name] !== undefined) {
    delete androidPkg.devDependencies[name];
  }
  if (newValue === null) delete androidPkg.dependencies?.[name];
  else (androidPkg.dependencies ||= {})[name] = newValue;
  packageChanged = true;
}
if (conflicts.length) {
  console.error('SYNC CONFLICT: Android files/dependencies were independently modified.');
  for (const path of conflicts) console.error(`::error title=Android sync conflict::${path}`);
  console.error('No changes have been written. Resolve deliberately; do not force merge.');
  process.exit(1);
}
for (const {path, content} of updates) {
  const dest = join(target, path);
  if (content === null) rmSync(dest, {force:true});
  else {mkdirSync(dirname(dest), {recursive:true}); writeFileSync(dest, content);}
}
if (packageChanged) writeFileSync(join(target, 'package.json'), JSON.stringify(androidPkg, null, 2) + '\n');
const shouldRun = changedPaths.length > 0 || packageChanged;
if (shouldRun) {
  mkdirSync(dirname(previousStatePath), {recursive:true});
  writeFileSync(previousStatePath, JSON.stringify({lastSyncedMain:head}, null, 2) + '\n');
}
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `changed=${shouldRun}\n`, {flag:'a'});
}
console.log(`Sync: ${updates.length} shared files copied, ${packageChanged ? 'shared dependencies updated' : 'dependencies unchanged'}, ${changedPaths.length} changed eligible paths, build needed: ${shouldRun}`);
