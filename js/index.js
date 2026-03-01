const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const scoreToggle = document.getElementById('scoreToggle');
const sceneReload = document.getElementById('sceneReload');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); init(); });

// Paleta
const BEIGE_BG  = '#d4c4a0';
const BEIGE_LAYER_1 = '#ddcfaf';
const BEIGE_LAYER_2 = '#cdbc95';
const BEIGE_LAYER_3 = '#e8dcc2';
const BEIGE_LAYER_4 = '#bfae85';
const BEIGE_LAYER_5 = '#efe4ce';
const BEIGE_LAYER_6 = '#b7a47a';
const LIQUID_COLORS = ['#c9b98a','#d8c9a3','#bfaf88','#e2d4b0','#cabb95'];
const BLACK_BODY = 'rgba(18,12,6,0.92)';
const WHITE_STITCH = 'rgba(255,252,245,0.88)';
const ACCENT_COLORS = ['#c0392b','#2471a3','#1e8449','#d4ac0d','#884ea0','#e67e22'];
function randomAccentColor(alphaSuffix = '') {
  return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)] + alphaSuffix;
}

let musicians = [];
let liquidBlobs = [];
let stitches = [];
let figureSparks = [];

// --- SUBTLE SOUND SCORE (cello-inspired minimalism) ---
const score = {
  audioCtx: null,
  master: null,
  isPlaying: false,
  timer: null,
  beat: 0,
  nextTime: 0,
  bpm: 62,
  baseMidi: 45, // A2 range, cello-like register
  arp: [0, 3, 7, 10],
  scale: [
    0, 2, 3, 5, 7, 8, 10, 12,
    14, 15, 17, 19, 20, 22, 24
  ]
};

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function ensureAudio() {
  if (score.audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  score.audioCtx = new Ctx();
  score.master = score.audioCtx.createGain();
  score.master.gain.value = 0.12;
  score.master.connect(score.audioCtx.destination);
}

function playCelloNote(time, midi, duration, gainValue, panValue) {
  const audioCtx = score.audioCtx;
  const freq = midiToHz(midi);
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const noteGain = audioCtx.createGain();
  const pan = audioCtx.createStereoPanner();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  osc.detune.setValueAtTime((Math.random() - 0.5) * 8, time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, time);
  filter.frequency.exponentialRampToValueAtTime(380, time + duration * 0.95);
  filter.Q.value = 0.8;

  noteGain.gain.setValueAtTime(0.0001, time);
  noteGain.gain.exponentialRampToValueAtTime(gainValue, time + 0.03);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  pan.pan.setValueAtTime(panValue, time);

  osc.connect(filter);
  filter.connect(noteGain);
  noteGain.connect(pan);
  pan.connect(score.master);

  osc.start(time);
  osc.stop(time + duration + 0.06);
}

function scheduleScore() {
  if (!score.isPlaying) return;

  const audioCtx = score.audioCtx;
  const step = 60 / score.bpm / 2; // eighth notes
  const lookAhead = 0.18;

  while (score.nextTime < audioCtx.currentTime + lookAhead) {
    const scaleLen = score.scale.length;
    const arpLen = score.arp.length;

    const upIdx = score.beat % scaleLen;
    const downIdx = (scaleLen - 1) - (score.beat % scaleLen);
    const arpUpIdx = score.beat % arpLen;
    const arpDownIdx = (arpLen - 1) - (score.beat % arpLen);

    const upScaleMidi = score.baseMidi + score.scale[upIdx];
    const downScaleMidi = score.baseMidi + 12 + score.scale[downIdx];
    const upArpMidi = score.baseMidi - 12 + score.arp[arpUpIdx];
    const downArpMidi = score.baseMidi + score.arp[arpDownIdx];

    playCelloNote(score.nextTime, upScaleMidi, step * 1.35, 0.045, -0.34);
    playCelloNote(score.nextTime, downScaleMidi, step * 1.35, 0.038, 0.32);
    playCelloNote(score.nextTime, upScaleMidi - 12, step * 1.45, 0.018, -0.45);
    playCelloNote(score.nextTime, downScaleMidi + 12, step * 1.2, 0.016, 0.45);
    playCelloNote(score.nextTime + step * 0.5, upArpMidi, step * 1.2, 0.03, -0.2);
    playCelloNote(score.nextTime + step * 0.5, downArpMidi, step * 1.2, 0.027, 0.2);

    if (score.beat % 8 === 0) {
      playCelloNote(score.nextTime, score.baseMidi - 17, step * 3.2, 0.05, 0);
    }

    score.nextTime += step;
    score.beat += 1;
  }
}

function syncScoreToggleUi(isPlaying) {
  scoreToggle.textContent = isPlaying ? 'Stop score' : 'Play score';
  scoreToggle.setAttribute('aria-label', isPlaying ? 'Stop sound score' : 'Play sound score');
}

function startScore() {
  if (score.isPlaying) return;
  ensureAudio();
  if (score.audioCtx.state === 'suspended') {
    score.audioCtx.resume();
  }
  score.isPlaying = true;
  score.nextTime = score.audioCtx.currentTime + 0.03;
  score.timer = setInterval(scheduleScore, 45);
  syncScoreToggleUi(true);
}

function stopScore() {
  if (!score.isPlaying && !score.timer) return;
  score.isPlaying = false;
  if (score.timer) {
    clearInterval(score.timer);
    score.timer = null;
  }
  syncScoreToggleUi(false);
}

scoreToggle.addEventListener('click', () => {
  if (score.isPlaying) {
    stopScore();
  } else {
    startScore();
  }
});

sceneReload.addEventListener('click', () => {
  init();
  drawFrame();
});

window.addEventListener('beforeunload', stopScore);

// --- LIQUID BACKGROUND BLOBS ---
function initBlobs() {
  liquidBlobs = [];
  for (let i = 0; i < 12; i++) {
    liquidBlobs.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 80 + Math.random() * 260,
      color: LIQUID_COLORS[Math.floor(Math.random() * LIQUID_COLORS.length)],
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.14,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004,
    });
  }
}

function drawLiquid(t) {
  // Base de beige en capas superpuestas (sin depender de imágenes)
  const baseGrad = ctx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, BEIGE_LAYER_5);
  baseGrad.addColorStop(0.38, BEIGE_BG);
  baseGrad.addColorStop(1, BEIGE_LAYER_1);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(W * 0.2, H * 0.2, 0, W * 0.2, H * 0.2, Math.max(W, H) * 0.9);
  g1.addColorStop(0, BEIGE_LAYER_3 + '66');
  g1.addColorStop(1, BEIGE_LAYER_3 + '00');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.78, H * 0.28, 0, W * 0.78, H * 0.28, Math.max(W, H) * 0.82);
  g2.addColorStop(0, BEIGE_LAYER_2 + '66');
  g2.addColorStop(1, BEIGE_LAYER_2 + '00');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  const g3 = ctx.createRadialGradient(W * 0.55, H * 0.9, 0, W * 0.55, H * 0.9, Math.max(W, H) * 0.95);
  g3.addColorStop(0, BEIGE_LAYER_4 + '4a');
  g3.addColorStop(1, BEIGE_LAYER_4 + '00');
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, W, H);

  const g4 = ctx.createRadialGradient(W * 0.5, H * 0.48, 0, W * 0.5, H * 0.48, Math.max(W, H) * 0.72);
  g4.addColorStop(0, BEIGE_LAYER_5 + '55');
  g4.addColorStop(1, BEIGE_LAYER_5 + '00');
  ctx.fillStyle = g4;
  ctx.fillRect(0, 0, W, H);

  // Luces elípticas superpuestas (tipo escenario)
  function drawStageLight(cx, cy, radius, sx, sy, colorA, colorB) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, colorA);
    g.addColorStop(1, colorB);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const stagePulse = 0.03 * Math.sin(t * 0.0042);
  drawStageLight(
    W * 0.5,
    H * 0.54,
    Math.min(W, H) * 0.34,
    1.9 + stagePulse * 0.8,
    0.62 - stagePulse * 0.25,
    BEIGE_LAYER_5 + '90',
    BEIGE_LAYER_5 + '00'
  );
  drawStageLight(
    W * 0.38,
    H * 0.56,
    Math.min(W, H) * 0.29,
    1.55 - stagePulse * 0.4,
    0.58 + stagePulse * 0.25,
    BEIGE_LAYER_3 + '72',
    BEIGE_LAYER_3 + '00'
  );
  drawStageLight(
    W * 0.62,
    H * 0.56,
    Math.min(W, H) * 0.29,
    1.57 + stagePulse * 0.4,
    0.6 - stagePulse * 0.25,
    BEIGE_LAYER_2 + '72',
    BEIGE_LAYER_2 + '00'
  );
  drawStageLight(
    W * 0.5,
    H * 0.64,
    Math.min(W, H) * 0.26,
    1.35,
    0.58,
    BEIGE_LAYER_1 + '58',
    BEIGE_LAYER_1 + '00'
  );

  const drift = Math.sin(t * 0.0032) * 0.04;
  const g5 = ctx.createLinearGradient(0, H * (0.2 + drift), W, H * (0.95 - drift));
  g5.addColorStop(0, BEIGE_LAYER_6 + '1f');
  g5.addColorStop(0.5, BEIGE_LAYER_2 + '00');
  g5.addColorStop(1, BEIGE_LAYER_6 + '28');
  ctx.fillStyle = g5;
  ctx.fillRect(0, 0, W, H);

  const edge = ctx.createRadialGradient(W * 0.5, H * 0.55, Math.min(W, H) * 0.18, W * 0.5, H * 0.55, Math.max(W, H) * 0.78);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(70,50,20,0.2)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // Blobs orgánicos que se mueven lentamente
  for (const b of liquidBlobs) {
    b.x += b.vx + Math.sin(t * b.speed + b.phase) * 0.3;
    b.y += b.vy + Math.cos(t * b.speed * 0.7 + b.phase) * 0.25;
    if (b.x < -b.r) b.x = W + b.r;
    if (b.x > W + b.r) b.x = -b.r;
    if (b.y < -b.r) b.y = H + b.r;
    if (b.y > H + b.r) b.y = -b.r;

    const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    gr.addColorStop(0, b.color + 'cc');
    gr.addColorStop(1, b.color + '00');
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
  }
}

// --- LÍNEAS ARMÓNICAS que caen de arriba a abajo ---
let harmonicLines = [];
function initHarmonicLines() {
  harmonicLines = [];
  const count = 34;
  for (let i = 0; i < count; i++) {
    harmonicLines.push({
      x: (W / count) * i + (Math.random() - 0.5) * (W / count),
      y: Math.random() * H,          // posición actual
      speed: 0.8 + Math.random() * 1.8,
      len: 24 + Math.random() * 72,
      amp: 16 + Math.random() * 34,   // amplitud del vaivén horizontal
      freq: 0.004 + Math.random() * 0.009,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.75 ? WHITE_STITCH : randomAccentColor('99'),
      lw: 0.6 + Math.random() * 1.2,
    });
  }
}

function drawHarmonicLines(t, deltaScale) {
  for (const l of harmonicLines) {
    l.y += l.speed * deltaScale;
    if (l.y > H + l.len) { l.y = -l.len; l.x = Math.random() * W; }
    const sx = l.x + Math.sin(t * l.freq + l.phase) * l.amp; // vaivén armónico
    const alpha = 0.34 + 0.24 * Math.sin(t * l.freq * 0.5 + l.phase);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.lw;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 6;
    ctx.shadowColor = l.color;
    ctx.beginPath();
    ctx.moveTo(sx, l.y - l.len * 0.5);
    ctx.lineTo(sx, l.y + l.len * 0.5);
    ctx.stroke();
    ctx.restore();
  }
}

// --- MÚSICO: figura negra abstracta (como trazo de kanji) ---
class Musician {
  constructor(x, y, size, angle, variant) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.angle = angle;
    this.variant = variant; // 0=violin, 1=cello, 2=wind, 3=brass

    // Osciladores independientes por parte del cuerpo
    this.ph  = { // phases
      body:  Math.random() * Math.PI * 2,
      head:  Math.random() * Math.PI * 2,
      armL:  Math.random() * Math.PI * 2,
      armR:  Math.random() * Math.PI * 2,
      bow:   Math.random() * Math.PI * 2,
      inst:  Math.random() * Math.PI * 2,
    };
    this.sp = { // speeds — cada parte a su propio ritmo
      body:  0.005 + Math.random() * 0.007,
      head:  0.009 + Math.random() * 0.012,
      armL:  0.007 + Math.random() * 0.015,
      armR:  0.006 + Math.random() * 0.013,
      bow:   0.012 + Math.random() * 0.020,
      inst:  0.004 + Math.random() * 0.008,
    };
    this.amp = { // amplitudes
      body:  0.5 + Math.random() * 0.5,
      head:  0.3 + Math.random() * 0.5,
      armL:  0.8 + Math.random() * 1.2,
      armR:  0.6 + Math.random() * 1.0,
      bow:   1.0 + Math.random() * 1.5,
      inst:  0.4 + Math.random() * 0.7,
    };

    this.hasColor = Math.random() < 0.07;
    this.colorAccent = randomAccentColor();
    this.shirtSpots = Array.from(
      { length: 1 + Math.floor(Math.random() * 3) },
      () => ({
        x: -0.14 + Math.random() * 0.28,
        y: -0.12 + Math.random() * 0.42,
        rx: 0.028 + Math.random() * 0.03,
        ry: 0.02 + Math.random() * 0.026,
        rot: (Math.random() - 0.5) * 1.1,
      })
    );
    this.whiteStrokes = Array.from(
      { length: 1 + Math.floor(Math.random() * 2) },
      () => ({
        x1: -0.22 + Math.random() * 0.2,
        y1: -0.18 + Math.random() * 0.2,
        cx: -0.04 + Math.random() * 0.1,
        cy: -0.02 + Math.random() * 0.24,
        x2: 0.04 + Math.random() * 0.2,
        y2: 0.02 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2,
      })
    );
    this.hasHairAccent = Math.random() < 0.42;
    this.hasTattooAccent = Math.random() < 0.3;
    this.hasSockAccent = Math.random() < 0.38;

    // Pulso rítmico individual para cabeza y manos (desfasado entre músicos)
    this.rhythm = {
      bpm: 62 + Math.random() * 62,
      swing: 0.1 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
      armLPhase: Math.random() * Math.PI * 2,
      armRPhase: Math.random() * Math.PI * 2,
      headPhase: Math.random() * Math.PI * 2,
      nodShape: 0.45 + Math.random() * 0.45,
    };

    this.jitter = {
      headHz1: 0.008 + Math.random() * 0.025,
      headHz2: 0.02 + Math.random() * 0.055,
      armLHz1: 0.012 + Math.random() * 0.03,
      armLHz2: 0.026 + Math.random() * 0.06,
      armRHz1: 0.011 + Math.random() * 0.03,
      armRHz2: 0.024 + Math.random() * 0.06,
      headP1: Math.random() * Math.PI * 2,
      headP2: Math.random() * Math.PI * 2,
      armLP1: Math.random() * Math.PI * 2,
      armLP2: Math.random() * Math.PI * 2,
      armRP1: Math.random() * Math.PI * 2,
      armRP2: Math.random() * Math.PI * 2,
      headAmp: 0.18 + Math.random() * 0.45,
      armLAmp: 0.25 + Math.random() * 0.65,
      armRAmp: 0.25 + Math.random() * 0.65,
    };

    this.glyph = {
      sweep: (Math.random() - 0.5) * 0.6,
      lean: (Math.random() - 0.5) * 0.4,
      shoulderDrop: -0.28 + Math.random() * 0.12,
      waist: 0.05 + Math.random() * 0.22,
      headStretch: 0.9 + Math.random() * 0.5,
      neckTilt: (Math.random() - 0.5) * 0.9,
      brush: 0.8 + Math.random() * 0.7,
      armBend: 0.4 + Math.random() * 0.9,
    };
  }

  _o(key, t) { // oscillator shorthand
    return Math.sin(this.ph[key] + t * this.sp[key]) * this.amp[key];
  }

  _r(part, t) {
    const sec = t / 60;
    const base = (sec * this.rhythm.bpm) / 60 * Math.PI * 2;
    const partPhase =
      part === 'head'
        ? this.rhythm.headPhase
        : part === 'armL'
          ? this.rhythm.armLPhase
          : this.rhythm.armRPhase;
    const shape = part === 'head' ? this.rhythm.nodShape : 1;
    return (
      shape * Math.sin(base + this.rhythm.phase + partPhase) +
      this.rhythm.swing * Math.sin(base * 2.1 + partPhase * 0.7) +
      0.25 * Math.sin(base * 0.5 + partPhase * 1.4)
    );
  }

  draw(t) {
    const s = this.size;
    const oBody = this._o('body', t);
    const oHead = this._o('head', t);
    const oAL   = this._o('armL', t);
    const oAR   = this._o('armR', t);
    const oBow  = this._o('bow',  t);
    const oInst = this._o('inst', t);
    const rHead = this._r('head', t);
    const rArmL = this._r('armL', t);
    const rArmR = this._r('armR', t);
    const jHead =
      Math.sin(t * this.jitter.headHz1 + this.jitter.headP1) * this.jitter.headAmp +
      Math.sin(t * this.jitter.headHz2 + this.jitter.headP2) * this.jitter.headAmp * 0.55;
    const jArmL =
      Math.sin(t * this.jitter.armLHz1 + this.jitter.armLP1) * this.jitter.armLAmp +
      Math.sin(t * this.jitter.armLHz2 + this.jitter.armLP2) * this.jitter.armLAmp * 0.5;
    const jArmR =
      Math.sin(t * this.jitter.armRHz1 + this.jitter.armRP1) * this.jitter.armRAmp +
      Math.sin(t * this.jitter.armRHz2 + this.jitter.armRP2) * this.jitter.armRAmp * 0.5;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + oBody * 0.012);
    ctx.fillStyle = BLACK_BODY;
    ctx.strokeStyle = BLACK_BODY;
    ctx.lineWidth = s * (0.09 + this.glyph.brush * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.variant === 0) {
      // violinista
      this._bodyStroke(s, oBody, t);
      this._organicLimb(
        -s*0.3,
        -s*0.22 + oAL*0.2,
        -s*(0.45 + this.glyph.armBend*0.12),
        -s*0.44 + oAL*0.45 + rArmL*s*0.05,
        -s*0.7,
        -s*0.55 + oAL + rArmL*s*0.08 + jArmL*s*0.035,
        0.85
      );
      ctx.beginPath();
      ctx.ellipse(-s*0.7, -s*0.6 + oInst, s*0.13, s*0.28, -0.4 + oInst*0.04, 0, Math.PI*2);
      ctx.fill();
      // arco
      ctx.beginPath();
      ctx.moveTo(s*0.2,  -s*0.4 + oAR*0.3 + rArmR*s*0.05 + jArmR*s*0.02);
      ctx.quadraticCurveTo(
        s*0.55 + this.glyph.sweep*s*0.12,
        -s*0.32 + oBow*0.25,
        s*0.75,
        -s*0.1 + oBow*0.5 + rArmR*s*0.08 + jArmR*s*0.03
      );
      ctx.lineWidth = s*0.05;
      ctx.strokeStyle = WHITE_STITCH;
      ctx.stroke();
      ctx.strokeStyle = BLACK_BODY;

    } else if (this.variant === 1) {
      // cellista
      this._bodyStroke(s * 1.1, oBody, t);
      this._organicLimb(
        0,
        s*0.1,
        s*0.18,
        s*0.32 + oAR*0.2,
        s*0.2,
        s*0.55 + oAR*0.4 + rArmR*s*0.06 + jArmR*s*0.03,
        0.9
      );
      ctx.beginPath();
      ctx.ellipse(s*0.25, s*0.55 + oInst, s*0.18, s*0.42, 0.25 + oInst*0.03, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s*0.3,  oAL*0.3 + rArmL*s*0.05 + jArmL*s*0.02);
      ctx.quadraticCurveTo(
        s*0.12,
        s*0.08 + oBow*0.22,
        s*0.55,
        s*0.35 + oBow*0.4 + rArmR*s*0.08 + jArmR*s*0.03
      );
      ctx.lineWidth = s*0.05;
      ctx.strokeStyle = WHITE_STITCH;
      ctx.stroke();
      ctx.strokeStyle = BLACK_BODY;

    } else if (this.variant === 2) {
      // viento
      this._bodyStroke(s, oBody, t);
      this._organicLimb(
        -s*0.25,
        -s*0.25,
        -s*0.31,
        -s*0.02 + oAL*0.18,
        -s*0.28,
        s*0.15 + oAL*0.4 + rArmL*s*0.05 + jArmL*s*0.025,
        0.8
      );
      this._organicLimb(
        s*0.25,
        -s*0.25,
        s*0.31,
        -s*0.02 + oAR*0.18,
        s*0.28,
        s*0.15 + oAR*0.4 + rArmR*s*0.05 + jArmR*s*0.025,
        0.8
      );
      ctx.beginPath();
      ctx.roundRect(-s*0.07, -s*0.25 + oInst*0.2, s*0.14, s*0.7, s*0.04);
      ctx.fill();

    } else {
      // metales
      this._bodyStroke(s, oBody, t);
      this._organicLimb(
        s*0.3,
        -s*0.1 + oAR*0.3,
        s*0.48 + this.glyph.sweep*s*0.1,
        -s*0.12 + oAR*0.2,
        s*0.65,
        -s*0.05 + oInst*0.4 + rArmR*s*0.06 + jArmR*s*0.03,
        0.8
      );
      ctx.beginPath();
      ctx.arc(s*0.72, -s*0.05 + oInst*0.4, s*0.2, 0, Math.PI*2);
      ctx.fill();
    }

    // Cabeza — su propio ritmo
    ctx.fillStyle = BLACK_BODY;
    const headX = oHead * 0.08 + rHead * s * 0.018 + jHead * s * 0.014;
    const headY = -s*0.82 + oHead*0.12 + rHead * s * 0.028 + jHead * s * 0.02;

    // manchas blancas de camisa
    ctx.fillStyle = '#ffffffbf';
    for (const spot of this.shirtSpots) {
      ctx.beginPath();
      ctx.ellipse(
        spot.x * s,
        spot.y * s + oBody * 0.02,
        spot.rx * s,
        spot.ry * s,
        spot.rot + oBody * 0.03,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffffb5';
    ctx.lineWidth = s * 0.016;
    for (const stroke of this.whiteStrokes) {
      const sway = Math.sin(t * 0.018 + stroke.phase) * s * 0.015;
      ctx.beginPath();
      ctx.moveTo(stroke.x1 * s, stroke.y1 * s + sway);
      ctx.quadraticCurveTo(
        stroke.cx * s,
        stroke.cy * s + sway * 1.2,
        stroke.x2 * s,
        stroke.y2 * s + sway
      );
      ctx.stroke();
    }
    ctx.strokeStyle = BLACK_BODY;

    ctx.beginPath();
    ctx.ellipse(
      headX,
      headY,
      s * 0.16,
      s * (0.16 + this.glyph.headStretch * 0.06),
      this.glyph.neckTilt * 0.22,
      0,
      Math.PI*2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headX - s * 0.05, headY + s * 0.11);
    ctx.quadraticCurveTo(
      headX + this.glyph.neckTilt * s * 0.09,
      headY + s * 0.2,
      headX + this.glyph.neckTilt * s * 0.07,
      headY + s * 0.31
    );
    ctx.lineWidth = s * 0.04;
    ctx.stroke();

    if (this.hasHairAccent) {
      ctx.beginPath();
      ctx.ellipse(headX + s * 0.01, headY - s * 0.07, s * 0.11, s * 0.06, this.glyph.neckTilt * 0.4, Math.PI, 0);
      ctx.lineWidth = s * 0.04;
      ctx.strokeStyle = this.colorAccent + 'f0';
      ctx.stroke();
      ctx.strokeStyle = BLACK_BODY;
    }

    // Collar blanco
    ctx.beginPath();
    ctx.arc(
      oHead * 0.05 + rHead * s * 0.012 + jHead * s * 0.008,
      -s*0.6 + rHead * s * 0.01 + jHead * s * 0.008,
      s*0.062,
      0,
      Math.PI*2
    );
    ctx.fillStyle = '#ffffffd9';
    ctx.fill();

    if (this.hasTattooAccent) {
      ctx.beginPath();
      ctx.arc(-s * 0.25, -s * 0.2 + oAL * 0.06 + rArmL * s * 0.02, s * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = this.colorAccent + 'd9';
      ctx.fill();
    }

    if (this.hasSockAccent) {
      ctx.beginPath();
      ctx.roundRect(-s * 0.08, s * 0.43 + oBody * 0.03, s * 0.06, s * 0.09, s * 0.015);
      ctx.roundRect(s * 0.02, s * 0.43 + oBody * 0.03, s * 0.06, s * 0.09, s * 0.015);
      ctx.fillStyle = this.colorAccent + 'e8';
      ctx.fill();
    }

    if (this.hasColor) {
      ctx.beginPath();
      ctx.ellipse(0, -s*0.3, s*0.15, s*0.25, 0, 0, Math.PI*2);
      ctx.fillStyle = this.colorAccent + 'cc';
      ctx.fill();
    }

    ctx.restore();
  }

  _bodyStroke(s, oBody, t) {
    const sway = oBody * 0.08 + Math.sin(t * 0.01 + this.ph.body) * 0.05;
    const shoulderY = s * this.glyph.shoulderDrop;
    const waistY = s * (0.18 + this.glyph.waist);
    const lean = this.glyph.lean * s;

    ctx.beginPath();
    ctx.moveTo(-s * 0.03, -s * 0.68);
    ctx.bezierCurveTo(
      -s * (0.26 + this.glyph.sweep * 0.1),
      shoulderY,
      s * (0.16 + sway) + lean,
      waistY,
      s * (0.03 + sway) + lean,
      s * 0.43
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-s * 0.38, shoulderY + s * 0.06);
    ctx.quadraticCurveTo(
      s * this.glyph.sweep * 0.24,
      shoulderY - s * 0.09,
      s * 0.34 + lean * 0.35,
      shoulderY + s * 0.04
    );
    ctx.stroke();

    // pequeño trazo "flick" de caligrafía para romper la simetría de T
    ctx.beginPath();
    ctx.moveTo(s * 0.06 + lean * 0.6, s * 0.2);
    ctx.quadraticCurveTo(
      s * 0.22 + lean,
      s * 0.31,
      s * 0.1 + lean * 0.3,
      s * 0.46
    );
    ctx.lineWidth = s * 0.05;
    ctx.stroke();
  }

  _organicLimb(x1, y1, cx, cy, x2, y2, widthScale = 1) {
    const baseWidth = this.size * (0.06 + this.glyph.brush * 0.05) * widthScale;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.lineWidth = baseWidth;
    ctx.stroke();
  }
}

// --- PESPUNTES / STITCHES blancos y de color (capa superior) ---
class Stitch {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.len = 4 + Math.random() * 18;
    this.angle = Math.random() * Math.PI;
    this.color = Math.random() < 0.72 ? WHITE_STITCH : randomAccentColor('dd');
    this.life = init ? Math.random() : 0;
    this.speed = 0.002 + Math.random() * 0.003;
    this.maxLife = 0.7 + Math.random() * 0.6;
    this.lw = 0.8 + Math.random() * 1.8;
  }
  draw(t) {
    this.life += this.speed;
    if (this.life > this.maxLife) this.reset(false);
    const alpha = Math.sin((this.life / this.maxLife) * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const dx = Math.cos(this.angle) * this.len * 0.5;
    const dy = Math.sin(this.angle) * this.len * 0.5;
    ctx.moveTo(this.x - dx, this.y - dy);
    ctx.lineTo(this.x + dx, this.y + dy);
    ctx.stroke();
    ctx.restore();
  }
}

class FigureSpark {
  constructor() { this.reset(true); }
  reset(init) {
    const cx = W * 0.5;
    const cy = H * 0.56;
    const spreadX = Math.min(W, H) * (0.2 + Math.random() * 0.16);
    const spreadY = Math.min(W, H) * (0.1 + Math.random() * 0.12);
    this.x = cx + (Math.random() - 0.5) * spreadX * 2;
    this.y = cy + (Math.random() - 0.5) * spreadY * 2;
    this.vx = (Math.random() - 0.5) * 0.9;
    this.vy = -0.16 - Math.random() * 0.42;
    this.size = 0.95 + Math.random() * 2.0;
    this.color = randomAccentColor();
    this.life = init ? Math.random() : 0;
    this.speed = 0.012 + Math.random() * 0.03;
    this.maxLife = 0.48 + Math.random() * 0.55;
    this.twinkle = 0.04 + Math.random() * 0.08;
    this.phase = Math.random() * Math.PI * 2;
  }
  draw(t) {
    this.life += this.speed;
    if (this.life > this.maxLife) this.reset(false);
    this.x += this.vx + Math.sin(t * this.twinkle + this.phase) * 0.45;
    this.y += this.vy + Math.cos(t * this.twinkle * 0.7 + this.phase) * 0.3;
    const alpha = Math.sin((this.life / this.maxLife) * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha * 0.68;
    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2.2);
    glow.addColorStop(0, this.color + 'bb');
    glow.addColorStop(1, this.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color + 'dd';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initScene() {
  initBlobs();
  musicians = [];

  // Disposición orquestal: semicírculo central
  const cx = W * 0.5;
  const cy = H * 0.56;
  const totalMusicians = Math.floor(70 + Math.random()*20);

  // Anillos concéntricos (cuerdas al frente, vientos/metales atrás)
  const rings = [
    { r: Math.min(W,H)*0.09, count: 10, variant: 0, sizeScale: 1.0 },
    { r: Math.min(W,H)*0.16, count: 14, variant: 0, sizeScale: 0.95 },
    { r: Math.min(W,H)*0.22, count: 16, variant: 0, sizeScale: 0.9 },
    { r: Math.min(W,H)*0.29, count: 14, variant: 1, sizeScale: 0.88 },
    { r: Math.min(W,H)*0.35, count: 12, variant: 2, sizeScale: 0.85 },
    { r: Math.min(W,H)*0.41, count: 10, variant: 3, sizeScale: 0.82 },
  ];

  for (const ring of rings) {
    const startAngle = -Math.PI * 0.85;
    const endAngle   =  Math.PI * 0.85;
    const span = endAngle - startAngle;
    for (let i = 0; i < ring.count; i++) {
      const a = startAngle + (span / (ring.count - 1 || 1)) * i;
      const x = cx + Math.cos(a) * ring.r;
      const y = cy + Math.sin(a) * ring.r * 0.62; // perspectiva
      const baseSize = Math.min(W,H) * 0.035 * ring.sizeScale;
      const faceAngle = (Math.random()-0.5)*0.3;
      const v = ring.variant === 0 ? (i % 5 === 0 ? 1 : 0) : ring.variant;
      musicians.push(new Musician(x, y, baseSize, faceAngle, v));
    }
  }

  // Director
  musicians.push(new Musician(cx, cy + Math.min(W,H)*0.04, Math.min(W,H)*0.042, 0, 2));

  // Stitches
  stitches = [];
  for (let i = 0; i < 180; i++) stitches.push(new Stitch());
  figureSparks = [];
  for (let i = 0; i < 105; i++) figureSparks.push(new FigureSpark());
}

function init() {
  initScene();
  initHarmonicLines();
}

init();

let t = 0;
let lastFrameMs = null;
const FLOW_SPEED_MULT = 2.5;
function drawFrame() {
  const nowMs = performance.now();
  if (lastFrameMs === null) lastFrameMs = nowMs;
  const deltaMs = nowMs - lastFrameMs;
  lastFrameMs = nowMs;
  const deltaScale = Math.max(0.2, Math.min(120, deltaMs / (1000 / 60)));
  const flowDelta = deltaScale * FLOW_SPEED_MULT;
  t += flowDelta;
  ctx.clearRect(0,0,W,H);

  // Capa 1: fondo líquido beige
  drawLiquid(t);

  // Capa 2: geometría negra de músicos (ordenados por y para pseudo-perspectiva)
  const sorted = [...musicians].sort((a,b) => a.y - b.y);
  for (const m of sorted) m.draw(t);

  // Capa 3: pespuntes blancos y de color
  for (const s of stitches) s.draw(t);
  for (const fs of figureSparks) fs.draw(t);

  // Capa 4: líneas armónicas que caen
  drawHarmonicLines(t, flowDelta);
}

let animationFrameId = null;
function startAnimation() {
  if (animationFrameId !== null) return;

  const animate = () => {
    drawFrame();
    animationFrameId = window.requestAnimationFrame(animate);
  };

  drawFrame();
  animationFrameId = window.requestAnimationFrame(animate);
}

if (document.readyState === 'complete') {
  startAnimation();
} else {
  window.addEventListener('load', startAnimation, { once: true });
}
