const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const cvPath = path.join(__dirname, '..', 'cv', 'index.html');
const socialCardPath = path.join(__dirname, '..', 'cv', 'og.png');
const portraitPath = path.join(__dirname, '..', 'cv', 'nacho-viejo.png');

function loadCv() {
  assert.ok(existsSync(cvPath), 'The public CV page should exist at /cv/');
  return readFileSync(cvPath, 'utf8');
}

test('publishes a semantic English CV at the canonical route', () => {
  const html = loadCv();

  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Nacho Viejo — Engineering Manager<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.saski\.com\/cv\/">/);
  assert.match(html, /<main\b/);
  assert.match(html, /<h1[^>]*>\s*Nacho Viejo\s*<\/h1>/);
  assert.match(html, /<section[^>]+aria-labelledby="experience-heading"/);
});

test('keeps the public CV generic and evidence-based', () => {
  const html = loadCv();

  assert.doesNotMatch(html, /Technosylva|Tecnosilva|Datadog|Sapira/i);
  assert.match(html, /7–13 engineers/);
  assert.match(html, /378,000 incremental orders annually/);
  assert.match(html, /23%/);
  assert.match(html, /90–99%/);
  assert.match(html, /70%/);
  assert.match(html, /30%/);
  assert.match(html, /Computer Engineering studies \(Systems\)/);
});

test('provides direct contact links and print-friendly presentation', () => {
  const html = loadCv();

  assert.match(html, /href="mailto:nacho@saski\.com"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/saski\/"/);
  assert.match(html, /href="https:\/\/github\.com\/saski"/);
  assert.match(html, /@media print/);
  assert.match(html, /@media \(max-width: 760px\)/);
  assert.match(html, /class="print-action"/);
});

test('uses a professional portrait online without adding it to the printed CV', () => {
  const html = loadCv();

  assert.ok(existsSync(portraitPath), 'The public CV portrait should exist');
  assert.match(html, /<figure class="portrait"[^>]*>/);
  assert.match(html, /src="nacho-viejo\.png"/);
  assert.match(html, /alt="Portrait of Nacho Viejo"/);
  assert.match(html, /\.portrait\s*\{\s*display:\s*none;/);
});

test('provides a site-specific social preview', () => {
  const html = loadCv();

  assert.ok(existsSync(socialCardPath), 'The CV social preview image should exist');
  assert.match(html, /property="og:title" content="Nacho Viejo — Engineering Manager"/);
  assert.match(html, /property="og:image" content="https:\/\/www\.saski\.com\/cv\/og\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});
