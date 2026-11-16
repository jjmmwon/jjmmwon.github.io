import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Read the small set of CV macros used by this project's template. This is not
// a general TeX interpreter: presentation stays in LaTeX; web output is text.
function group(source, start) {
  let cursor = start;
  while (/\s/.test(source[cursor] || '') && cursor < source.length) cursor++;
  if (source[cursor] !== '{') throw new Error('Expected a braced CV macro argument.');
  const begin = ++cursor;
  let depth = 1;
  for (; cursor < source.length; cursor++) {
    if (source[cursor] === '\\') { cursor++; continue; }
    if (source[cursor] === '{') depth++;
    if (source[cursor] === '}' && --depth === 0) return { value: source.slice(begin, cursor), end: cursor + 1 };
  }
  throw new Error('Unclosed CV macro argument.');
}

export function commands(source, definitions) {
  const result = [];
  const pattern = /\\([A-Za-z]+)\b/g;
  let match;
  while ((match = pattern.exec(source))) {
    const count = definitions[match[1]];
    if (!count) continue;
    let cursor = pattern.lastIndex;
    const args = [];
    for (let i = 0; i < count; i++) {
      const argument = group(source, cursor);
      args.push(argument.value);
      cursor = argument.end;
    }
    result.push({ name: match[1], args, start: match.index, end: cursor });
    pattern.lastIndex = cursor;
  }
  return result;
}

function uncomment(source) {
  return source.replace(/(^|[^\\])%[^\n]*/g, '$1');
}

export function texText(value) {
  let source = value;
  const replacements = commands(source, { href: 2, url: 1, textbf: 1, textit: 1, emph: 1 });
  for (const command of replacements.reverse()) {
    const text = texText(command.args[command.name === 'href' ? 1 : 0]);
    source = source.slice(0, command.start) + text + source.slice(command.end);
  }
  return source.replace(/\\(?:begin|end)\{[^}]*\}(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\(?:newline|par|item)\b|\\\\/g, ' ')
    .replace(/\\([&%_$#{}])/g, '$1')
    .replace(/\\[ \t]|~/g, ' ')
    .replace(/\$|[{}]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function links(source) {
  return commands(source, { href: 2, url: 1 }).map(({ args }) => ({
    url: args[0], label: /arxiv\.org/.test(args[0]) ? 'arXiv' : 'Paper',
  }));
}

function entries(source) {
  return commands(source, { cventry: 5 }).map(({ args }) => ({
    title: texText(args[0]), institution: texText(args[1]), period: texText(args[2]),
    location: texText(args[3]), description: texText(args[4]),
  }));
}

export async function readAcademicCV(root) {
  const directory = path.join(root, 'cv');
  const main = uncomment(await readFile(path.join(directory, 'main.tex'), 'utf8'));
  const active = new Set(commands(main, { input: 1 }).map(({ args }) => args[0]));
  const section = async name => active.has(`sections/${name}.tex`)
    ? uncomment(await readFile(path.join(directory, 'sections', `${name}.tex`), 'utf8')) : '';
  const [publications, education, experience, services, scholarships] = await Promise.all([
    section('publications'), section('education'), section('experience'),
    section('academic-services'), section('scholarships'),
  ]);
  let category = 'Publications';
  const papers = [];
  for (const { name, args } of commands(publications, { cvpubgroup: 1, cventrysingle: 3 })) {
    if (name === 'cvpubgroup') { category = texText(args[0]); continue; }
    const venue = texText(args[2]).replace(/\s*(?:DOI:\s*[\d.]+\/\S+|arXiv:\S+)$/, '');
    papers.push({
      title: texText(args[0]), authors: texText(args[1]).split(/, and | and |, /),
      venue, category, year: venue.match(/\b20\d{2}\b/)?.[0] || '', links: links(args[2]),
    });
  }
  const roles = commands(services, { cvhonor: 4, cventry: 5 });
  const academicServices = roles.map((role, index) => {
    const body = role.name === 'cvhonor'
      ? services.slice(role.end, roles[index + 1]?.start || services.length) : role.args[4];
    const courses = [...body.matchAll(/\\item\s+([\s\S]*?)(?=\\item\b|\\end\{(?:itemize|cvitems)\})/g)]
      .map(match => texText(match[1]));
    const descriptionBody = role.name === 'cvhonor'
      ? commands(body, { descriptionstyle: 1 }).map(({ args }) => args[0]).join(' ') : body;
    const description = texText(descriptionBody.replace(
      /\\begin\{(itemize|cvitems)\}[\s\S]*?\\end\{\1\}/g, ' ',
    ));
    return {
      role: texText(role.args[0]), institution: texText(role.args[1]),
      period: texText(role.args[role.name === 'cvhonor' ? 3 : 2]), courses, description,
    };
  });
  return { publications: papers, education: entries(education), experience: entries(experience),
    services: academicServices, scholarships: entries(scholarships) };
}
