import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const root = process.cwd();
const documents = ['README.md', 'ARCHITECTURE.md', 'RELEASE.md'];

function collect(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) collect(path);
    else if (extname(path) === '.md') documents.push(path.slice(root.length + 1));
  }
}

collect(join(root, 'docs'));
const failures = [];

for (const relativePath of documents) {
  const absolutePath = resolve(root, relativePath);
  const source = readFileSync(absolutePath, 'utf8');

  for (const match of source.matchAll(/```json\s*\n([\s\S]*?)\n```/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      failures.push(`${relativePath}: invalid fenced JSON (${error.message})`);
    }
  }

  for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (!target || target.startsWith('#') || /^[a-z]+:/i.test(target)) continue;
    const path = target.split('#', 1)[0];
    if (path && !existsSync(resolve(dirname(absolutePath), decodeURIComponent(path)))) {
      failures.push(`${relativePath}: broken link ${target}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${documents.length} Markdown documents.`);
