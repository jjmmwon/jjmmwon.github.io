import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { compileCV, projectRoot } from '../scripts/lib/cv.mjs';

test('CV publishes atomically, preserves the last PDF on failure, and recovers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'homepage-cv-'));
  try {
    await cp(path.join(projectRoot, 'cv'), path.join(root, 'cv'), {
      recursive: true,
      filter: source => !source.split(path.sep).includes('.build'),
    });
    await cp(path.join(projectRoot, 'data'), path.join(root, 'data'), { recursive: true });
    const profilePath = path.join(root, 'data/profile.json');
    const profile = JSON.parse(await readFile(profilePath, 'utf8'));
    // JSON metadata must render as plain TeX text, including all reserved characters.
    profile.name = 'A & B_100% #1 $ {Test} \\ ~ ^';
    await writeFile(profilePath, JSON.stringify(profile));
    const destination = await compileCV({ root });
    const original = await readFile(destination);
    assert.equal(original.subarray(0, 5).toString(), '%PDF-');
    assert.ok(original.length > 1000);

    const sectionPath = path.join(root, 'cv/sections/experience.tex');
    await writeFile(sectionPath, '\\ThisCommandDoesNotExist\n');
    await assert.rejects(compileCV({ root }), /failed \(exit 1\)/);
    assert.deepEqual(await readFile(destination), original, 'a failed compile must preserve the published PDF');
    assert.deepEqual(await readdir(path.join(root, 'cv/.build')), [], 'temporary jobs must be cleaned up');
    assert.deepEqual(await readdir(path.join(root, 'public')), ['cv.pdf']);

    await writeFile(sectionPath, '\\cvsection{Updated Experience}\nA new entry.\n');
    // Optional bilingual/contact fields can be omitted without breaking the header.
    profile.nativeName = '';
    profile.email = '';
    profile.website = '';
    await writeFile(profilePath, JSON.stringify(profile));
    await compileCV({ root });
    assert.notDeepEqual(await readFile(destination), original, 'a repaired source must update the PDF');
    await assert.rejects(compileCV({ root, engine: 'unknown-engine' }), /LATEX_ENGINE/);
    await assert.rejects(compileCV({ root, engine: 'pdflatex' }), /requires OpenType fonts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
