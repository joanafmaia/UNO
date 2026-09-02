/**
 * Efeitos sonoros sintetizados (Web Audio API) — sem ficheiros externos.
 */
const MUTE_KEY = "uno-muted";

let ctx = null;

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(frequency, start, duration, type = "square", gain = 0.08) {
  const ac = audio();
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime + start);
  amp.gain.setValueAtTime(0.0001, ac.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

export const sounds = {
  play() {
    tone(520, 0, 0.08, "square", 0.06);
    tone(780, 0.05, 0.07, "square", 0.04);
  },
  draw() {
    tone(280, 0, 0.1, "triangle", 0.06);
    tone(340, 0.08, 0.1, "triangle", 0.05);
  },
  skip() {
    tone(880, 0, 0.07, "square", 0.08);
    tone(220, 0.08, 0.16, "sawtooth", 0.07);
  },
  reverse() {
    tone(392, 0, 0.1, "triangle", 0.08);
    tone(330, 0.08, 0.12, "triangle", 0.08);
    tone(262, 0.18, 0.14, "triangle", 0.09);
  },
  jump() {
    tone(660, 0, 0.06, "square", 0.09);
    tone(880, 0.05, 0.08, "square", 0.1);
    tone(1174, 0.12, 0.1, "square", 0.08);
  },
  plus4() {
    tone(220, 0, 0.18, "sawtooth", 0.1);
    tone(180, 0.14, 0.22, "sawtooth", 0.1);
    tone(140, 0.3, 0.28, "sawtooth", 0.12);
  },
  catch() {
    tone(740, 0, 0.08, "square", 0.09);
    tone(988, 0.08, 0.12, "square", 0.1);
  },
  uno() {
    tone(392, 0, 0.12, "triangle", 0.1);
    tone(494, 0.1, 0.12, "triangle", 0.1);
    tone(587, 0.2, 0.14, "triangle", 0.11);
    tone(784, 0.34, 0.28, "triangle", 0.13);
  },
  win() {
    tone(523, 0, 0.12, "triangle", 0.11);
    tone(659, 0.12, 0.12, "triangle", 0.11);
    tone(784, 0.24, 0.14, "triangle", 0.12);
    tone(1046, 0.4, 0.32, "triangle", 0.14);
  },
  blitz() {
    tone(180, 0, 0.12, "sawtooth", 0.1);
    tone(140, 0.1, 0.2, "sawtooth", 0.1);
  },
};

export function playSound(name) {
  if (isMuted()) return;
  try {
    sounds[name]?.();
  } catch {
    /* autoplay bloqueado até haver um clique */
  }
}
