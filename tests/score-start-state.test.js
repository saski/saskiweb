const test = require('node:test');
const assert = require('node:assert/strict');

const { canPlayScore } = require('../js/score-start-state.js');

test('canPlayScore returns false when resume leaves audio suspended', async () => {
  let resumeCalls = 0;
  const audioCtx = {
    state: 'suspended',
    async resume() {
      resumeCalls += 1;
    },
  };

  const canPlay = await canPlayScore(audioCtx);

  assert.equal(canPlay, false);
  assert.equal(resumeCalls, 1);
});
