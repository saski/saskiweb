function reverseCycleIndex(length, beat) {
  return (length - 1) - (beat % length);
}

function getScheduledMidiNotes({ beat, baseMidi, scale, arp }) {
  const upScaleMidi = baseMidi + scale[beat % scale.length];
  const downScaleMidi = baseMidi + 12 + scale[reverseCycleIndex(scale.length, beat)];
  const upArpMidi = baseMidi - 12 + arp[beat % arp.length];
  const downArpMidi = baseMidi + arp[reverseCycleIndex(arp.length, beat)];

  return {
    upScaleMidi,
    downScaleMidi,
    upArpMidi,
    downArpMidi,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    reverseCycleIndex,
    getScheduledMidiNotes,
  };
}

if (typeof window !== 'undefined') {
  window.ScoreNoteSelection = {
    reverseCycleIndex,
    getScheduledMidiNotes,
  };
}
