import profile from '../data/profile.json';
import media from '../data/publication-media.json';
import academic from 'virtual:academic-cv';
import { swimmer, setupSwimmer } from './swimmer';
import './style.css';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const webURL = value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? escape(url.href) : '';
  } catch { return ''; }
};
const external = (url, label, className = '') => {
  const href = webURL(url);
  return href ? `<a class="${className}" href="${href}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>` : '';
};
const icon = name => {
  const paths = {
    about: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
    publications: '<path d="M12 5v16M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z"/>',
    more: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a23 23 0 0 0 18 0M12 11v4"/>',
    education: '<path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7M22 8v8"/>',
    theme: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    cv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    github: '<path fill="currentColor" stroke="none" d="M12 .7a11.3 11.3 0 0 0-3.57 22.02c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.52-1.3-1.26-1.65-1.26-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.52-2.51-.29-5.15-1.26-5.15-5.59 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.44.11-3 0 0 .95-.3 3.11 1.16a10.8 10.8 0 0 1 5.66 0c2.16-1.46 3.1-1.16 3.1-1.16.62 1.56.23 2.71.12 3a4.35 4.35 0 0 1 1.16 3.03c0 4.34-2.64 5.3-5.16 5.58.4.35.77 1.04.77 2.1v3.09c0 .3.2.65.78.54A11.3 11.3 0 0 0 12 .7Z"/>',
    'google scholar': '<path fill="currentColor" stroke="none" d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM12 0 0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5 12 0Z"/>',
    linkedin: '<path fill="currentColor" stroke="none" d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.96V9.2h2.97v9.55ZM6.45 7.9a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.3 10.85h-2.97V14.1c0-1.11-.02-2.53-1.54-2.53-1.55 0-1.79 1.2-1.79 2.45v4.73H9.48V9.2h2.85v1.31h.04a3.12 3.12 0 0 1 2.81-1.54c3.01 0 3.57 1.98 3.57 4.55v5.23Z"/>',
    link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m4 2 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.link}</svg>`;
};
const cvURL = `${import.meta.env.BASE_URL}cv.pdf?v=${__CV_REVISION__}`;
const profileLink = (href, label, iconName = label.toLowerCase()) => href ? `<a href="${href}" aria-label="${escape(label)}"${href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener noreferrer"'}>
  ${icon(iconName)}<span class="profile-link-label" aria-hidden="true">${escape(label)}</span>
</a>` : '';
const profileLines = lines => lines.map(line => `<span class="profile-line">${escape(line.trim())}</span>`).join(' ');
const papers = [...academic.publications].sort((a, b) => Number(b.year) - Number(a.year));
const sections = [['about', 'About'], ...(papers.length ? [['publications', 'Publications']] : []), ...(academic.education.length ? [['education', 'Education']] : []), ['more', 'More']];
const authorList = authors => authors.map(author => author === profile.name ? `<strong>${escape(author)}</strong>` : escape(author)).join(', ');
const entry = (item, heading = 'h4') => `<article class="timeline-entry">
  <div><${heading}>${escape(item.title)}</${heading}><p class="institution">${escape(item.institution)}</p>
    ${item.description ? `<p class="entry-description">${escape(item.description)}</p>` : ''}
  </div><p class="entry-date">${escape(item.period)}</p>
</article>`;
const moreBlock = (id, title, content) => `<section id="${id}" class="more-block" aria-labelledby="${id}-title"><h3 id="${id}-title">${title}</h3><div class="more-content">${content}</div></section>`;
function serviceEntry(service) {
  const courses = service.courses.map(course => `<li>${escape(course)}</li>`).join('');
  const details = `${courses ? `<ul class="course-list">${courses}</ul>` : ''}${service.description ? `<p class="entry-description">${escape(service.description)}</p>` : ''}`;
  return `<article class="service-entry">
    <p class="service-date">${escape(service.period)}</p>
    <div class="service-content"><h4><span class="service-role">${escape(service.role)}</span>, ${escape(service.institution)}</h4>
      ${details ? `<div class="service-details">${details}</div>` : ''}
    </div>
  </article>`;
}

function publication(paper) {
  const key = paper.title.split(':')[0];
  const asset = media[key];
  const href = webURL(paper.links[0]?.url);
  // New CV entries remain visible even before a thumbnail has been supplied.
  const visual = asset ? `<img src="${import.meta.env.BASE_URL}${escape(asset.image)}" alt="${escape(asset.alt)}" loading="lazy" width="720" height="405" />`
    : `<div class="thumbnail-fallback">${escape(key)}</div>`;
  const thumbnail = href ? `<a class="paper-thumbnail" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escape(paper.title)}">${visual}</a>` : `<div class="paper-thumbnail">${visual}</div>`;
  return `<article class="publication">
    ${thumbnail}<div class="paper-content">
      <h3>${href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${escape(paper.title)}</a>` : escape(paper.title)}</h3>
      <p class="authors">${authorList(paper.authors)}</p><p class="venue">${escape(paper.venue)}</p>
      <div class="paper-links">${paper.links.map(link => external(link.url, link.label)).join('')}</div>
    </div>
  </article>`;
}

document.querySelector('#app').innerHTML = `
  <div class="site-layout">
    <aside class="sidebar" aria-label="Profile and navigation">
      <div class="profile">
        <a class="portrait-link" href="#about" aria-label="Back to introduction"><img class="profile-photo" src="${import.meta.env.BASE_URL}images/profile.jpeg" alt="Portrait of ${escape(profile.name)}" width="472" height="475" fetchpriority="high" /></a>
        <div class="profile-details">
          <a class="profile-name" href="#about">${escape(profile.name)}</a><p class="profile-role">${profileLines(profile.role.split(/,\s*/))}</p><p class="profile-affiliation">${profileLines(profile.affiliation.split(/\s+(?=Laboratory\b)/))}</p>
          <nav class="profile-links" aria-label="Contact and academic profiles">
            ${profile.email ? profileLink(`mailto:${escape(encodeURIComponent(profile.email))}`, 'Email') : ''}
            ${profileLink(escape(cvURL), 'CV (PDF)', 'cv')}
            ${profile.links.map(link => profileLink(webURL(link.url), link.label)).join('')}
          </nav>
        </div>
      </div>
      <nav class="section-nav" aria-label="Main navigation">${sections.map(([id, label], index) => `<a href="#${id}"${index === 0 ? ' aria-current="location"' : ''}>${icon(id)}<span>${label}</span></a>`).join('')}</nav>
      ${swimmer}
      <button class="theme-toggle" type="button" aria-pressed="false"><span class="theme-label">Dark mode</span>${icon('theme')}</button>
    </aside>
    <main id="main" class="site-content">
      <section id="about" class="about-section" aria-labelledby="about-title">
        <h1 id="about-title">Hi, I'm ${escape(profile.name.split(' ')[0])}<span class="greeting-dot" aria-hidden="true">.</span></h1>
        <div class="biography">${profile.about.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div>
        <div class="research-interests"><h2>Research interests</h2><div>${profile.interests.map(interest => `<span>${escape(interest)}</span>`).join('')}</div></div>
      </section>
      ${papers.length ? `<section id="publications" class="content-section" aria-labelledby="publications-title">
        <div class="section-heading"><h2 id="publications-title">${icon('publications')}Publications</h2></div>
        <div class="publication-list">${papers.map(publication).join('')}</div>
      </section>` : ''}
      ${academic.education.length ? `<section id="education" class="content-section" aria-labelledby="education-title">
        <div class="section-heading"><h2 id="education-title">${icon('education')}Education</h2></div>
        <div class="education-content">${academic.education.map(item => entry(item, 'h3')).join('')}</div>
      </section>` : ''}
      <section id="more" class="content-section more-section" aria-labelledby="more-title">
        <div class="section-heading"><h2 id="more-title">${icon('more')}More</h2><a class="text-link" href="${cvURL}" target="_blank" rel="noopener">Full CV <span aria-hidden="true">↗</span></a></div>
        ${academic.experience.length ? moreBlock('research', 'Research Experience', academic.experience.map(item => entry(item)).join('')) : ''}
        ${academic.services.length ? moreBlock('services', 'Academic Services', academic.services.map(serviceEntry).join('')) : ''}
        ${academic.scholarships.length ? moreBlock('scholarships', 'Scholarships', academic.scholarships.map(item => entry(item)).join('')) : ''}
      </section>
      <footer class="site-footer"><span>© ${new Date().getFullYear()} ${escape(profile.name)}</span><div class="footer-links"><a class="download-button" href="${cvURL}" download="Myeongwon_Jung_CV.pdf">Download CV ↓</a><a href="#about">Back to top ↑</a></div></footer>
    </main>
  </div>
`;

const updateSwimmer = setupSwimmer();

const profileLinks = document.querySelector('.profile-links');
profileLinks.addEventListener('keydown', event => {
  if (event.key === 'Escape') event.target.closest('a')?.setAttribute('data-label-dismissed', '');
});
profileLinks.querySelectorAll('a').forEach(link => {
  for (const event of ['pointerenter', 'focus']) {
    link.addEventListener(event, () => link.removeAttribute('data-label-dismissed'));
  }
});

const themeButton = document.querySelector('.theme-toggle');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.querySelector('.theme-label').textContent = dark ? 'Light mode' : 'Dark mode';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#111b28' : '#fcfdff';
}
updateThemeButton();
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('homepage-theme', theme); } catch { /* Theme still works without storage. */ }
  updateThemeButton();
});

const navigation = [...document.querySelectorAll('.section-nav a')];
const trackedSections = sections.map(([id]) => document.getElementById(id));
let scrollScheduled = false;
function updateNavigation() {
  updateSwimmer();
  const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 3;
  const active = atBottom ? trackedSections.at(-1)
    : [...trackedSections].reverse().find(section => section.getBoundingClientRect().top <= 110) || trackedSections[0];
  navigation.forEach(link => {
    if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollScheduled = false;
}
function scheduleNavigationUpdate() {
  if (!scrollScheduled) { requestAnimationFrame(updateNavigation); scrollScheduled = true; }
}
addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
addEventListener('resize', scheduleNavigationUpdate);
addEventListener('hashchange', scheduleNavigationUpdate);
addEventListener('pageshow', scheduleNavigationUpdate);
new ResizeObserver(scheduleNavigationUpdate).observe(document.querySelector('main'), { box: 'border-box' });
updateNavigation();
