const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const client = readFileSync(path.join(__dirname, '../js/site-analytics.js'), 'utf8');
const stylesheet = readFileSync(path.join(__dirname, '../css/site-analytics.css'), 'utf8');

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
    addLink, loadGoogleScript, articleBody, tick, hasHref };
}

test('does not load Google before consent, on decline, or on localhost', () => {
  const untouched = harness();
  assert.equal(untouched.document.head.children.length, 0);
  assert.deepEqual(untouched.events, []);
  assert.equal(untouched.document.body.children[0].getAttribute('role'), 'region');
  assert.equal(untouched.document.body.children[0].getAttribute('aria-label'), 'Analytics settings');
  assert.ok(untouched.hasHref(untouched.document.body.children[0], '/privacy.html'));
  untouched.click('Decline analytics');
  assert.equal(untouched.document.head.children.length, 0);

  const local = harness({ href: 'http://localhost:8080/notes/review-capacity-replay/?utm_source=linkedin' });
  local.click('Accept analytics');
  assert.equal(local.document.head.children.length, 0);
  assert.ok(local.button('Analytics settings'));
});

test('consent styling keeps hidden flex controls collapsed and exposes a compact settings state', () => {
  assert.match(stylesheet, /\.site-analytics__choices\[hidden\][\s\S]*?display:\s*none\s*!important/);
  assert.match(stylesheet, /\.site-analytics--collapsed\s*\{/);
  assert.match(stylesheet, /\.site-analytics--collapsed \.site-analytics__settings/);
});

test('accept loads GA4 once with sanitized configuration and one manual page view', () => {
  const h = harness();
  h.click('Accept analytics');
  assert.equal(h.document.body.children[0].className, 'site-analytics site-analytics--collapsed');
  const choice = JSON.parse(h.storage['saski.analytics-consent.v1']);
  assert.equal(choice.version, 1);
  assert.equal(choice.choice, 'accepted');
  assert.equal(choice.expiresAt - choice.savedAt, 180 * 24 * 60 * 60 * 1000);
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

  h.click('Analytics settings');
  h.click('Accept analytics');
  assert.equal(h.document.head.children.filter(node => node.tagName === 'SCRIPT').length, 1);
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'page_view').length, 1);
  assert.ok(h.hasHref(h.document.body.children[0], '/privacy.html'));
});

test('denies malformed attribution and unrelated referrers and only sends approved click categories', () => {
  const h = harness({
    href: 'https://saski.com/notes/agent-activity-dashboard/?utm_source=evil&utm_medium=anything&utm_campaign=private&utm_content=secret&utm_term=alice&utm_id=raw',
    referrer: 'https://attacker.example/path?email=private@example.com',
    pathname: '/notes/agent-activity-dashboard/',
  });
  h.click('Accept analytics');
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
  h.click('Accept analytics');
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
  h.click('Accept analytics');
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

test('decline after consent disables tracking, clears cookies and reloads; storage changes withdraw in another tab', () => {
  const h = harness();
  h.click('Accept analytics');
  h.loadGoogleScript();
  h.click('Analytics settings');
  h.click('Decline analytics');
  assert.equal(h.location.reloadCount, 1);
  assert.equal(h.window['ga-disable-G-MSW6WJWN1M'], true);
  assert.equal(h.document.cookieWrites.length, 6);
  assert.ok(h.document.cookieWrites.some(cookie => cookie.startsWith('_ga=;') && !cookie.includes('Domain=')));
  assert.ok(h.document.cookieWrites.some(cookie => cookie.startsWith('_ga_MSW6WJWN1M=;') && cookie.includes('Domain=.saski.com')));
  assert.ok(h.document.cookieWrites.every(cookie => !/_(?:gid|gat)=/.test(cookie)));
  const before = h.events.length;
  h.document.dispatch('click', { target: h.addLink('https://github.com/saski/arnesto') });
  assert.equal(h.events.length, before);

  const crossTab = harness();
  crossTab.click('Accept analytics');
  crossTab.loadGoogleScript();
  const savedAt = Date.now();
  crossTab.window.dispatch('storage', {
    key: 'saski.analytics-consent.v1',
    newValue: JSON.stringify({ version: 1, choice: 'declined', savedAt, expiresAt: savedAt + 180 * 86400000 }),
  });
  assert.equal(crossTab.location.reloadCount, 1);
  assert.equal(crossTab.window['ga-disable-G-MSW6WJWN1M'], true);
});

test('decline clears only this GA property cookies even when this page never loaded the tag', () => {
  const h = harness({ pathname: '/privacy.html' });
  h.click('Decline analytics');
  assert.equal(h.document.head.children.length, 0);
  assert.equal(h.location.reloadCount ?? 0, 0);
  assert.equal(h.document.cookieWrites.length, 6);
  assert.deepEqual(h.document.cookieWrites.map(cookie => cookie.split('=')[0]).filter((name, index, all) => all.indexOf(name) === index), [
    '_ga', '_ga_MSW6WJWN1M',
  ]);
});

test('withdrawal before Google script load prevents the delayed load callback from sending a page view', () => {
  const h = harness();
  h.click('Accept analytics');
  const script = h.document.head.children.find(node => node.tagName === 'SCRIPT');
  h.click('Analytics settings');
  h.click('Decline analytics');
  script.dispatch('load');
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name === 'page_view').length, 0);
  assert.equal(h.events.filter(([command, name]) => command === 'event' && name !== 'page_view').length, 0);
});

test('a stored choice with a future timestamp is invalid and a live accepted choice expires safely', () => {
  const future = Date.now();
  const invalid = harness({ storage: { 'saski.analytics-consent.v1': JSON.stringify({
    version: 1, choice: 'accepted', savedAt: future + 1000, expiresAt: future + 1000 + 180 * 86400000,
  }) } });
  assert.equal(invalid.document.head.children.length, 0);
  assert.equal(invalid.storage['saski.analytics-consent.v1'], undefined);

  const live = harness();
  live.click('Accept analytics');
  live.loadGoogleScript();
  live.tick(180 * 86400 + 1);
  assert.equal(live.window['ga-disable-G-MSW6WJWN1M'], true);
  assert.equal(live.storage['saski.analytics-consent.v1'], undefined);
  assert.equal(live.location.reloadCount, 1);
  assert.equal(live.document.body.children[0].className, 'site-analytics site-analytics--expanded');
});

test('invalid or expired stored choices are denied and storage exceptions leave usable controls', () => {
  const invalid = harness({ storage: { 'saski.analytics-consent.v1': JSON.stringify({ version: 2, choice: 'accepted' }) } });
  assert.equal(invalid.document.head.children.length, 0);
  assert.ok(invalid.button('Accept analytics'));

  const expired = harness({ storage: { 'saski.analytics-consent.v1': JSON.stringify({
    version: 1, choice: 'accepted', savedAt: Date.now() - 200 * 86400000, expiresAt: Date.now() - 1,
  }) } });
  assert.equal(expired.document.head.children.length, 0);

  const blocked = harness({ storageThrows: true });
  blocked.click('Accept analytics');
  assert.equal(blocked.document.head.children.length, 1);
  blocked.loadGoogleScript();
});
