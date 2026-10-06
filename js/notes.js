(() => {
  const filters = document.querySelector('.filters');
  if (!filters) return;
  const buttons = [...filters.querySelectorAll('button')];
  const entries = [...document.querySelectorAll('.note-entry')];
  const status = document.getElementById('filter-status');

  function apply(topic) {
    const selected = buttons.find(button => button.dataset.topic === topic) || buttons[0];
    let count = 0;
    for (const entry of entries) {
      entry.hidden = selected.dataset.topic !== 'all' && entry.dataset.topic !== selected.dataset.topic;
      if (!entry.hidden) count += 1;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === selected));
    status.textContent = `${count} notes · ${selected.textContent}`;
  }

  filters.hidden = false;
  apply(new URLSearchParams(location.search).get('topic'));
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-topic]');
    if (!button) return;
    apply(button.dataset.topic);
    const url = new URL(location.href);
    if (button.dataset.topic === 'all') url.searchParams.delete('topic');
    else url.searchParams.set('topic', button.dataset.topic);
    history.replaceState(null, '', url);
  });
})();
