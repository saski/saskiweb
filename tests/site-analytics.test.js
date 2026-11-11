const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const client = readFileSync(path.join(__dirname, '../js/site-analytics.js'), 'utf8');

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.hidden = false;
    this.textContent = '';
    this.scrollHeight = 1000;
    this.offsetTop = 100;
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  remove() { this.removed = true; }
  addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
  dispatch(name, event = {}) {
    for (const callback of this.listeners[name] ?? []) callback({ target: this, preventDefault() {}, ...event });
  }
  closest(selector) { return selector === 'a' && this.tagName === 'A' ? this : null; }
  get href() { return this.attributes.href ?? ''; }
  set href(value) { this.attributes.href = value; }
  getBoundingClientRect() { return { top: 100 }; }
}

function harness({
  href = 'https://www.saski.com/notes/review-capacity-replay/?utm_source=linkedin&utm_medium=social&utm_campaign=g01_review_capacity&utm_content=linkedin_demo_v1&email=private@example.com#section',
  referrer = 'https://www.linkedin.com/posts/nacho',
  storage = {},
  storageThrows = false,
  pathname = '/notes/review-capacity-replay/',
} = {}) {
  const head = new Element('head');
  const body = new Element('body');
  const canonical = new Element('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.href = `https://www.saski.com${pathname}`;
  const articleBody = new Element('div');
  articleBody.setAttribute('class', 'note-body');
  articleBody.offsetTop = 5000;
  articleBody.getBoundingClientRect = () => ({ top: 100 - window.scrollY });
  const anchors = [];
  const documentListeners = {};
  const allNodes = [];
  const document = {
    head,
    body,
    visibilityState: 'visible',
    referrer,
    createElement(tag) { const element = new Element(tag); allNodes.push(element); return element; },
    querySelector(selector) {
      if (selector === 'link[rel="canonical"]') return canonical;
      if (selector === '.note-body') return articleBody;
      return null;
    },
    querySelectorAll(selector) { return selector === 'a' ? anchors : []; },
    addEventListener(name, callback) { (documentListeners[name] ??= []).push(callback); },
    dispatch(name, event = {}) { for (const callback of documentListeners[name] ?? []) callback(event); },
    cookieWrites: [],
  };
  Object.defineProperty(document, 'cookie', {
    set(value) { document.cookieWrites.push(value); },
  });
  const windowListeners = {};
  const intervals = [];
  const events = [];
  let now = Date.now();
  class FakeDate extends Date { static now() { return now; } }
  const location = new URL(href);
  location.reload = () => { location.reloadCount = (location.reloadCount ?? 0) + 1; };
  const window = {
    location,
    innerHeight: 500,
    scrollY: 0,
    dataLayer: [],
    addEventListener(name, callback) { (windowListeners[name] ??= []).push(callback); },
    dispatch(name, event = {}) { for (const callback of windowListeners[name] ?? []) callback(event); },
    setInterval(callback) { intervals.push(callback); return intervals.length; },
    clearInterval() {},
    setTimeout(callback) { callback(); return 1; },
    gtag(...args) { events.push(args); },
  };
  const localStorage = {
    getItem(key) { if (storageThrows) throw new Error('blocked'); return storage[key] ?? null; },
    setItem(key, value) { if (storageThrows) throw new Error('blocked'); storage[key] = value; },
    removeItem(key) { if (storageThrows) throw new Error('blocked'); delete storage[key]; },
  };
  window.localStorage = localStorage;
  const context = { window, document, URL, URLSearchParams, Date: FakeDate, Math, JSON, localStorage,
    setTimeout: window.setTimeout, setInterval: window.setInterval, clearInterval: window.clearInterval };
  vm.runInNewContext(client, context, { filename: 'site-analytics.js' });
  const button = label => allNodes.find(node => node.tagName === 'BUTTON' && node.textContent === label && !node.removed);
  const click = label => { const target = button(label); assert.ok(target, `missing button: ${label}`); target.dispatch('click'); };
  const addLink = (url, attributes = {}) => {
    const anchor = new Element('a');
    anchor.href = url;
    for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value);
    anchors.push(anchor);
    return anchor;
  };
  const hasHref = (element, href) => element.href === href || element.children.some(child => hasHref(child, href));
  const loadGoogleScript = () => {
    const script = head.children.find(node => node.tagName === 'SCRIPT');
    assert.ok(script, 'Google tag should be present');
    script.dispatch('load');
    return script;
  };
  const tick = (seconds = 1) => {
    now += seconds * 1000;
    intervals.forEach(callback => callback());
  };
  return { window, document, location, storage, intervals, events, allNodes, button, click,
    addLink, loadGoogleScript, articleBody, tick, hasHref, runAgain: () => vm.runInNewContext(client, context) };
}

test('starts measurement on production without inserting settings controls or recording a visitor choice', () => {
  const h = harness();
  assert.equal(h.document.head.children.length, 1);
  assert.equal(h.document.body.children.length, 0);
  assert.equal(h.button('Analytics settings'), undefined);
  assert.equal(h.storage['saski.analytics-consent.v1'], undefined);
});

test('never loads Google or inserts settings controls outside the production HTTPS hosts', () => {
  for (const href of ['http://localhost:8080/notes/', 'https://preview.saski.com/notes/', 'http://www.saski.com/notes/']) {
    const h = harness({ href });
    assert.equal(h.document.head.children.length, 0, href);
    assert.equal(h.document.body.children.length, 0, href);
    assert.deepEqual(h.events, [], href);
  }
});

test('loads GA4 once with sanitized configuration and one manual page view', () => {
  const h = harness();
  const script = h.loadGoogleScript();

  assert.equal(script.src, 'https://www.googletagmanager.com/gtag/js?id=G-MSW6WJWN1M');
  const config = h.events.find(([command]) => command === 'config');
  assert.equal(config[1], 'G-MSW6WJWN1M');
  assert.equal(config[2].send_page_view, false);
  assert.equal(config[2].page_location, 'https://www.saski.com/notes/review-capacity-replay/');
  assert.equal(config[2].page_referrer, 'https://www.linkedin.com');
  assert.equal(config[2].campaign_source, 'linkedin');
  assert.equal(config[2].campaign_medium, 'social');
  assert.equal(config[2].campaign_name, 'g01_review_capacity');
  assert.equal(config[2].campaign_content, 'linkedin_demo_v1');
  assert.equal(config[2].campaign_term, '');
  assert.equal(config[2].campaign_id, '');
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].allow_ad_personalization_signals, false);
  assert.equal(config[2].cookie_expires, 90 * 24 * 60 * 60);
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'page_view').length, 1);
  assert.equal(JSON.stringify(h.events).includes('private@example.com'), false);

  h.runAgain();
  assert.equal(h.document.head.children.filter(node => node.tagName === 'SCRIPT').length, 1);
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'page_view').length, 1);
});

test('demo visits send a fixed page view with hash and query stripped', () => {
  const h = harness({
    href: 'https://www.saski.com/notes/assets/review-capacity-demo-g01.html?utm_source=linkedin&utm_medium=social&utm_campaign=g01_review_capacity&utm_content=linkedin_followup_v1#rework-section',
    pathname: '/notes/assets/review-capacity-demo-g01.html',
  });
  h.loadGoogleScript();

  const pageView = h.events.find(([command, name]) => command === 'event' && name === 'page_view');
  assert.ok(pageView);
  assert.deepEqual({ ...pageView[2] }, {
    content_id: 'review-capacity-demo-g01',
    page_location: 'https://www.saski.com/notes/assets/review-capacity-demo-g01.html',
    page_referrer: 'https://www.linkedin.com',
    campaign_source: 'linkedin',
    campaign_medium: 'social',
    campaign_name: 'g01_review_capacity',
    campaign_content: 'linkedin_followup_v1',
    campaign_term: '',
    campaign_id: '',
  });
  assert.equal(JSON.stringify(pageView).includes('#rework-section'), false);
});

function legacyChoice(choice, savedAt = Date.now() - 1000) {
  return JSON.stringify({ version: 1, choice, savedAt, expiresAt: savedAt + 180 * 86400000 });
}

test('respects an existing opt-out on both articles and the standalone demo without displaying controls', () => {
  for (const pathname of ['/notes/review-capacity-replay/', '/notes/assets/review-capacity-demo-g01.html']) {
    const h = harness({ pathname, storage: { 'saski.analytics-consent.v1': legacyChoice('declined') } });
    assert.equal(h.document.head.children.length, 0);
    assert.equal(h.document.body.children.length, 0);
    assert.deepEqual(h.events, []);
    assert.equal(h.window['ga-disable-G-MSW6WJWN1M'], true);
  }
});

test('denies malformed attribution and unrelated referrers and only sends approved click categories', () => {
  const h = harness({
    href: 'https://saski.com/notes/agent-activity-dashboard/?utm_source=evil&utm_medium=anything&utm_campaign=private&utm_content=secret&utm_term=alice&utm_id=raw',
    referrer: 'https://attacker.example/path?email=private@example.com',
    pathname: '/notes/agent-activity-dashboard/',
  });
  h.loadGoogleScript();
  const config = h.events.find(([command]) => command === 'config')[2];
  for (const key of ['campaign_source', 'campaign_medium', 'campaign_name', 'campaign_content', 'campaign_term', 'campaign_id']) {
    assert.equal(config[key], '');
  }
  assert.equal(config.page_referrer, '');

  h.addLink('https://github.com/saski/agent-systems-lab/tree/main/docs');
  h.addLink('mailto:nacho@saski.com?subject=Hi');
  h.addLink('https://www.linkedin.com/in/saski/');
  h.addLink('https://example.com/private', { 'data-analytics': 'demo' });
  h.addLink('https://www.saski.com/notes/arnesto/');
  h.document.dispatch('click', { target: h.document.querySelectorAll('a')[0] });
  for (const anchor of h.document.querySelectorAll('a').slice(1)) h.document.dispatch('click', { target: anchor });

  const tracked = h.events.filter(([command, name]) => command === 'event' && name !== 'page_view');
  assert.deepEqual(tracked.map(([, name]) => name), ['repo_click', 'contact_click', 'contact_click', 'note_open']);
  assert.equal(JSON.stringify(tracked).includes('example.com'), false);
  assert.equal(JSON.stringify(tracked).includes('nacho@saski.com'), false);
  assert.ok(tracked.every(([, , params]) => Object.keys(params).every(key => ['content_id', 'target', 'method'].includes(key))));
});

test('demo and CV downloads require approved destinations and fixed event values', () => {
  const h = harness({ pathname: '/cv/' });
  h.loadGoogleScript();
  h.addLink('https://www.saski.com/notes/assets/review-capacity-demo-g01.html?secret=x', { 'data-analytics': 'demo' });
  h.addLink('https://www.saski.com/demo/unapproved.html', { 'data-analytics': 'demo' });
  h.addLink('https://www.saski.com/cv/nacho.pdf');
  h.addLink('https://evil.example/demo.html', { 'data-analytics': 'demo' });
  for (const anchor of h.document.querySelectorAll('a')) h.document.dispatch('click', { target: anchor });

  const tracked = h.events.filter(([command, name]) => command === 'event' && name !== 'page_view');
  assert.deepEqual(tracked.map(([, name]) => name), ['demo_click', 'cv_download']);
  assert.ok(tracked.every(([, , params]) => params.content_id === 'cv'));
  assert.ok(tracked.every(([, , params]) => ['lab_demo', 'cv_pdf'].includes(params.target)));
});

test('note_read requires 30 visible seconds and 75 percent article scroll progress', () => {
  const h = harness();
  h.loadGoogleScript();
  h.window.scrollY = 400;
  h.document.dispatch('scroll');
  for (let i = 0; i < 20; i += 1) h.tick();
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'note_read').length, 0);
  h.document.visibilityState = 'hidden';
  h.document.dispatch('visibilitychange');
  for (let i = 0; i < 30; i += 1) h.tick();
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'note_read').length, 0);
  h.document.visibilityState = 'visible';
  h.document.dispatch('visibilitychange');
  for (let i = 0; i < 9; i += 1) h.tick();
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'note_read').length, 0);
  h.tick();
  const reads = h.events.filter(([command, name]) => command === 'event' && name === 'note_read');
  assert.equal(reads.length, 1);
  assert.deepEqual({ ...reads[0][2] }, { content_id: 'review-capacity-replay', target: 'note', method: 'read' });
});

test('a legacy opt-out from another tab disables tracking, clears its cookies and reloads', () => {
  const h = harness();
  h.loadGoogleScript();
  h.window.dispatch('storage', { key: 'saski.analytics-consent.v1', newValue: legacyChoice('declined') });
  assert.equal(h.location.reloadCount, 1);
  assert.equal(h.window['ga-disable-G-MSW6WJWN1M'], true);
  assert.equal(h.document.cookieWrites.length, 6);
  assert.ok(h.document.cookieWrites.some(cookie => cookie.startsWith('_ga=;') && !cookie.includes('Domain=')));
  assert.ok(h.document.cookieWrites.some(cookie => cookie.startsWith('_ga_MSW6WJWN1M=;') && cookie.includes('Domain=.saski.com')));
  assert.ok(h.document.cookieWrites.every(cookie => !/_(?:gid|gat)=/.test(cookie)));
  const before = h.events.length;
  h.document.dispatch('click', { target: h.addLink('https://github.com/saski/arnesto') });
  assert.equal(h.events.length, before);
});

test('an existing opt-out clears only this property cookies without loading Google', () => {
  const h = harness({ pathname: '/privacy.html', storage: { 'saski.analytics-consent.v1': legacyChoice('declined') } });
  assert.equal(h.document.head.children.length, 0);
  assert.equal(h.location.reloadCount ?? 0, 0);
  assert.equal(h.document.cookieWrites.length, 6);
  assert.deepEqual(h.document.cookieWrites.map(cookie => cookie.split('=')[0]).filter((name, index, all) => all.indexOf(name) === index), ['_ga', '_ga_MSW6WJWN1M']);
});

test('an opt-out before the tag loads prevents its delayed callback from sending a page view', () => {
  const h = harness();
  const script = h.document.head.children.find(node => node.tagName === 'SCRIPT');
  h.window.dispatch('storage', { key: 'saski.analytics-consent.v1', newValue: legacyChoice('declined') });
  script.dispatch('load');
  assert.equal(h.events.filter(([command]) => command === 'event').length, 0);
});

test('invalid, expired or inaccessible legacy preferences use the default without inventing acceptance', () => {
  const invalidRecords = [
    JSON.stringify({ version: 2, choice: 'accepted' }),
    legacyChoice('accepted', Date.now() + 1000),
    legacyChoice('declined', Date.now() - 200 * 86400000),
    'invalid JSON',
  ];
  for (const record of invalidRecords) {
    const h = harness({ storage: { 'saski.analytics-consent.v1': record } });
    assert.equal(h.document.head.children.length, 1);
    assert.equal(h.storage['saski.analytics-consent.v1'], undefined);
    assert.equal(h.document.body.children.length, 0);
  }
  const blocked = harness({ storageThrows: true });
  assert.equal(blocked.document.head.children.length, 1);
  blocked.loadGoogleScript();
});

test('measurement continues without creating or renewing a legacy opt-in record', () => {
  const h = harness();
  h.loadGoogleScript();
  h.tick(180 * 86400 + 1);
  assert.equal(h.window['ga-disable-G-MSW6WJWN1M'], false);
  assert.equal(h.storage['saski.analytics-consent.v1'], undefined);
  assert.equal(h.location.reloadCount ?? 0, 0);
  assert.equal(h.document.body.children.length, 0);
});
