import { DEER_FEAR_RADIUS } from '../utils/constants.js';
import '../libs/brain.js';

const NeuralNetwork = (typeof brain !== 'undefined' && brain.NeuralNetwork)
  ? brain.NeuralNetwork
  : (typeof globalThis !== 'undefined' && globalThis.brain && globalThis.brain.NeuralNetwork)
  ? globalThis.brain.NeuralNetwork
  : null;

const net = NeuralNetwork ? new NeuralNetwork({ hiddenLayers: [5] }) : null;

// Inputs: player, wolf normalized by DEER_FEAR_RADIUS
// Outputs: idle, graze, runAway, alert
const trainingData = [
  { input: { player: 0.02, wolf: 0.9 }, output: { runAway: 1 } },
  { input: { player: 0.9, wolf: 0.02 }, output: { runAway: 1 } },
  { input: { player: 0.4, wolf: 0.7 }, output: { alert: 1 } },
  { input: { player: 0.9, wolf: 0.9 }, output: { graze: 1 } },
  { input: { player: 0.8, wolf: 0.8 }, output: { idle: 1 } },
];

if (net && typeof net.train === 'function') net.train(trainingData, { iterations: 200, log: false });

export function decideDeerBehavior(distances) {
  // distances: { player, wolf }
  const input = {
    player: Math.min(1, distances.player / DEER_FEAR_RADIUS),
    wolf: Math.min(1, distances.wolf / DEER_FEAR_RADIUS),
  };

  if (net && typeof net.run === 'function') {
    const out = net.run(input);
    let best = 'idle';
    let bestVal = -Infinity;
    for (const k of Object.keys(out)) {
      if (out[k] > bestVal) {
        bestVal = out[k];
        best = k;
      }
    }
    return best; // 'idle' | 'graze' | 'runAway' | 'alert'
  }

  // Fallback heuristic
  if (distances.wolf <= DEER_FEAR_RADIUS) return 'runAway';
  if (distances.player <= DEER_FEAR_RADIUS) return 'runAway';
  if (Math.random() < 0.06) return 'graze';
  return 'idle';
}

export { net as deerNet };
