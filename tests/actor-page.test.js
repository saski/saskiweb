const assert = require('node:assert/strict');
const { readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the Spanish casting dossier is reachable directly and stays outside the main site', () => {
  const html = read('actor/index.html');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>Nacho Saski[^<]*Actor/i);
  assert.match(html, /name="robots" content="noindex"/);
  assert.doesNotMatch(html, /site-header|site-analytics|href="\/(?:cv|notes|privacy|")/);
  for (const file of ['index.htm', 'cv/index.html', 'notes/index.html', 'notes/feed.xml', 'sitemap.xml']) {
    assert.doesNotMatch(read(file), /(?:href="|<loc>)(?:https:\/\/(?:www\.)?saski\.com)?\/actor(?:\/|["<])/);
  }
  for (const credit of ['La ensaladera del coronel Cray', 'padre Brown', 'Astur Midsommar', 'fiestas de Troenzo, en Llanes', 'JAS Group', 'Miguel de Molina']) {
    assert.ok(html.includes(credit), credit);
  }
});

test('all three MTV Day films have playable local files, posters and direct links', () => {
  const html = read('actor/index.html');
  const programme = html.match(/<ol id="spots">([\s\S]*?)<\/ol>/)[1];
  const films = [...programme.matchAll(/href="(media\/[^"/]+\.mp4)" data-poster="(media\/[^"/]+\.webp)"/g)];
  assert.equal(films.length, 3);
  assert.equal(new Set(films.map(([, file]) => file)).size, films.length);
  for (const [, file, poster] of films) {
    for (const asset of [file, poster]) {
      assert.ok(statSync(path.join(__dirname, '..', 'actor', asset)).size > 0, asset);
    }
  }
  assert.match(html, /<video\b[^>]*\bcontrols\b/);
  assert.ok(html.includes(`src="${films[0][1]}" poster="${films[0][2]}"`));
});
