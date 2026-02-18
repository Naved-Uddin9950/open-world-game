const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playSound = (freq, duration, type = "sine") => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type; // sine, square, sawtooth
  osc.frequency.value = freq;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + duration,
  );

  osc.stop(audioCtx.currentTime + duration);
};

export const playNote = (note, duration, instrument = "sine") => {
  const frequencies = {
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.0,
    A4: 440.0,
    B4: 493.88,
    C5: 523.25,
  };

  playSound(frequencies[note], duration, instrument);
};

export const jumpSound = () => {
  playSound(600, 0.15, "square");
};

export const collisionSound = () => {
  playSound(120, 0.3, "sawtooth");
};

export const treeHit = () => {
  playSound(80, 0.4, "triangle");
};

export const rockHit = () => {
  playSound(200, 0.2, "square");
};

export const chickenSound = () => {
  playNote("G4", 0.2);
  playNote("C5", 0.2);
};

export const cowSound = () => {
  playNote("E4", 0.3);
  playNote("G4", 0.3);
};

export const deerSound = () => {
  playNote("F4", 0.4);
  playNote("A4", 0.4);
};

export const wolfSound = () => {
  playNote("D4", 0.5);
  playNote("F4", 0.5);
};
