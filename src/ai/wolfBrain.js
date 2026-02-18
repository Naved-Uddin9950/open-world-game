import {
  WOLF_DETECTION_RADIUS,
} from '../utils/constants.js';

// Ensure the brain UMD bundle is executed so a global `brain` is available
import '../libs/brain.js';

const NeuralNetwork = (typeof brain !== 'undefined' && brain.NeuralNetwork)
  ? brain.NeuralNetwork
  : (typeof globalThis !== 'undefined' && globalThis.brain && globalThis.brain.NeuralNetwork)
  ? globalThis.brain.NeuralNetwork
  : null;

const net = NeuralNetwork ? new NeuralNetwork({ hiddenLayers: [6] }) : null;

// Inputs: player, chicken, deer, cow -> normalized (0..1) where 0 = very close
// Outputs: idle, chase, attack
const trainingData = [
  { input: { player: 0.02, chicken: 0.9, deer: 0.9, cow: 0.9 }, output: { attack: 1 } },
  { input: { player: 0.5, chicken: 0.2, deer: 0.9, cow: 0.9 }, output: { chase: 1 } },
  { input: { player: 0.9, chicken: 0.9, deer: 0.9, cow: 0.9 }, output: { idle: 1 } },
  { input: { player: 0.2, chicken: 0.1, deer: 0.4, cow: 0.9 }, output: { attack: 1 } },
  { input: { player: 0.4, chicken: 0.5, deer: 0.6, cow: 0.5 }, output: { chase: 1 } },
];

if (net && typeof net.train === 'function') net.train(trainingData, { iterations: 200, log: false });

export function decideWolfBehavior(distances) {
  // distances: { player, chicken, deer, cow } absolute distances (meters)
  const input = {
    player: Math.min(1, distances.player / WOLF_DETECTION_RADIUS),
    chicken: Math.min(1, distances.chicken / WOLF_DETECTION_RADIUS),
    deer: Math.min(1, distances.deer / WOLF_DETECTION_RADIUS),
    cow: Math.min(1, distances.cow / WOLF_DETECTION_RADIUS),
  };

  if (net && typeof net.run === 'function') {
    const out = net.run(input);
    // pick highest
    let best = 'idle';
    let bestVal = -Infinity;
    for (const k of Object.keys(out)) {
      if (out[k] > bestVal) {
        bestVal = out[k];
        best = k;
      }
    }
    return best; // 'idle' | 'chase' | 'attack'
  }

  // Fallback heuristic when brain bundle isn't available: choose nearest target
  const within = (d) => d <= WOLF_DETECTION_RADIUS;
  const targets = [];
  if (within(distances.player)) targets.push({ t: 'player', d: distances.player });
  if (within(distances.chicken)) targets.push({ t: 'chicken', d: distances.chicken });
  if (within(distances.deer)) targets.push({ t: 'deer', d: distances.deer });
  if (within(distances.cow)) targets.push({ t: 'cow', d: distances.cow });
  if (targets.length === 0) return 'idle';
  targets.sort((a,b)=>a.d-b.d);
  return (targets[0].d <= WOLF_ATTACK_RANGE) ? 'attack' : 'chase';
}

export { net as wolfNet };
