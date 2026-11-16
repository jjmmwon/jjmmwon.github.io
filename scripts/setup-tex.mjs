import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Official Tectonic 0.17.0 release assets and their published SHA-256 digests.
const targets = {
  'linux-x64': ['x86_64-unknown-linux-musl.tar.gz', '8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7'],
  'linux-arm64': ['aarch64-unknown-linux-musl.tar.gz', 'b10954a95404f3ab2328d2fa59a5ebab8e657f893fab096f98be8db7c0c979b8'],
  'darwin-x64': ['x86_64-apple-darwin.tar.gz', '7c90ef5b6ddb1eb1937e4337add5237b79338e4b9676459fa91187d24d6cdf80'],
  'darwin-arm64': ['aarch64-apple-darwin.tar.gz', 'a3f1cac7c5678f01661a92212f58480ae3b0634115d880dbc59e2953ded45667'],
};
const target = targets[`${process.platform}-${process.arch}`];
if (!target) throw new Error('Install Tectonic 0.17.0 on PATH for this platform; see README.md.');
const directory = fileURLToPath(new URL('../.tools/', import.meta.url));
await mkdir(directory, { recursive: true });
const temporary = await mkdtemp(path.join(directory, 'setup-'));
try {
  const [asset, digest] = target;
  const url = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.17.0/tectonic-0.17.0-${asset}`;
  console.log('Downloading Tectonic 0.17.0…');
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(archive).digest('hex') !== digest) throw new Error('Tectonic checksum mismatch.');
  const archivePath = path.join(temporary, 'tectonic.tar.gz');
  await writeFile(archivePath, archive);
  execFileSync('tar', ['-xzf', archivePath, '-C', temporary, 'tectonic']);
  await chmod(path.join(temporary, 'tectonic'), 0o755);
  await rename(path.join(temporary, 'tectonic'), path.join(directory, 'tectonic'));
  console.log('Installed .tools/tectonic. Run npm run cv to cache the required TeX packages.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
