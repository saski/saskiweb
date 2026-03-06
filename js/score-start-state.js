async function canPlayScore(audioCtx) {
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (_error) {
      return false;
    }
  }

  return audioCtx.state === 'running';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    canPlayScore,
  };
}

if (typeof window !== 'undefined') {
  window.ScoreStartState = {
    canPlayScore,
  };
}
