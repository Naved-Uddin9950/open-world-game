import { COW_WOLF_FEAR_RADIUS } from '../utils/constants.js';
import '../libs/brain.js';

const NeuralNetwork = (typeof brain !== 'undefined' && brain.NeuralNetwork)
  ? brain.NeuralNetwork
  : (typeof globalThis !== 'undefined' && globalThis.brain && globalThis.brain.NeuralNetwork)
  ? globalThis.brain.NeuralNetwork
  : null;

const net = NeuralNetwork ? new NeuralNetwork({ hiddenLayers: [4] }) : null;

// Inputs: wolf distance normalized
// Outputs: idle, graze, walk, fleeFromWolf
const trainingData = [
  { input: { wolf: 0.02 }, output: { fleeFromWolf: 1 } },
  { input: { wolf: 0.5 }, output: { graze: 1 } },
  { input: { wolf: 0.9 }, output: { walk: 1 } },
  { input: { wolf: 0.8 }, output: { idle: 1 } },
];

if (net && typeof net.train === 'function') net.train(trainingData, { iterations: 150, log: false });

export function decideCowBehavior(distances) {
  // distances: { wolf }
  const input = {
    wolf: Math.min(1, distances.wolf / COW_WOLF_FEAR_RADIUS),
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
    return best; // 'idle' | 'graze' | 'walk' | 'fleeFromWolf'
  }

  // Fallback heuristic
  if (distances.wolf <= COW_WOLF_FEAR_RADIUS) return 'fleeFromWolf';
  if (Math.random() < 0.05) return 'graze';
  return 'idle';
}

export { net as cowNet };
