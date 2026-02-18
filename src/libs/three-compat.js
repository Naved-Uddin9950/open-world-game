import * as THREE from './three.module.min.js';
export * from './three.module.min.js';

// Provide compatibility aliases for older/newer Three builds
export const sRGBEncoding = THREE.sRGBEncoding !== undefined ? THREE.sRGBEncoding : (THREE.SRGBColorSpace !== undefined ? THREE.SRGBColorSpace : undefined);
export const LinearEncoding = THREE.LinearEncoding !== undefined ? THREE.LinearEncoding : undefined;
export const SRGBColorSpace = THREE.SRGBColorSpace !== undefined ? THREE.SRGBColorSpace : undefined;

// Default export for any consumers expecting a namespace default
export default THREE;
