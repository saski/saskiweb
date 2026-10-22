const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');

test('every current public page offers the same consent-controlled measurement', () => {
  const notes = JSON.parse(read('content/notes.json')).filter(note => note.status === 'published');
  const pages = ['index.htm', 'cv/index.html', 'notes/index.html', 'privacy.html',
    ...notes.map(note => `notes/${note.slug}/index.html`)];
  for (const page of pages) {
    const html = read(page);
    assert.equal((html.match(/src="\/js\/site-analytics\.js\?[^" ]+" defer/g) || []).length, 1, page);
    assert.match(html, /href="\/css\/site-analytics\.css\?/);
    assert.doesNotMatch(html, /urchin|UA-1823063|googletagmanager\.com|google-analytics\.com/);
    assert.match(html, /href="\/privacy\.html"/, page);
  }
  assert.doesNotMatch(read('index.htm.old.htm'), /urchin|UA-1823063/);
});

test('privacy information is available without accepting analytics or running JavaScript', () => {
  const html = read('privacy.html');
  for (const phrase of ['Google Analytics', 'Cloudflare', '90 days', '180 days', 'Analytics settings']) {
    assert.ok(html.includes(phrase), phrase);
  }
  assert.match(html, /mailto:/);
  assert.match(html, /https:\/\/policies\.google\.com\/privacy/);
});
