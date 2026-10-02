const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const test = require('node:test');

const cvPath = path.join(__dirname, '..', 'cv', 'index.html');
const socialCardPath = path.join(__dirname, '..', 'cv', 'og.png');
const portraitPath = path.join(__dirname, '..', 'cv', 'nacho-viejo.png');
const robotsPath = path.join(__dirname, '..', 'robots.txt');
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
const homePath = path.join(__dirname, '..', 'index.htm');

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
  assert.match(html, /6–15 engineers/);
  assert.doesNotMatch(html, /7–13 engineers|Programme not completed/);
  assert.match(html, /Escuela Oficial de Idiomas de Oviedo/);
  assert.match(html, /promotion to Senior/);
  assert.match(html, /interview calibration/);
  assert.match(html, /378,000 incremental orders annually/);
  assert.match(html, /23%/);
  assert.match(html, /90–99%/);
  assert.match(html, /70%/);
  assert.match(html, /30%/);
  assert.match(html, /Computer Engineering \(Systems\)/);
  assert.doesNotMatch(html, /Computer Engineering studies/i);
});

test('aligns employment chronology and leadership outcomes with the reviewed PDF', () => {
  const html = loadCv();

  assert.match(html, /Jan 2023 — Jun 2026/);
  assert.doesNotMatch(html, /Jan 2023 — Present/);
  assert.match(html, /responsibilities began in August 2022/);
  assert.match(html, /formal title transition in January 2023/);
  assert.match(html, /100% of production traffic/);
  assert.match(html, /early June against an October plan/);
  assert.match(html, /restored the LCP baseline/);
  assert.match(html, /approximately 70% less CloudFront egress/);
  assert.match(html, /approximately 30% lower daily infrastructure costs/);
  assert.match(html, /Owned hiring decisions for my team jointly with HR/);
  assert.match(html, /interview calibration in 2023/);
  assert.match(html, /Engineer II/);
  assert.match(html, /Fluent\. Everyday working language for eight years/);
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

test('offers the current reviewed CV as a direct PDF download', () => {
  const html = loadCv();
  const fileName = 'Nacho_Viejo_Engineering_Manager_CV_2026-10-02.pdf';
  const pdfPath = path.join(__dirname, '..', 'cv', fileName);

  assert.ok(existsSync(pdfPath), 'The download must resolve to the reviewed CV');
  assert.match(html, /class="download-action"[^>]+href="Nacho_Viejo_Engineering_Manager_CV_2026-10-02\.pdf"[^>]+download/);
  const pdf = readFileSync(pdfPath);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal(
    createHash('sha256').update(pdf).digest('hex'),
    'e6128f11630632fdbcdb15b24c8d124f4bea5c03542714c21ce36a0fc90d2051',
    'The download must serve the latest reviewed PDF'
  );
  assert.deepEqual(
    readFileSync(path.join(__dirname, '..', 'cv', 'Nacho_Viejo_Engineering_Manager_CV_2026-09-21.pdf')),
    pdf,
    'The previous public URL must also serve the corrected CV'
  );
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

test('publishes a crawlable identity layer for the public profile', () => {
  const html = loadCv();
  const robots = readFileSync(robotsPath, 'utf8');
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const home = readFileSync(homePath, 'utf8');

  assert.match(html, /"@type": "ProfilePage"/);
  assert.match(html, /"@type": "Person"/);
  assert.match(html, /"sameAs": \[/);
  assert.match(robots, /Sitemap: https:\/\/www\.saski\.com\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/www\.saski\.com\/cv\//);
  assert.match(home, /<title>saski — Nacho Viejo, Engineering Manager<\/title>/);
  assert.match(home, /href="\/cv\/"/);
});
