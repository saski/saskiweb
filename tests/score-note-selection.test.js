const test = require('node:test');
const assert = require('node:assert/strict');

const { getScheduledMidiNotes } = require('../js/score-note-selection.js');

test('getScheduledMidiNotes returns expected note set for a beat', () => {
  const notes = getScheduledMidiNotes({
    beat: 2,
    baseMidi: 45,
    scale: [0, 2, 3, 5],
    arp: [0, 3, 7, 10],
  });

  assert.deepStrictEqual(notes, {
    upScaleMidi: 48,
    downScaleMidi: 59,
    upArpMidi: 40,
    downArpMidi: 48,
  });
});

test('getScheduledMidiNotes wraps indexes when beat exceeds array length', () => {
  const notes = getScheduledMidiNotes({
    beat: 9,
    baseMidi: 45,
    scale: [0, 2, 3, 5],
    arp: [0, 3, 7, 10],
  });

  assert.deepStrictEqual(notes, {
    upScaleMidi: 47,
    downScaleMidi: 60,
    upArpMidi: 36,
    downArpMidi: 52,
  });
});
