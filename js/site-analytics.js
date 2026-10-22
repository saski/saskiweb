(() => {
  const w = window;
  const d = document;
  const measurementId = 'G-MSW6WJWN1M';
  const storageKey = 'saski.analytics-consent.v1';
  const choiceVersion = 1;
  const choiceLifetime = 180 * 24 * 60 * 60 * 1000;
  const productionHosts = new Set(['saski.com', 'www.saski.com']);
  const campaignValues = {
    utm_source: new Set(['linkedin', 'x', 'newsletter']),
    utm_medium: new Set(['social', 'email']),
    utm_campaign: new Set(['g01_review_capacity']),
    utm_content: new Set([
      'linkedin_demo_v1', 'linkedin_followup_v1', 'x_summary_v1', 'notes_demo_v1'
    ]),
  };
  const eventNames = new Set(['page_view', 'note_read', 'note_open', 'repo_click',
    'demo_click', 'contact_click', 'cv_download']);

  if (w.__saskiAnalyticsInitialized) return;
  w.__saskiAnalyticsInitialized = true;

  const hostname = String(w.location.hostname || '').toLowerCase();
  const canSend = productionHosts.has(hostname);
  const storedChoice = readChoice();
  let choice = storedChoice?.choice || 'undecided';
  let choiceExpiresAt = storedChoice?.expiresAt || 0;
  let panelExpanded = choice === 'undecided';
  let gaReady = false;
  let gaRequested = false;
  let readMilliseconds = 0;
  let readSent = false;
  let reloadStarted = false;
  let lastTimeUpdate = Date.now();
  let wasVisible = d.visibilityState === 'visible';

  function validChoiceRecord(stored) {
    return stored && stored.version === choiceVersion
      && ['accepted', 'declined'].includes(stored.choice)
      && Number.isFinite(stored.savedAt) && Number.isFinite(stored.expiresAt)
      && stored.savedAt <= Date.now()
      && stored.expiresAt > Date.now() && stored.expiresAt - stored.savedAt === choiceLifetime;
  }

  function readChoice() {
    try {
      const raw = w.localStorage.getItem(storageKey);
      if (!raw) return null;
      const stored = JSON.parse(raw);
      if (!validChoiceRecord(stored)) {
        w.localStorage.removeItem(storageKey);
        return null;
      }
      return stored;
    } catch {
      return null;
    }
  }

  function saveChoice(next) {
    choice = next;
    const savedAt = Date.now();
    choiceExpiresAt = savedAt + choiceLifetime;
    try {
      w.localStorage.setItem(storageKey, JSON.stringify({
        version: choiceVersion,
        choice: next,
        savedAt,
        expiresAt: choiceExpiresAt,
      }));
    } catch {
      // Keep this page usable when browser storage is unavailable.
    }
    if (next === 'accepted') {
      lastTimeUpdate = Date.now();
      wasVisible = d.visibilityState === 'visible';
    }
  }

  function canonicalPage() {
    const canonical = d.querySelector('link[rel="canonical"]');
    const candidate = canonical?.href || `${w.location.origin}${w.location.pathname}`;
    try {
      const url = new URL(candidate, w.location.origin);
      if (url.protocol !== 'https:' || !productionHosts.has(url.hostname.toLowerCase())) return '';
      return `${url.origin}${url.pathname}`;
    } catch {
      return '';
    }
  }

  function safeReferrer() {
    try {
      const url = new URL(d.referrer);
      const host = url.hostname.toLowerCase();
      const allowed = host === 'linkedin.com' || host.endsWith('.linkedin.com')
        || host === 'github.com' || host === 'www.github.com'
        || host === 'saski.com' || host === 'www.saski.com'
        || host === 'bing.com' || host === 'www.bing.com'
        || host === 't.co'
        || /^(?:[a-z0-9-]+\.)?google\.(?:[a-z]{2,3}|co\.[a-z]{2})$/.test(host);
      return allowed && (url.protocol === 'https:' || url.protocol === 'http:') ? url.origin : '';
    } catch {
      return '';
    }
  }

  function sanitizedCampaign() {
    const params = new URLSearchParams(w.location.search || '');
    const fieldNames = {
      utm_source: 'campaign_source',
      utm_medium: 'campaign_medium',
      utm_campaign: 'campaign_name',
      utm_content: 'campaign_content',
    };
    const result = {};
    for (const [queryKey, allowed] of Object.entries(campaignValues)) {
      const value = params.get(queryKey) || '';
      result[fieldNames[queryKey]] = allowed.has(value) ? value : '';
    }
    result.campaign_term = '';
    result.campaign_id = '';
    return result;
  }

  function pageContentId(pageUrl) {
    if (!pageUrl) return '';
    const path = new URL(pageUrl).pathname;
    if (path === '/') return 'home';
    if (path === '/cv/' || path === '/cv') return 'cv';
    if (path === '/notes/' || path === '/notes') return 'notes';
    const note = path.match(/^\/notes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
    return note ? note[1] : '';
  }

  function queueGoogleTag() {
    if (gaRequested || !canSend || choice !== 'accepted') return;
    const pageLocation = canonicalPage();
    const contentId = pageContentId(pageLocation);
    if (!pageLocation || !contentId) return;
    gaRequested = true;
    w[`ga-disable-${measurementId}`] = false;
    w.dataLayer = w.dataLayer || [];
    if (typeof w.gtag !== 'function') {
      w.gtag = function gtag() { w.dataLayer.push(arguments); };
    }
    const gtag = w.gtag;
    const campaign = sanitizedCampaign();
    const pageParams = {
      page_location: pageLocation,
      page_referrer: safeReferrer(),
      ...campaign,
    };
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    gtag('js', new Date());
    gtag('config', measurementId, {
      ...pageParams,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 90 * 24 * 60 * 60,
      send_page_view: false,
    });

    const script = d.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.addEventListener('load', () => {
      if (choice !== 'accepted' || !canSend) return;
      if (choiceExpiresAt <= Date.now()) {
        expireChoice();
        return;
      }
      gaReady = true;
      gtag('event', 'page_view', { content_id: contentId, ...pageParams });
    });
    d.head.appendChild(script);
  }

  function eventAllowed(name) {
    if (choice === 'accepted' && choiceExpiresAt <= Date.now()) {
      expireChoice();
      return false;
    }
    return canSend && choice === 'accepted' && gaReady && eventNames.has(name)
      && typeof w.gtag === 'function';
  }

  function sendEvent(name, { contentId, target, method }) {
    if (!eventAllowed(name) || !contentId || !target || !method) return;
    w.gtag('event', name, { content_id: contentId, target, method });
  }

  function trustedURL(href) {
    try { return new URL(href, w.location.origin); } catch { return null; }
  }

  function eventForLink(anchor) {
    const pageUrl = canonicalPage();
    const contentId = pageContentId(pageUrl);
    if (!contentId) return null;
    const url = trustedURL(anchor.href || anchor.getAttribute('href'));
    if (!url) return null;
    const currentOrigin = new URL(pageUrl).origin;
    const sameSite = url.origin === currentOrigin && url.protocol === 'https:';
    const path = url.pathname;

    if (sameSite && anchor.getAttribute('data-analytics') === 'demo'
      && ['/notes/assets/review-capacity-demo-g01.html', '/notes/review-capacity-replay/'].includes(path)) {
      return { name: 'demo_click', contentId, target: 'lab_demo', method: 'link' };
    }
    if (sameSite && /^\/cv\/[a-z0-9][a-z0-9._-]*\.pdf$/i.test(path)) {
      return { name: 'cv_download', contentId, target: 'cv_pdf', method: 'download' };
    }
    if (sameSite) {
      const note = path.match(/^\/notes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
      if (note) return { name: 'note_open', contentId: note[1], target: 'note', method: 'link' };
    }

    const parts = path.split('/').filter(Boolean);
    if (url.protocol === 'https:' && url.hostname === 'github.com' && parts[0] === 'saski'
      && ['agent-systems-lab', 'arnesto'].includes(parts[1])) {
      return { name: 'repo_click', contentId, target: parts[1], method: 'link' };
    }
    if (url.protocol === 'mailto:') {
      return { name: 'contact_click', contentId, target: 'email', method: 'mailto' };
    }
    if (url.protocol === 'https:' && (url.hostname === 'linkedin.com' || url.hostname === 'www.linkedin.com')
      && path === '/in/saski/') {
      return { name: 'contact_click', contentId, target: 'linkedin', method: 'link' };
    }
    return null;
  }

  function trackLink(event) {
    if (!eventAllowed('note_open')) return;
    const anchor = event.target?.closest?.('a[href]') || event.target?.closest?.('a');
    if (!anchor) return;
    const detail = eventForLink(anchor);
    if (detail) sendEvent(detail.name, detail);
  }

  function noteProgressReached() {
    const article = d.querySelector('.note-body');
    if (!article || !Number.isFinite(article.scrollHeight) || article.scrollHeight <= 0) return false;
    const rect = article.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.top)) return false;
    const top = rect.top + (Number(w.scrollY) || 0);
    const visibleBottom = (Number(w.scrollY) || 0) + (Number(w.innerHeight) || 0);
    return Math.max(0, Math.min(1, (visibleBottom - top) / article.scrollHeight)) >= 0.75;
  }

  function checkNoteRead() {
    if (readSent || !eventAllowed('note_read') || !d.querySelector('.note-body')) return;
    if (readMilliseconds >= 30000 && noteProgressReached()) {
      readSent = true;
      sendEvent('note_read', { contentId: pageContentId(canonicalPage()), target: 'note', method: 'read' });
    }
  }

  function updateVisibleTime() {
    const now = Date.now();
    if (choice === 'accepted' && choiceExpiresAt <= now) {
      expireChoice();
      return;
    }
    if (wasVisible && choice === 'accepted') readMilliseconds += Math.max(0, now - lastTimeUpdate);
    lastTimeUpdate = now;
    wasVisible = d.visibilityState === 'visible';
    checkNoteRead();
  }

  function clearGoogleCookies() {
    if (!canSend) return;
    const cookieNames = ['_ga', `_ga_${measurementId.slice(2)}`];
    const domains = ['', `; Domain=${hostname}`, '; Domain=.saski.com'];
    for (const cookie of cookieNames) {
      for (const domain of domains) {
        d.cookie = `${cookie}=; Max-Age=0; Path=/; SameSite=Lax${domain}`;
      }
    }
  }

  function withdraw() {
    const hadActiveTag = gaRequested;
    saveChoice('declined');
    panelExpanded = false;
    gaReady = false;
    w[`ga-disable-${measurementId}`] = true;
    if (typeof w.gtag === 'function' && hadActiveTag) {
      w.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
    clearGoogleCookies();
    if (hadActiveTag) {
      if (!reloadStarted && typeof w.location.reload === 'function') {
        reloadStarted = true;
        w.location.reload();
      }
    }
    renderChoice();
  }

  function expireChoice() {
    const hadActiveTag = gaRequested;
    choice = 'undecided';
    choiceExpiresAt = 0;
    panelExpanded = true;
    gaReady = false;
    w[`ga-disable-${measurementId}`] = true;
    try { w.localStorage.removeItem(storageKey); } catch { /* Keep the current page denied. */ }
    if (typeof w.gtag === 'function' && hadActiveTag) {
      w.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
    clearGoogleCookies();
    renderChoice();
    if (hadActiveTag && !reloadStarted && typeof w.location.reload === 'function') {
      reloadStarted = true;
      w.location.reload();
    }
  }

  function makeButton(label, handler, className) {
    const button = d.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = className;
    button.addEventListener('click', handler);
    return button;
  }

  const region = d.createElement('section');
  region.className = 'site-analytics';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', 'Analytics settings');
  const content = d.createElement('div');
  content.className = 'site-analytics__content';
  const message = d.createElement('p');
  message.className = 'site-analytics__message';
  const controls = d.createElement('div');
  controls.className = 'site-analytics__choices';
  const settings = makeButton('Analytics settings', () => {
    panelExpanded = !panelExpanded;
    renderChoice();
    if (panelExpanded) acceptButton.focus?.();
  }, 'site-analytics__settings');
  settings.setAttribute('aria-expanded', String(panelExpanded));
  const acceptButton = makeButton('Accept analytics', () => {
    saveChoice('accepted');
    panelExpanded = false;
    renderChoice();
    queueGoogleTag();
  }, 'site-analytics__accept');
  const declineButton = makeButton('Decline analytics', () => withdraw(), 'site-analytics__decline');
  const privacy = d.createElement('a');
  privacy.href = '/privacy.html';
  privacy.textContent = 'Privacy notice';
  privacy.className = 'site-analytics__privacy';
  privacy.setAttribute('rel', 'nofollow');
  controls.appendChild(acceptButton);
  controls.appendChild(declineButton);
  content.appendChild(message);
  content.appendChild(controls);
  content.appendChild(privacy);
  region.appendChild(settings);
  region.appendChild(content);
  d.body.appendChild(region);

  function renderChoice() {
    region.className = `site-analytics ${panelExpanded ? 'site-analytics--expanded' : 'site-analytics--collapsed'}`;
    content.hidden = !panelExpanded;
    settings.setAttribute('aria-expanded', String(panelExpanded));
    if (choice === 'accepted') {
      message.textContent = 'Analytics is enabled. You can change your choice at any time.';
    } else if (choice === 'declined') {
      message.textContent = 'Analytics is disabled. You can change your choice at any time.';
    } else {
      message.textContent = 'Choose whether this site may use Google Analytics. See the privacy notice.';
      controls.hidden = false;
    }
  }

  renderChoice();
  d.addEventListener('click', trackLink);
  d.addEventListener('scroll', checkNoteRead, { passive: true });
  d.addEventListener('visibilitychange', updateVisibleTime);
  w.setInterval(updateVisibleTime, 1000);
  w.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    let next = 'undecided';
    try {
      const stored = event.newValue && JSON.parse(event.newValue);
      if (validChoiceRecord(stored)) next = stored.choice;
    } catch {
      next = 'undecided';
    }
    if (next === 'declined' || next === 'undecided') {
      if (choice === 'accepted' || gaRequested) withdraw();
      else {
        choice = next;
        choiceExpiresAt = 0;
        panelExpanded = next === 'undecided';
        renderChoice();
      }
      return;
    }
    lastTimeUpdate = Date.now();
    wasVisible = d.visibilityState === 'visible';
    choice = 'accepted';
    choiceExpiresAt = JSON.parse(event.newValue).expiresAt;
    panelExpanded = false;
    renderChoice();
    queueGoogleTag();
  });

  if (choice === 'accepted') queueGoogleTag();
})();
