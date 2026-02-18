import { CHICKEN_FEAR_RADIUS } from '../utils/constants.js';
import '../libs/brain.js';

const NeuralNetwork = (typeof brain !== 'undefined' && brain.NeuralNetwork)
  ? brain.NeuralNetwork
  : (typeof globalThis !== 'undefined' && globalThis.brain && globalThis.brain.NeuralNetwork)
  ? globalThis.brain.NeuralNetwork
  : null;

const net = NeuralNetwork ? new NeuralNetwork({ hiddenLayers: [4] }) : null;

// Inputs: player, wolf normalized by CHICKEN_FEAR_RADIUS (0..1)
// Outputs: idle, wander, runAway
const trainingData = [
  { input: { player: 0.02, wolf: 0.9 }, output: { runAway: 1 } },
  { input: { player: 0.5, wolf: 0.9 }, output: { wander: 1 } },
  { input: { player: 0.9, wolf: 0.9 }, output: { idle: 1 } },
  { input: { player: 0.2, wolf: 0.3 }, output: { runAway: 1 } },
  { input: { player: 0.8, wolf: 0.05 }, output: { runAway: 1 } },
];

if (net && typeof net.train === 'function') net.train(trainingData, { iterations: 150, log: false });

export function decideChickenBehavior(distances) {
  // distances: { player, wolf }
  const input = {
    player: Math.min(1, distances.player / CHICKEN_FEAR_RADIUS),
    wolf: Math.min(1, distances.wolf / CHICKEN_FEAR_RADIUS),
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
    return best; // 'idle' | 'wander' | 'runAway'
  }

  // Fallback heuristic
  if (distances.wolf <= CHICKEN_FEAR_RADIUS) return 'runAway';
  if (distances.player <= CHICKEN_FEAR_RADIUS) return 'runAway';
  if (Math.random() < 0.08) return 'wander';
  return 'idle';
}

export { net as chickenNet };
