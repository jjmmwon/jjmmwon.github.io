import { spawn } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

const latexCharacters = {
  '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$',
  '&': '\\&', '#': '\\#', '_': '\\_', '%': '\\%',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
};

function tex(value) {
  return String(value ?? '').replace(/[\\{}$&#_%~^]/g, character => latexCharacters[character]);
}

function run(engine, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(engine, args, options);
    let output = '';
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-24000); });
    child.stderr.on('data', chunk => { output = (output + chunk).slice(-24000); });
    child.once('error', error => reject(new Error(error.code === 'ENOENT'
      ? `${engine} is not installed. Run npm run setup:tex or install XeLaTeX; see README.md.`
      : error.message)));
    child.once('close', code => code === 0 ? resolve() : reject(new Error(
      `${engine} failed (exit ${code}).\n${output}`,
    )));
  });
}

/** Compile in isolation, publishing only a complete, successful PDF. */
export async function compileCV({ root = projectRoot, engine = process.env.LATEX_ENGINE || 'tectonic' } = {}) {
  if (!['tectonic', 'xelatex'].includes(engine)) {
    throw new Error('LATEX_ENGINE must be tectonic or xelatex; the RESUME template requires OpenType fonts and xeCJK.');
  }
  const profile = JSON.parse(await readFile(path.join(root, 'data/profile.json'), 'utf8'));
  if (typeof profile.name !== 'string' || !profile.name.trim()) {
    throw new Error('data/profile.json must contain a non-empty name.');
  }
  const cvDirectory = path.join(root, 'cv');
  const buildDirectory = path.join(cvDirectory, '.build');
  const publicDirectory = path.join(root, 'public');
  await mkdir(buildDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });
  const jobDirectory = await mkdtemp(path.join(buildDirectory, 'job-'));
  try {
    // Keep fonts, class files and generated metadata local to this compilation.
    for (const entry of await readdir(cvDirectory)) {
      if (entry !== '.build') await cp(path.join(cvDirectory, entry), path.join(jobDirectory, entry), { recursive: true });
    }
    // Escape profile values so they cannot introduce user-provided TeX commands.
    await writeFile(path.join(jobDirectory, 'profile.generated.tex'), [
      `\\newcommand{\\CVName}{${tex(profile.name)}}`,
      `\\newcommand{\\CVNativeName}{${tex(profile.nativeName)}}`,
      `\\newcommand{\\CVRole}{${tex(profile.role)}}`,
      `\\newcommand{\\CVAffiliation}{${tex(profile.affiliation)}}`,
      `\\newcommand{\\CVEmail}{${tex(profile.email)}}`,
      `\\newcommand{\\CVWebsite}{${tex(profile.website)}}`,
      '',
    ].join('\n'));
    if (engine === 'tectonic') {
      const localEngine = path.join(projectRoot, '.tools', process.platform === 'win32' ? 'tectonic.exe' : 'tectonic');
      const executable = await access(localEngine).then(() => localEngine, () => 'tectonic');
      // Tectonic resolves references and performs the required reruns itself.
      await run(executable, ['--untrusted', '--keep-logs', '--print', '--outdir', jobDirectory, 'main.tex'], {
        cwd: jobDirectory,
        env: { ...process.env, TECTONIC_CACHE_DIR: path.join(projectRoot, '.tools', 'tectonic-cache') },
      });
    } else {
      const args = ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error',
        '-no-shell-escape', `-output-directory=${jobDirectory}`, 'main.tex'];
      // Two passes resolve internal links and references with XeLaTeX.
      await run(engine, args, { cwd: jobDirectory, env: process.env });
      await run(engine, args, { cwd: jobDirectory, env: process.env });
    }
    const pdf = await readFile(path.join(jobDirectory, 'main.pdf'));
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('LaTeX did not generate a valid PDF.');
    // Rename on the same filesystem keeps readers from seeing a partial PDF.
    const pending = path.join(publicDirectory, `.cv-${path.basename(jobDirectory)}.pdf`);
    try {
      await writeFile(pending, pdf);
      await rename(pending, path.join(publicDirectory, 'cv.pdf'));
    } finally {
      await rm(pending, { force: true });
    }
    return path.join(publicDirectory, 'cv.pdf');
  } finally {
    await rm(jobDirectory, { recursive: true, force: true });
  }
}
