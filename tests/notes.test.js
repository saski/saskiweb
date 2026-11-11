const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const os = require('node:os');

const root = path.join(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');

test('readers can discover and read all notes without JavaScript or LinkedIn', () => {
  const catalog = JSON.parse(read('content/notes.json'));
  const published = catalog.filter(note => note.status === 'published');
  const index = read('notes/index.html');
  const links = [...index.matchAll(/<h2><a href="(\/notes\/[^"/]+\/)"/g)].map(match => match[1]);
  assert.equal(links.length, published.length);
  assert.equal(new Set(links).size, published.length);
  for (const url of links) {
    const html = read(`${url.slice(1)}index.html`);
    assert.match(html, /<article\b/);
    assert.match(html, /class="note-body"/);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.saski\\.com${url}">`));
    assert.doesNotMatch(html, /<iframe|platform\.linkedin|lnkd\.in\//);
  }
  assert.match(read('index.htm'), /href="\/notes\/"/);
  assert.match(read('cv/index.html'), /href="\/notes\/"/);
});

test('preserves original dates, languages and source attribution across pages and RSS', () => {
  const catalog = JSON.parse(read('content/notes.json'));
  const published = catalog.filter(note => note.status === 'published');
  const feed = read('notes/feed.xml');
  const sitemap = read('sitemap.xml');
  assert.equal((feed.match(/<item>/g) || []).length, published.length);
  for (const note of published) {
    const html = read(`notes/${note.slug}/index.html`);
    assert.match(html, new RegExp(`<html lang="${note.lang}">`));
    assert.ok(html.includes(`<time datetime="${note.original_published_at}">`));
    if (note.origin === 'website') {
      assert.match(html, /Originally published on saski\.com/);
      assert.doesNotMatch(html, /Original &amp; conversation on LinkedIn/);
    } else {
      assert.ok(html.includes(note.source_url));
    }
    assert.ok(feed.includes(new Date(note.original_published_at).toUTCString()));
    assert.ok(feed.includes(`https://www.saski.com/notes/${note.slug}/`));
    assert.ok(sitemap.includes(`https://www.saski.com/notes/${note.slug}/`));
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    assert.match(html, /application\/ld\+json/);
  }
});

test('publishes the reviewed editions with study scope and concrete recognition context', () => {
  const learning = read('notes/learning-with-ai/index.html');
  assert.match(learning, /17 percentage points/);
  assert.match(learning, /52/);
  assert.match(learning, /Trio/);
  assert.match(learning, /not statistically significant/);
  assert.doesNotMatch(learning, /17% lower/);
  assert.match(read('notes/teams-that-grow/index.html'), /Make It Happen Spirit Award/);
  assert.match(read('notes/menos-software/index.html'), /Eduardo Ferro Aldama/);
  assert.ok(existsSync(path.join(root, 'notes/assets/bookshelf-2026-07-25.jpeg')));
  assert.ok(existsSync(path.join(root, 'notes/assets/notes-2026-10-06.png')));
});

test('readers can open the measured Review Capacity replay just below the first chart', () => {
  const article = read('notes/review-capacity-replay/index.html');
  const afterFirstChart = article.split('</figure>')[1];
  const paragraph = afterFirstChart.match(/^\s*<p>([\s\S]*?)<\/p>/)?.[1];
  const link = paragraph?.match(/<a\b[^>]*\bdata-analytics="demo"[^>]*>/)?.[0];
  assert.ok(link, 'The paragraph below the first chart must contain the demo link');
  const href = link.match(/\bhref="([^"]+)"/)[1];
  const demo = new URL(href, 'https://www.saski.com');
  assert.equal(demo.origin + demo.pathname, 'https://www.saski.com/notes/assets/review-capacity-demo-g01.html');
  assert.equal(demo.search, '');
  assert.equal(demo.hash, '#replay-section');
  assert.ok(read(demo.pathname.slice(1)).includes('id="replay-section"'));
});

test('the public demo includes the verified G02 comparison alongside the original replay', () => {
  const html = read('notes/assets/review-capacity-demo-g01.html');
  const match = html.match(/<script type="application\/json" id="rework-evidence">([\s\S]*?)<\/script>/);
  assert.ok(match, 'The demo must embed its saved G02 evidence');
  const evidence = JSON.parse(match[1]);
  assert.equal(evidence.model_version, 'review-rework-v1');
  assert.equal(evidence.report_sha256, '3f1f1dff0790d109c7f814377cb0acf3088829d2c0ecff78317b7e7eb9577097');
  assert.deepEqual(evidence.policies.map(policy => policy.drain.tick), [188, 192]);
  assert.deepEqual(evidence.policies.map(policy => policy.tasks.length), [24, 24]);
  const deltas = evidence.comparison.tasks.map(task => task.turnaround_delta);
  assert.equal(deltas.filter(delta => delta < 0).length, 5);
  assert.equal(deltas.filter(delta => delta > 0).length, 15);
  assert.equal(deltas.filter(delta => delta === 0).length, 4);
  assert.ok(html.includes('id="rework-section"'));
  assert.ok(html.includes('id="replay-section"'));
  assert.doesNotMatch(html, /__REWORK_/);
});

test('the demo analytics bootstrap stays offline outside the production HTTPS hosts', () => {
  const html = read('notes/assets/review-capacity-demo-g01.html');
  const bootstrap = html.match(/<script id="demo-analytics-bootstrap">([\s\S]*?)<\/script>/);
  assert.ok(bootstrap, 'The canonical demo must contain its guarded analytics bootstrap');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.saski\.com\/notes\/assets\/review-capacity-demo-g01\.html">/);
  const bootstrapStart = bootstrap.index;
  const scriptStarts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match.index);
  assert.ok(bootstrapStart > html.indexOf('<body>'), 'Bootstrap must run after the page body starts');
  assert.equal(bootstrapStart, scriptStarts.at(-1), 'Bootstrap must run after the replay scripts');

  function appendedFor(address) {
    const appended = [];
    const document = {
      head: { appendChild(element) { appended.push(element); } },
      createElement(tagName) { return { tagName }; },
    };
    vm.runInNewContext(bootstrap[1], { document, location: new URL(address) });
    return appended;
  }

  assert.deepEqual(appendedFor('file:///tmp/review-capacity-demo-g01.html'), []);
  assert.deepEqual(appendedFor('http://localhost:8877/review-capacity-demo-g01.html'), []);
  assert.deepEqual(appendedFor('https://preview.saski.com/notes/assets/review-capacity-demo-g01.html'), []);
  const productionAssets = appendedFor('https://www.saski.com/notes/assets/review-capacity-demo-g01.html');
  assert.equal(productionAssets.length, 1);
  assert.deepEqual(productionAssets.map(({ tagName, rel, href, src, defer }) => ({ tagName, rel, href, src, defer })), [
    { tagName: 'script', rel: undefined, href: undefined, src: '/js/site-analytics.js?v=20261111-no-settings', defer: true },
  ]);
});

test('web editions expose their author and stable update dates independently of LinkedIn dates', async t => {
  const { buildNotes } = await import('../scripts/build-notes.mjs');
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'saski-notes-dates-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const contentDir = path.join(fixture, 'content');
  const outputDir = path.join(fixture, 'public');
  mkdirSync(path.join(contentDir, 'notes'), { recursive: true });
  const [original] = JSON.parse(read('content/notes.json'));
  const note = {
    ...original,
    original_published_at: '2026-10-04T11:58:56.351Z',
    imported_at: '2026-10-06',
    updated_at: '2026-10-06',
    web_updated_at: '2026-10-08'
  };
  const pages = { '/': '2026-10-06', '/cv/': '2026-10-06', '/notes/': '2026-10-08' };
  writeFileSync(path.join(contentDir, 'pages.json'), JSON.stringify(pages));
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([note]));
  writeFileSync(path.join(contentDir, 'notes', `${note.slug}.md`), 'Published writing.');

  buildNotes({ contentDir, outputDir });
  const sitemap = readFileSync(path.join(outputDir, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes(`<loc>https://www.saski.com/notes/${note.slug}/</loc><lastmod>2026-10-08</lastmod>`));
  for (const [url, modified] of Object.entries(pages)) {
    assert.ok(sitemap.includes(`<loc>https://www.saski.com${url}</loc><lastmod>${modified}</lastmod>`));
  }
  const html = readFileSync(path.join(outputDir, 'notes', note.slug, 'index.html'), 'utf8');
  const articleHeader = html.match(/<header>([\s\S]*?)<\/header>/)[1];
  assert.match(articleHeader, /By Nacho Viejo/);
  assert.ok(articleHeader.includes(`<time datetime="${note.original_published_at}">`));
  assert.match(articleHeader, /Web edition updated <time datetime="2026-10-08">/);
  const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(structured.datePublished, note.original_published_at);
  assert.equal(structured.dateModified, note.web_updated_at);
  assert.equal(structured.author.url, 'https://www.saski.com/cv/');
  assert.ok(readFileSync(path.join(outputDir, 'notes/feed.xml'), 'utf8').includes(new Date(note.original_published_at).toUTCString()));

  buildNotes({ contentDir, outputDir });
  assert.equal(readFileSync(path.join(outputDir, 'sitemap.xml'), 'utf8'), sitemap);
});

test('new drafts never enter public output and duplicate source imports fail', async t => {
  const { buildNotes } = await import('../scripts/build-notes.mjs');
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'saski-notes-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const contentDir = path.join(fixture, 'content');
  const outputDir = path.join(fixture, 'public');
  mkdirSync(path.join(contentDir, 'notes'), { recursive: true });
  const [published] = JSON.parse(read('content/notes.json'));
  const draft = { ...published, id: 'draft-source', slug: 'private-draft', status: 'draft', title: 'PRIVATE DRAFT' };
  writeFileSync(path.join(contentDir, 'pages.json'), read('content/pages.json'));
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([published, draft]));
  writeFileSync(path.join(contentDir, 'notes', `${published.slug}.md`), 'Published writing.');
  writeFileSync(path.join(contentDir, 'notes', `${draft.slug}.md`), 'PRIVATE DRAFT');
  assert.equal(buildNotes({ contentDir, outputDir }), 1);
  assert.equal(existsSync(path.join(outputDir, 'notes/private-draft/index.html')), false);
  for (const file of ['notes/index.html', 'notes/feed.xml', 'sitemap.xml']) {
    assert.doesNotMatch(readFileSync(path.join(outputDir, file), 'utf8'), /private-draft|PRIVATE DRAFT/);
  }
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([published, { ...published, slug: 'duplicate' }]));
  assert.throws(() => buildNotes({ contentDir, outputDir }), /duplicate note/);
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([{ ...published, status: 'draft' }]));
  assert.throws(() => buildNotes({ contentDir, outputDir }), /explicit withdrawal/);
});

test('website originals publish without invented LinkedIn provenance', async t => {
  const { buildNotes } = await import('../scripts/build-notes.mjs');
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'saski-notes-website-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const contentDir = path.join(fixture, 'content');
  const outputDir = path.join(fixture, 'public');
  mkdirSync(path.join(contentDir, 'notes'), { recursive: true });

  const [legacy] = JSON.parse(read('content/notes.json'));
  const websiteNote = {
    id: 'web-first',
    slug: 'web-first',
    title: 'Website original',
    summary: 'A website original',
    kind: 'Project update',
    topic: 'Agents & systems',
    status: 'published',
    lang: 'en',
    origin: 'website',
    original_published_at: '2026-10-15T10:00:00Z',
    imported_at: '2026-10-15',
    web_updated_at: '2026-10-15'
  };

  const pages = { '/': '2026-10-15', '/cv/': '2026-10-15', '/notes/': '2026-10-15' };
  writeFileSync(path.join(contentDir, 'pages.json'), JSON.stringify(pages));
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([legacy, websiteNote]));
  writeFileSync(path.join(contentDir, 'notes', `${legacy.slug}.md`), 'Legacy content.');
  writeFileSync(path.join(contentDir, 'notes', `${websiteNote.slug}.md`), 'Website original content.');

  assert.equal(buildNotes({ contentDir, outputDir }), 2);

  const websiteHtml = readFileSync(path.join(outputDir, 'notes', websiteNote.slug, 'index.html'), 'utf8');
  assert.doesNotMatch(websiteHtml, /Originally published on LinkedIn/);
  assert.doesNotMatch(websiteHtml, /Original &amp; conversation on LinkedIn/);
  assert.doesNotMatch(websiteHtml, /undefined/);
  assert.match(websiteHtml, /Originally published on saski\.com/);

  const websiteStructured = JSON.parse(websiteHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(websiteStructured.mainEntityOfPage, `https://www.saski.com/notes/${websiteNote.slug}/`);
  assert.equal(websiteStructured.isBasedOn, undefined);

  const feed = readFileSync(path.join(outputDir, 'notes/feed.xml'), 'utf8');
  const items = feed.match(/<item>[\s\S]*?<\/item>/g);
  const websiteItem = items.find(item => item.includes(`https://www.saski.com/notes/${websiteNote.slug}/`));
  assert.doesNotMatch(websiteItem, /Originally published on LinkedIn/);
  assert.doesNotMatch(websiteItem, /linkedin\.com/);

  const legacyHtml = readFileSync(path.join(outputDir, 'notes', legacy.slug, 'index.html'), 'utf8');
  assert.ok(legacyHtml.includes(legacy.source_url));

  const legacyItem = items.find(item => item.includes(`https://www.saski.com/notes/${legacy.slug}/`));
  assert.ok(legacyItem.includes(legacy.source_url));
});

test('rejects unknown origin and website notes with LinkedIn source_url', async t => {
  const { buildNotes } = await import('../scripts/build-notes.mjs');
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'saski-notes-validation-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const contentDir = path.join(fixture, 'content');
  const outputDir = path.join(fixture, 'public');
  mkdirSync(path.join(contentDir, 'notes'), { recursive: true });

  const validNote = {
    id: 'valid-note',
    slug: 'valid-note',
    title: 'Valid note',
    summary: 'A valid note',
    kind: 'Project update',
    topic: 'Agents & systems',
    status: 'published',
    lang: 'en',
    origin: 'website',
    original_published_at: '2026-10-15T10:00:00Z',
    imported_at: '2026-10-15',
    web_updated_at: '2026-10-15'
  };

  const pages = { '/': '2026-10-15', '/cv/': '2026-10-15', '/notes/': '2026-10-15' };
  writeFileSync(path.join(contentDir, 'pages.json'), JSON.stringify(pages));

  const unknownOrigin = { ...validNote, id: 'unknown', slug: 'unknown', origin: 'unknown' };
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([unknownOrigin]));
  writeFileSync(path.join(contentDir, 'notes', `${unknownOrigin.slug}.md`), 'Content.');
  assert.throws(() => buildNotes({ contentDir, outputDir }), /origin/);

  const websiteWithLinkedIn = { ...validNote, id: 'web-linkedin', slug: 'web-linkedin', source_url: 'https://www.linkedin.com/posts/example' };
  writeFileSync(path.join(contentDir, 'notes.json'), JSON.stringify([websiteWithLinkedIn]));
  writeFileSync(path.join(contentDir, 'notes', `${websiteWithLinkedIn.slug}.md`), 'Content.');
  assert.throws(() => buildNotes({ contentDir, outputDir }), /source_url/);
});
