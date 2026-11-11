const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');

test('current public pages share measurement without loading settings UI styles', () => {
  const notes = JSON.parse(read('content/notes.json')).filter(note => note.status === 'published');
  const pages = ['index.htm', 'cv/index.html', 'notes/index.html', 'privacy.html',
    ...notes.map(note => `notes/${note.slug}/index.html`)];
  for (const page of pages) {
    const html = read(page);
    assert.equal((html.match(/src="\/js\/site-analytics\.js\?[^" ]+" defer/g) || []).length, 1, page);
    assert.doesNotMatch(html, /site-analytics\.css|Analytics settings/);
    assert.doesNotMatch(html, /urchin|UA-1823063|googletagmanager\.com|google-analytics\.com/);
    assert.match(html, /href="\/privacy\.html"/, page);
  }
  assert.doesNotMatch(read('index.htm.old.htm'), /urchin|UA-1823063/);
});

test('privacy information explains automatic measurement without relying on a settings panel', () => {
  const html = read('privacy.html');
  for (const phrase of ['Google Analytics', 'Cloudflare', '90 days', 'enabled by default']) {
    assert.ok(html.includes(phrase), phrase);
  }
  assert.match(html, /mailto:/);
  assert.match(html, /https:\/\/policies\.google\.com\/privacy/);
  assert.doesNotMatch(html, /Analytics settings|Accept analytics|if you accept/);
});

test('home and Notes expose no visible CV links while the CV remains available', () => {
  const notes = JSON.parse(read('content/notes.json')).filter(note => note.status === 'published');
  for (const page of ['index.htm', 'notes/index.html', ...notes.map(note => `notes/${note.slug}/index.html`)]) {
    assert.doesNotMatch(read(page), /<a\b[^>]*href="(?:https:\/\/www\.saski\.com)?\/cv\//, page);
  }
  assert.match(read('cv/index.html'), /class="download-action"/);
});
