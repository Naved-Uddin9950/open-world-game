// ============================================================
// terrainChunk.js — LOD terrain mesh with vertex colours
// ============================================================
import * as THREE from 'three';
import {
    CHUNK_SIZE,
    TERRAIN_SEG_HIGH,
    TERRAIN_SEG_MED,
    TERRAIN_SEG_LOW,
} from '../../utils/constants.js';
import { TerrainGenerator } from './terrainGenerator.js';
import { BiomeSystem } from './biomeSystem.js';

// Shared material across all terrain chunks — uses vertex colours
const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: false,
});

export class TerrainChunk {
    /**
     * @param {TerrainGenerator} generator
     * @param {BiomeSystem}      biome
     */
    constructor(generator, biome) {
        this._generator = generator;
        this._biome = biome;
    }

    /**
     * Build a THREE.LOD containing high / medium / low detail meshes.
     * @param {number} cx  Chunk grid X
     * @param {number} cz  Chunk grid Z
     * @returns {THREE.LOD}
     */
    createLOD(cx, cz) {
        const lod = new THREE.LOD();

        const high = this._createMesh(cx, cz, TERRAIN_SEG_HIGH);
        const med = this._createMesh(cx, cz, TERRAIN_SEG_MED);
        const low = this._createMesh(cx, cz, TERRAIN_SEG_LOW);

        lod.addLevel(high, 0);
        lod.addLevel(med, CHUNK_SIZE * 2);
        lod.addLevel(low, CHUNK_SIZE * 4);

        // Position the LOD group in world-space
        lod.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
        lod.name = `terrain_${cx}_${cz}`;

        return lod;
    }

    /**
     * Create a single terrain mesh at a given resolution.
     * @param {number} cx
     * @param {number} cz
     * @param {number} segments
     * @returns {THREE.Mesh}
     */
    _createMesh(cx, cz, segments) {
        const geometry = new THREE.PlaneGeometry(
            CHUNK_SIZE, CHUNK_SIZE, segments, segments,
        );
        geometry.rotateX(-Math.PI / 2);

        const positions = geometry.attributes.position;
        const verts = segments + 1;

        // Generate heightmap
        const heights = this._generator.generateHeightmap(cx, cz, segments);

        // Vertex colours
        const colors = new Float32Array(positions.count * 3);

        const step = CHUNK_SIZE / segments;
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;

        for (let iz = 0; iz < verts; iz++) {
            for (let ix = 0; ix < verts; ix++) {
                const idx = iz * verts + ix;
                const h = heights[idx];

                // Set Y position from heightmap
                positions.setY(idx, h);

                // Calculate slope for biome colouring
                const worldX = originX + ix * step;
                const worldZ = originZ + iz * step;
                const slope = this._generator.getSlopeAt(worldX, worldZ, step);

                // Get biome colour
                const colour = this._biome.getColor(h, slope);
                colors[idx * 3] = colour.r;
                colors[idx * 3 + 1] = colour.g;
                colors[idx * 3 + 2] = colour.b;
            }
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        const mesh = new THREE.Mesh(geometry, terrainMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = false;

        // Offset within the LOD group — PlaneGeometry is centred at origin,
        // but we need it to start at (0,0) local to match chunk positioning
        mesh.position.set(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);

        return mesh;
    }

    /**
     * Dispose geometries from a LOD object.
     * @param {THREE.LOD} lod
     */
    disposeLOD(lod) {
        lod.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
        });
    }
}
