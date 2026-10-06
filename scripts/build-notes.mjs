import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://www.saski.com';
const topics = ['Agents & systems', 'Engineering', 'People & product'];
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const date = value => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid'
}).format(new Date(value));
const route = note => `/notes/${note.slug}/`;
const topicKey = topic => topic.toLowerCase().replace(' & ', '-').replaceAll(' ', '-');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function document({ title, description, url, lang = 'en', note, main, index = false }) {
  const structured = note ? {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: note.title, description: note.summary, inLanguage: lang,
    datePublished: note.original_published_at,
    dateModified: note.web_updated_at,
    author: { '@type': 'Person', name: 'Nacho Viejo', url: `${origin}/cv/` },
    mainEntityOfPage: url, isBasedOn: note.source_url
  } : {
    '@context': 'https://schema.org', '@type': 'Blog', name: title,
    description, url, author: { '@type': 'Person', name: 'Nacho Viejo', url: `${origin}/cv/` }
  };
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="author" content="Nacho Viejo">
  <link rel="canonical" href="${escape(url)}">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <link rel="alternate" type="application/rss+xml" title="Notes — Nacho Viejo" href="/notes/feed.xml">
  <link rel="stylesheet" href="/css/notes.css?v=20261006-reference-notes">
  <link rel="stylesheet" href="/css/site-header.css?v=20261006">
${index ? '  <link rel="preload" href="/notes/assets/caveat-notes-500.woff2" as="font" type="font/woff2" crossorigin>\n' : ''}
  <meta property="og:type" content="${note ? 'article' : 'website'}">
  <meta property="og:site_name" content="saski — Notes">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${escape(url)}">
  <meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_GB'}">
  <meta property="og:image" content="${origin}/notes/assets/notes-2026-10-06.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Notes. On people, software and learning in public. Nacho Viejo, saski.com.">
  <meta name="twitter:card" content="summary_large_image">
${note ? `  <meta property="article:published_time" content="${note.original_published_at}">\n  <meta property="article:modified_time" content="${note.web_updated_at}">\n` : ''}  <script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>
${index ? '  <script src="/js/notes.js?v=20261006" defer></script>\n' : ''}</head>
<body>
  <a class="skip-link" href="#main" lang="en">Skip to content</a>
  <header class="site-header" aria-label="Site links" lang="en">
    <a class="site-mark" href="/" aria-label="saski home">saski</a>
    <nav class="social-links" aria-label="Social links">
      <a href="/notes/" aria-label="Notes on people and software"${index ? ' aria-current="page"' : ''}><span>Notes</span></a>
      <a href="/cv/" aria-label="Professional CV"><span>CV</span></a>
      <a href="https://github.com/saski" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
        <span>GitHub</span>
      </a>
      <a href="https://www.linkedin.com/in/saski/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
        <span>LinkedIn</span>
      </a>
    </nav>
  </header>
  <div class="page-shell">
    <main id="main" tabindex="-1">${main}</main>
    <footer class="site-footer" lang="en">
      <span>Nacho Viejo · Madrid</span>
      <nav aria-label="Follow my writing"><a href="/notes/feed.xml">RSS</a><a href="https://www.linkedin.com/in/saski/" rel="me">Elsewhere: LinkedIn ↗</a></nav>
    </footer>
  </div>
</body>
</html>
`;
}

function metadata(note) {
  return `<p class="note-meta" lang="en"><time datetime="${note.original_published_at}">${date(note.original_published_at)}</time><span class="note-topic">${escape(note.topic)}</span><span><abbr title="${note.lang === 'es' ? 'Spanish' : 'English'}">${note.lang.toUpperCase()}</abbr> · ${escape(note.kind)}</span></p>`;
}

function indexPage(notes) {
  return document({
    title: 'Notes — Nacho Viejo',
    description: 'Notes on people, software and learning in public, by Nacho Viejo.',
    url: `${origin}/notes/`, index: true,
    main: `
      <header class="intro">
        <h1><span class="title-hand">Notes</span> on people, software and learning in public</h1>
      </header>
      <nav class="filters" aria-label="Filter notes by topic" hidden>
        <button type="button" data-topic="all" aria-pressed="true">All</button>
        ${topics.map(topic => `<button type="button" data-topic="${topicKey(topic)}" aria-pressed="false">${escape(topic)}</button>`).join('\n        ')}
      </nav>
      <p class="sr-only" id="filter-status" role="status" aria-live="polite"></p>
      <section class="note-index" aria-label="Notes, newest first">
        ${notes.map(note => `<article class="note-entry" data-topic="${topicKey(note.topic)}" lang="${note.lang}">
          ${metadata(note)}
          <div><h2><a href="${route(note)}">${escape(note.title)}</a></h2><p class="summary">${escape(note.summary)}</p></div>
        </article>`).join('\n        ')}
      </section>`
  });
}

function articlePage(note, notes) {
  const related = notes.find(item => item.slug === note.related);
  return document({ title: `${note.title} — Nacho Viejo`, description: note.summary,
    url: `${origin}${route(note)}`, lang: note.lang, note,
    main: `
      <article class="reader">
        <a class="back-link" href="/notes/" lang="en">← All notes</a>
        <header>${metadata(note)}<h1>${escape(note.title)}</h1>
          <p class="provenance" lang="en">By <a href="/cv/" rel="author">Nacho Viejo</a> · Originally published on LinkedIn<br>Web edition updated <time datetime="${note.web_updated_at}">${date(note.web_updated_at)}</time></p>
        </header>
        <div class="note-body">${note.body}${note.image ? `
          <figure><img src="${escape(note.image.src)}" width="${note.image.width}" height="${note.image.height}" alt="${escape(note.image.alt)}" decoding="async"><figcaption>${escape(note.image.caption)}</figcaption></figure>` : ''}</div>
        <footer class="references">
          ${note.editorial_note ? `<p class="editorial-note" lang="${note.lang === 'es' ? 'es' : 'en'}">${escape(note.editorial_note)}</p>` : ''}
          <p><a href="${escape(note.source_url)}" lang="en">Original &amp; conversation on LinkedIn ↗</a></p>
          ${related ? `<p class="related"><span lang="en">Related note</span><a href="${route(related)}" lang="${related.lang}">${escape(related.title)} →</a></p>` : ''}
        </footer>
      </article>` });
}

function feed(notes) {
  const cdata = text => `<![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Notes — Nacho Viejo</title>
  <link>${origin}/notes/</link>
  <description>On people, software and learning in public.</description>
  <atom:link href="${origin}/notes/feed.xml" rel="self" type="application/rss+xml"/>
  ${notes.map(note => `<item>
    <title>${escape(note.title)}</title>
    <link>${origin}${route(note)}</link>
    <guid isPermaLink="true">${origin}${route(note)}</guid>
    <pubDate>${new Date(note.original_published_at).toUTCString()}</pubDate>
    <category>${escape(note.topic)}</category>
    <description>${cdata(note.body + (note.image ? `<p><img src="${origin}${note.image.src}" alt="${escape(note.image.alt)}"></p>` : '') + `<p><a href="${note.source_url}">Original &amp; conversation on LinkedIn</a></p>`)}</description>
  </item>`).join('\n  ')}
</channel>
</rss>
`;
}

export function buildNotes({ contentDir = path.join(root, 'content'), outputDir = root } = {}) {
  const catalog = JSON.parse(readFileSync(path.join(contentDir, 'notes.json'), 'utf8'));
  const pages = JSON.parse(readFileSync(path.join(contentDir, 'pages.json'), 'utf8'));
  const pageUrls = ['/', '/cv/', '/notes/'];
  for (const url of pageUrls) {
    if (!validDate(pages[url])) throw new Error(`Invalid page modification date: ${url}`);
  }
  const ids = new Set();
  const slugs = new Set();
  for (const note of catalog) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.slug) || ids.has(note.id) || slugs.has(note.slug)) {
      throw new Error(`Invalid or duplicate note: ${note.slug}`);
    }
    ids.add(note.id); slugs.add(note.slug);
    if (!['draft', 'published'].includes(note.status)) throw new Error(`Unknown status: ${note.slug}`);
    if (note.status === 'draft' && existsSync(path.join(outputDir, 'notes', note.slug, 'index.html'))) {
      throw new Error(`Previously published note needs an explicit withdrawal: ${note.slug}`);
    }
    if (note.status !== 'published') continue;
    if (!['en', 'es'].includes(note.lang) || !topics.includes(note.topic)
      || !/^\d{4}-\d{2}-\d{2}T/.test(note.original_published_at)
      || Number.isNaN(Date.parse(note.original_published_at))
      || !/^https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:activity:\d+\/$/.test(note.source_url)) {
      throw new Error(`Invalid publication metadata: ${note.slug}`);
    }
    if (!validDate(note.imported_at) || !validDate(note.web_updated_at)
      || note.web_updated_at < note.imported_at
      || (note.updated_at && (!validDate(note.updated_at) || note.web_updated_at < note.updated_at))) {
      throw new Error(`Invalid web modification date: ${note.slug}`);
    }
  }
  const notes = catalog.filter(note => note.status === 'published')
    .sort((a, b) => b.original_published_at.localeCompare(a.original_published_at))
    .map(note => ({ ...note, body: marked.parse(readFileSync(path.join(contentDir, 'notes', `${note.slug}.md`), 'utf8'), { async: false }) }));
  const save = (file, text) => {
    const target = path.join(outputDir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text.replace(/^[ \t]+$/gm, ''));
  };
  save('notes/index.html', indexPage(notes));
  for (const note of notes) save(`notes/${note.slug}/index.html`, articlePage(note, notes));
  save('notes/feed.xml', feed(notes));
  const urls = [...pageUrls.map(url => ({ url, lastmod: pages[url] })),
    ...notes.map(note => ({ url: route(note), lastmod: note.web_updated_at }))];
  save('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ url, lastmod }) => `  <url><loc>${origin}${url}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  return notes.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${buildNotes()} notes, the index, RSS and sitemap.`);
}
