// ============================================================
// forestManager.js — Vegetation orchestrator per chunk
// ============================================================
import { SimplexNoise } from '../../utils/noise.js';
import { TerrainGenerator } from '../terrain/terrainGenerator.js';
import { TreeSystem } from './treeSystem.js';
import { GrassSystem } from './grassSystem.js';
import { RockSystem } from './rockSystem.js';
import {
    CHUNK_SIZE,
    TERRAIN_HEIGHT_SCALE,
    BIOME_GRASS_MAX,
    BIOME_DIRT_MAX,
    BIOME_ROCK_MAX,
    TREE_DENSITY_GRASS,
    TREE_DENSITY_DIRT,
    TREE_DENSITY_ROCK,
    TREE_SPACING,
    TREE_MAX_PER_CHUNK,
    TREE_MIN_SCALE,
    TREE_MAX_SCALE,
    TREE_SLOPE_MAX,
    GRASS_DENSITY_GRASS,
    GRASS_DENSITY_DIRT,
    GRASS_SPACING,
    GRASS_MAX_PER_CHUNK,
    GRASS_HEIGHT_MIN,
    GRASS_HEIGHT_MAX,
    ROCK_DENSITY_GRASS,
    ROCK_DENSITY_DIRT,
    ROCK_DENSITY_ROCK,
    ROCK_SPACING,
    ROCK_BOULDER_SCALE,
    ROCK_PEBBLE_SCALE,
} from '../../utils/constants.js';

export class ForestManager {
    /**
     * @param {THREE.Scene}       scene
     * @param {TerrainGenerator}  terrainGen
     * @param {number}            [seed=42]
     */
    constructor(scene, terrainGen, seed = 42) {
        this.scene = scene;
        this._terrain = terrainGen;
        this._noise = new SimplexNoise(seed * 3.141);

        this._treeSystem = new TreeSystem();
        this._grassSystem = new GrassSystem();
        this._rockSystem = new RockSystem();

        /** @type {Map<string, {trees:THREE.Group, grass:THREE.Object3D, rocks:THREE.Group}>} */
        this._chunkVegetation = new Map();
    }

    /**
     * Generate and add vegetation for a chunk.
     * @param {number} cx
     * @param {number} cz
     */
    loadChunkVegetation(cx, cz) {
        const key = `${cx},${cz}`;
        if (this._chunkVegetation.has(key)) return;

        const treePlacements = this._sampleTrees(cx, cz);
        const grassPlacements = this._sampleGrass(cx, cz);
        const rockPlacements = this._sampleRocks(cx, cz);

        const trees = this._treeSystem.createChunkTrees(treePlacements);
        const grass = this._grassSystem.createChunkGrass(grassPlacements);
        const rocks = this._rockSystem.createChunkRocks(rockPlacements);

        this.scene.add(trees);
        this.scene.add(grass);
        this.scene.add(rocks);

        this._chunkVegetation.set(key, { trees, grass, rocks });
    }

    /**
     * Remove and dispose vegetation for a chunk.
     * @param {number} cx
     * @param {number} cz
     */
    unloadChunkVegetation(cx, cz) {
        const key = `${cx},${cz}`;
        const veg = this._chunkVegetation.get(key);
        if (!veg) return;

        this.scene.remove(veg.trees);
        this.scene.remove(veg.grass);
        this.scene.remove(veg.rocks);

        this._treeSystem.dispose(veg.trees);
        this._grassSystem.dispose(veg.grass);
        this._rockSystem.dispose(veg.rocks);

        this._chunkVegetation.delete(key);
    }

    /**
     * Update LOD and visibility for all active vegetation.
     * @param {THREE.Vector3} cameraPos
     */
    update(cameraPos) {
        for (const [key, veg] of this._chunkVegetation) {
            // Parse chunk centre from key
            const [cx, cz] = key.split(',').map(Number);
            const centreX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
            const centreZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2;

            const dx = cameraPos.x - centreX;
            const dz = cameraPos.z - centreZ;
            const dist = Math.sqrt(dx * dx + dz * dz);

            this._treeSystem.updateLOD(veg.trees, dist);
            this._grassSystem.updateVisibility(veg.grass, dist);
        }
    }

    /** Dispose all vegetation. */
    dispose() {
        for (const [key, veg] of this._chunkVegetation) {
            this.scene.remove(veg.trees);
            this.scene.remove(veg.grass);
            this.scene.remove(veg.rocks);
            this._treeSystem.dispose(veg.trees);
            this._grassSystem.dispose(veg.grass);
            this._rockSystem.dispose(veg.rocks);
        }
        this._chunkVegetation.clear();
    }

    // ── Placement sampling ──────────────────────────────────

    /**
     * Get biome density factor and zone for a normalised height.
     * @param {number} h normalised [0,1]
     * @returns {{zone:string, treeDensity:number, grassDensity:number, rockDensity:number}}
     */
    _getBiomeDensity(h) {
        if (h < BIOME_GRASS_MAX) {
            return {
                zone: 'grass',
                treeDensity: TREE_DENSITY_GRASS,
                grassDensity: GRASS_DENSITY_GRASS,
                rockDensity: ROCK_DENSITY_GRASS,
            };
        } else if (h < BIOME_DIRT_MAX) {
            return {
                zone: 'dirt',
                treeDensity: TREE_DENSITY_DIRT,
                grassDensity: GRASS_DENSITY_DIRT,
                rockDensity: ROCK_DENSITY_DIRT,
            };
        } else if (h < BIOME_ROCK_MAX) {
            return {
                zone: 'rock',
                treeDensity: TREE_DENSITY_ROCK,
                grassDensity: 0,
                rockDensity: ROCK_DENSITY_ROCK,
            };
        } else {
            return { zone: 'snow', treeDensity: 0, grassDensity: 0, rockDensity: 0 };
        }
    }

    /**
     * Deterministic pseudo-random from noise for placement decisions.
     */
    _hash(x, z, offset = 0) {
        return (this._noise.noise2D(x * 0.37 + offset, z * 0.37 + offset) + 1) * 0.5;
    }

    _sampleTrees(cx, cz) {
        const placements = [];
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;

        for (let lx = 0; lx < CHUNK_SIZE; lx += TREE_SPACING) {
            for (let lz = 0; lz < CHUNK_SIZE; lz += TREE_SPACING) {
                // Jitter position for natural look
                const jx = this._hash(originX + lx, originZ + lz, 100) * TREE_SPACING * 0.8;
                const jz = this._hash(originX + lx, originZ + lz, 200) * TREE_SPACING * 0.8;

                const worldX = originX + lx + jx;
                const worldZ = originZ + lz + jz;
                const height = this._terrain.getHeightAt(worldX, worldZ);
                const slope = this._terrain.getSlopeAt(worldX, worldZ);
                const normH = Math.max(0, height) / TERRAIN_HEIGHT_SCALE;

                if (slope > TREE_SLOPE_MAX) continue;

                const { treeDensity } = this._getBiomeDensity(normH);
                const roll = this._hash(worldX, worldZ, 300);

                if (roll < treeDensity) {
                    const scale = TREE_MIN_SCALE + this._hash(worldX, worldZ, 400) * (TREE_MAX_SCALE - TREE_MIN_SCALE);
                    placements.push({
                        x: worldX,
                        y: height,
                        z: worldZ,
                        scale,
                        rotation: this._hash(worldX, worldZ, 500) * Math.PI * 2,
                        colorIdx: Math.floor(this._hash(worldX, worldZ, 600) * 4),
                    });
                }

                if (placements.length >= TREE_MAX_PER_CHUNK) break;
            }
            if (placements.length >= TREE_MAX_PER_CHUNK) break;
        }

        return placements;
    }

    _sampleGrass(cx, cz) {
        const placements = [];
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;

        for (let lx = 0; lx < CHUNK_SIZE; lx += GRASS_SPACING) {
            for (let lz = 0; lz < CHUNK_SIZE; lz += GRASS_SPACING) {
                const jx = this._hash(originX + lx, originZ + lz, 700) * GRASS_SPACING * 0.9;
                const jz = this._hash(originX + lx, originZ + lz, 800) * GRASS_SPACING * 0.9;

                const worldX = originX + lx + jx;
                const worldZ = originZ + lz + jz;
                const height = this._terrain.getHeightAt(worldX, worldZ);
                const normH = Math.max(0, height) / TERRAIN_HEIGHT_SCALE;

                const { grassDensity } = this._getBiomeDensity(normH);
                const roll = this._hash(worldX, worldZ, 900);

                if (roll < grassDensity) {
                    const bladeHeight = GRASS_HEIGHT_MIN + this._hash(worldX, worldZ, 1000) * (GRASS_HEIGHT_MAX - GRASS_HEIGHT_MIN);
                    placements.push({
                        x: worldX,
                        y: height,
                        z: worldZ,
                        height: bladeHeight,
                        rotation: this._hash(worldX, worldZ, 1100) * Math.PI * 2,
                    });
                }

                if (placements.length >= GRASS_MAX_PER_CHUNK) break;
            }
            if (placements.length >= GRASS_MAX_PER_CHUNK) break;
        }

        return placements;
    }

    _sampleRocks(cx, cz) {
        const placements = [];
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;

        for (let lx = 0; lx < CHUNK_SIZE; lx += ROCK_SPACING) {
            for (let lz = 0; lz < CHUNK_SIZE; lz += ROCK_SPACING) {
                const jx = this._hash(originX + lx, originZ + lz, 1200) * ROCK_SPACING * 0.7;
                const jz = this._hash(originX + lx, originZ + lz, 1300) * ROCK_SPACING * 0.7;

                const worldX = originX + lx + jx;
                const worldZ = originZ + lz + jz;
                const height = this._terrain.getHeightAt(worldX, worldZ);
                const normH = Math.max(0, height) / TERRAIN_HEIGHT_SCALE;

                const { rockDensity } = this._getBiomeDensity(normH);
                const roll = this._hash(worldX, worldZ, 1400);

                if (roll < rockDensity) {
                    const isBoulder = this._hash(worldX, worldZ, 1500) > 0.6;
                    const scaleRange = isBoulder ? ROCK_BOULDER_SCALE : ROCK_PEBBLE_SCALE;
                    const scale = scaleRange[0] + this._hash(worldX, worldZ, 1600) * (scaleRange[1] - scaleRange[0]);

                    placements.push({
                        x: worldX,
                        y: height,
                        z: worldZ,
                        scale,
                        rotation: this._hash(worldX, worldZ, 1700) * Math.PI * 2,
                        type: isBoulder ? 'boulder' : 'pebble',
                    });
                }
            }
        }

        return placements;
    }
}
