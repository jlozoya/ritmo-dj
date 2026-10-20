import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const checkout = path.join(root, '.sites-runtime', 'sites-source');
const hosting = JSON.parse(
  readFileSync(path.join(root, '.openai/hosting.json')),
);
const git = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function checkedPath(directory, relative) {
  const target = path.resolve(directory, relative);
  const suffix = path.relative(directory, target);
  if (!suffix || suffix.startsWith('..') || path.isAbsolute(suffix)) {
    throw new Error(`Path outside the source checkout: ${relative}`);
  }
  for (
    let current = target;
    current !== directory;
    current = path.dirname(current)
  ) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Symlink in source path: ${relative}`);
    }
  }
  return target;
}

if (!hosting.project_id) throw new Error('Missing Sites project_id.');
checkedPath(root, '.sites-runtime/sites-source/.git');
if (!existsSync(path.join(checkout, '.git'))) {
  throw new Error('Open the Site source first; see docs/deployment-sites.md.');
}
if (
  realpathSync(git(checkout, ['rev-parse', '--show-toplevel'])) !==
  realpathSync(checkout)
) {
  throw new Error('Sites source must have its own Git repository.');
}
const remoteHosting = JSON.parse(
  readFileSync(path.join(checkout, '.openai/hosting.json')),
);
if (remoteHosting.project_id !== hosting.project_id) {
  throw new Error('The source checkout belongs to a different Site.');
}

const list = (cwd, args) =>
  git(cwd, ['ls-files', '-z', ...args])
    .split('\0')
    .filter(Boolean);
const files = list(root, ['--cached', '--others', '--exclude-standard']).filter(
  (file) => existsSync(checkedPath(root, file)),
);
const protectedPath =
  /^(?:\.git(?:\/|$)|\.dev\.vars|\.env(?!\.example$)|\.sites-runtime\/|outputs\/|node_modules\/|dist\/|\.next\/|\.wrangler\/)/;
for (const file of files) {
  if (
    protectedPath.test(file) ||
    !lstatSync(checkedPath(root, file)).isFile()
  ) {
    throw new Error(`Private or non-regular source file: ${file}`);
  }
}
const selected = new Set(files);
const previous = list(checkout, ['--cached']);
const immutableFiles = new Map();
for (const file of previous) {
  const destination = checkedPath(checkout, file);
  if (/^drizzle\/.*(?:\.sql|_snapshot\.json)$/.test(file)) {
    const current = checkedPath(root, file);
    if (
      !selected.has(file) ||
      readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') !==
        readFileSync(current, 'utf8').replaceAll('\r\n', '\n')
    ) {
      throw new Error(`An existing migration was changed or removed: ${file}`);
    }
    immutableFiles.set(
      file,
      execFileSync('git', ['show', `HEAD:${file}`], { cwd: checkout }),
    );
  }
}

// Keep the hosted repository's history and replace only its tracked source files.
const oldDirectories = new Set();
for (const file of previous) {
  if (!selected.has(file)) {
    rmSync(checkedPath(checkout, file), { force: true });
    for (
      let directory = path.dirname(file);
      directory !== '.';
      directory = path.dirname(directory)
    ) {
      oldDirectories.add(directory);
    }
  }
}
// An empty legacy app/ directory would take precedence over src/app/ in Vinext.
// Include known legacy roots when recovering a previously synchronized checkout.
function collectLegacyDirectories(directory) {
  const absolute = checkedPath(checkout, directory);
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory())
      collectLegacyDirectories(path.join(directory, entry.name));
  }
  oldDirectories.add(directory);
}
for (const directory of ['app', 'components', 'db', 'hooks', 'lib', 'build']) {
  if (!files.some((file) => file.startsWith(`${directory}/`)))
    collectLegacyDirectories(directory);
}
for (const directory of [...oldDirectories].sort(
  (left, right) => right.length - left.length,
)) {
  try {
    rmdirSync(checkedPath(checkout, directory));
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
  }
}
if (
  !existsSync(path.join(root, 'app')) &&
  existsSync(path.join(checkout, 'app'))
) {
  throw new Error(
    'Legacy app/ still contains untracked files; preserve and reconcile them before publishing.',
  );
}
for (const file of files) {
  const destination = checkedPath(checkout, file);
  if (immutableFiles.has(file)) {
    writeFileSync(destination, immutableFiles.get(file));
    continue;
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(checkedPath(root, file), destination);
}
console.log(
  JSON.stringify({
    project_id: hosting.project_id,
    checkout_path: checkout,
    source_files: files.length,
    next: 'Build, push and package with the Sites source workflow, then save and deploy.',
  }),
);
