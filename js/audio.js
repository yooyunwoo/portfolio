let enabled = true;
let audioContext = null;

const soundPresets = {
  flip: { frequency: 420, duration: 0.045, type: 'sine' },
  match: { frequency: 720, duration: 0.12, type: 'sine' },
  mismatch: { frequency: 180, duration: 0.1, type: 'triangle' },
  complete: { frequency: 880, duration: 0.2, type: 'sine' },
};

function setSoundEnabled(value) {
  enabled = Boolean(value);
  return enabled;
}

function toggleSound() {
  return setSoundEnabled(!enabled);
}

function isSoundEnabled() {
  return enabled;
}

function playSound(name) {
  if (!enabled || !soundPresets[name]) return;

  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return;

  audioContext ??= new AudioContext();
  const preset = soundPresets[name];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = preset.type;
  oscillator.frequency.setValueAtTime(preset.frequency, now);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + preset.duration);
}
