import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readAcademicCV, texText } from '../scripts/lib/academic.mjs';
import { projectRoot } from '../scripts/lib/cv.mjs';

test('web content follows enabled CV sources and groups the confirmed teaching terms', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'homepage-academic-'));
  try {
    await cp(path.join(projectRoot, 'cv'), path.join(root, 'cv'), {
      recursive: true, filter: source => !source.split(path.sep).includes('.build'),
    });
    const content = await readAcademicCV(root);
    assert.equal(content.publications.length, 4);
    const journal = content.publications.find(paper => paper.title.startsWith('GhostUMAP2:'));
    assert.equal(journal.category, 'Journal Articles');
    assert.equal(journal.year, '2026');
    assert.match(journal.venue, /Presented at IEEE VIS 2025/);
    assert.equal(journal.authors[0], 'Myeongwon Jung');
    assert.equal(journal.links[0].url, 'https://doi.org/10.1109/TVCG.2025.3633894');
    assert.equal(content.publications.find(paper => paper.title.startsWith('GPUMAP:')).category, 'Preprints & Posters');
    assert.equal(content.education.length, 3);
    assert.deepEqual(content.services.map(service => service.role), [
      'Student Volunteer', 'Teaching Assistant', 'Teaching Assistant (Lab Instructor)',
    ], 'only confirmed services appear in the requested order');
    assert.deepEqual(content.services[0], {
      role: 'Student Volunteer',
      institution: '2023 IEEE PacificVis Symposium',
      period: '2023',
      courses: [],
      description: '',
    });
    assert.deepEqual(content.services[1].courses, [
      'Information Visualization (2024 Spring)',
      'Principles of Machine Learning (2024 Fall, 2026 Spring, 2026 Fall)',
      'Introduction to HCI (2025 Fall)',
    ]);
    assert.equal(content.services[1].description, '', 'a later role description must not leak into the grouped TA entry');
    assert.deepEqual(content.services[2], {
      role: 'Teaching Assistant (Lab Instructor)',
      institution: 'SSIT Program, Sungkyunkwan University',
      period: 'Spring 2026',
      courses: ['Python Fundamentals and Data Visualization'],
      description: 'Led hands-on lab sessions on Python programming and data visualization.',
    });
    assert.equal(content.scholarships.length, 2);
    assert.equal(content.scholarships[0].title, 'STEM Doctoral Excellence Scholarship');
    assert.equal(content.scholarships[0].institution, 'Ministry of Science and ICT & Korea Student Aid Foundation');
    assert.equal(content.scholarships[0].period, '2026');
    assert.equal(content.scholarships[0].description, 'National merit-based scholarship for STEM Ph.D. students');

    const servicesPath = path.join(root, 'cv/sections/academic-services.tex');
    const services = await readFile(servicesPath, 'utf8');
    await writeFile(servicesPath, services.replace('2025 Fall', '2027 Spring'));
    assert.match((await readAcademicCV(root)).services[1].courses[2], /2027 Spring/,
      'editing LaTeX must change the web data without editing JSON');
    const mainPath = path.join(root, 'cv/main.tex');
    await writeFile(mainPath, (await readFile(mainPath, 'utf8')).replace(
      '\\input{sections/academic-services.tex}', '% \\input{sections/academic-services.tex}',
    ));
    assert.deepEqual((await readAcademicCV(root)).services, [], 'disabled sections stay off the website');
    await writeFile(mainPath, (await readFile(mainPath, 'utf8')).replace(
      '\\input{sections/scholarships.tex}', '% \\input{sections/scholarships.tex}',
    ));
    assert.deepEqual((await readAcademicCV(root)).scholarships, [], 'disabled scholarships stay off the website');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CV text handles nested formatting, links, math and escaped characters', () => {
  assert.equal(texText(String.raw`\textbf{A \emph{nested} title} \& 100\% $(r,d)$`), 'A nested title & 100% (r,d)');
  assert.equal(texText(String.raw`\href{https://example.org}{A \textbf{link}}\newline Next`), 'A link Next');
});
