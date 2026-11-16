import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { compileCV, projectRoot } from './scripts/lib/cv.mjs';
import { readAcademicCV } from './scripts/lib/academic.mjs';

const cvDirectory = path.join(projectRoot, 'cv');
const profilePath = path.join(projectRoot, 'data/profile.json');
const academicModule = '\0virtual:academic-cv';

function academicContent() {
  return {
    name: 'academic-content-from-latex',
    resolveId(id) { if (id === 'virtual:academic-cv') return academicModule; },
    async load(id) {
      if (id !== academicModule) return;
      for (const file of ['main.tex', 'sections/publications.tex', 'sections/education.tex',
        'sections/experience.tex', 'sections/academic-services.tex', 'sections/scholarships.tex']) {
        this.addWatchFile(path.join(cvDirectory, file));
      }
      return `export default ${JSON.stringify(await readAcademicCV(projectRoot))};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(`${cvDirectory}${path.sep}`)) return;
      const module = server.moduleGraph.getModuleById(academicModule);
      if (module) server.moduleGraph.invalidateModule(module);
      // liveCV reloads after a successful PDF compile.
      return [];
    },
  };
}
const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function liveCV() {
  return {
    name: 'live-latex-cv',
    async transformIndexHtml(source) {
      const profile = JSON.parse(await readFile(profilePath, 'utf8'));
      return source.replaceAll('%PROFILE_NAME%', html(profile.name))
        .replaceAll('%PROFILE_DESCRIPTION%', html(profile.description));
    },
    async configureServer(server) {
      // Fail early if the initial PDF cannot be compiled.
      await compileCV();
      server.watcher.add([cvDirectory, profilePath]);
      // Avoid exposing intermediate files and triggering rebuilds on TeX output.
      server.watcher.unwatch(path.join(cvDirectory, '.build'));
      let timer;
      let running = false;
      let pending = false;
      let closed = false;
      const rebuild = async () => {
        pending = true;
        if (running || closed) return;
        running = true;
        while (pending && !closed) {
          pending = false;
          try {
            await compileCV();
            if (!closed) {
              server.config.logger.info('CV compiled → public/cv.pdf');
              server.ws.send({ type: 'full-reload', path: '*' });
            }
          } catch (error) {
            server.config.logger.error(error.message);
            if (!closed) server.ws.send({ type: 'error', err: {
              message: error.message, stack: '', plugin: 'live-latex-cv',
            } });
          }
        }
        running = false;
      };
      const onChange = (_event, file) => {
        const relative = path.relative(cvDirectory, file);
        const isSource = relative !== '' && !relative.startsWith(`..${path.sep}`)
          && relative !== '..' && !path.isAbsolute(relative)
          && relative.split(path.sep)[0] !== '.build';
        if (file !== profilePath && !isSource) return;
        clearTimeout(timer);
        timer = setTimeout(rebuild, 180);
      };
      server.watcher.on('all', onChange);
      server.httpServer?.once('close', () => {
        closed = true;
        clearTimeout(timer);
        server.watcher.off('all', onChange);
      });
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0].endsWith('/cv.pdf')) response.setHeader('Cache-Control', 'no-store');
        next();
      });
    },
  };
}

export default defineConfig(async ({ command }) => ({
  base: process.env.SITE_BASE || '/',
  define: {
    __CV_REVISION__: JSON.stringify(command === 'build'
      ? createHash('sha256').update(await readFile(path.join(projectRoot, 'public/cv.pdf'))).digest('hex').slice(0, 12)
      : 'dev'),
  },
  plugins: [academicContent(), liveCV()],
  server: { watch: { ignored: ['**/cv/.build/**'] } },
}));
