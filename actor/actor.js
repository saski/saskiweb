const player = document.getElementById('spot');
const choices = document.querySelectorAll('#spots a');
const spotTitle = document.getElementById('spot-title');
const playbackStatus = document.querySelector('.playback-status');

for (const choice of choices) {
  choice.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    playbackStatus.textContent = '';
    if (player.src !== choice.href) {
      player.pause();
      player.poster = choice.dataset.poster;
      player.src = choice.href;
      spotTitle.textContent = choice.querySelector('.clip-name').textContent;
      for (const link of choices) link.removeAttribute('aria-current');
      choice.setAttribute('aria-current', 'true');
    }
    player.play().catch(error => {
      if (error.name === 'NotAllowedError') playbackStatus.textContent = 'Pulsa reproducir en el vídeo.';
    });
  });
}

player.addEventListener('error', () => {
  playbackStatus.textContent = 'Puedes ver este spot en el álbum de vídeo de Google Fotos.';
});
