const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const os = require('node:os');

const root = path.join(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');

test('readers can discover and read all seven notes without JavaScript or LinkedIn', () => {
  const index = read('notes/index.html');
  const links = [...index.matchAll(/<h2><a href="(\/notes\/[^"/]+\/)"/g)].map(match => match[1]);
  assert.equal(links.length, 7);
  assert.equal(new Set(links).size, 7);
  for (const url of links) {
    const html = read(`${url.slice(1)}index.html`);
    assert.match(html, /<article\b/);
    assert.match(html, /class="note-body"/);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.saski\\.com${url}">`));
    assert.match(html, /https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:activity:\d+\//);
    assert.doesNotMatch(html, /<iframe|platform\.linkedin|lnkd\.in\//);
  }
  assert.match(read('index.htm'), /href="\/notes\/"/);
  assert.match(read('cv/index.html'), /href="\/notes\/"/);
});

test('preserves original dates, languages and source attribution across pages and RSS', () => {
  const catalog = JSON.parse(read('content/notes.json'));
  const feed = read('notes/feed.xml');
  const sitemap = read('sitemap.xml');
  assert.equal((feed.match(/<item>/g) || []).length, 7);
  for (const note of catalog.filter(note => note.status === 'published')) {
    const html = read(`notes/${note.slug}/index.html`);
    assert.match(html, new RegExp(`<html lang="${note.lang}">`));
    assert.ok(html.includes(`<time datetime="${note.original_published_at}">`));
    assert.ok(html.includes(note.source_url));
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

test('new drafts never enter public output and duplicate source imports fail', async t => {
  const { buildNotes } = await import('../scripts/build-notes.mjs');
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'saski-notes-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const contentDir = path.join(fixture, 'content');
  const outputDir = path.join(fixture, 'public');
  mkdirSync(path.join(contentDir, 'notes'), { recursive: true });
  const [published] = JSON.parse(read('content/notes.json'));
  const draft = { ...published, id: 'draft-source', slug: 'private-draft', status: 'draft', title: 'PRIVATE DRAFT' };
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
