// ============================================================
// treeSystem.js — Instanced LOD tree rendering
// ============================================================
import * as THREE from 'three';
import {
    CHUNK_SIZE,
    TREE_MAX_PER_CHUNK,
    TREE_LOD_HIGH_DIST,
    TREE_LOD_MED_DIST,
    TREE_LOD_BILL_DIST,
    TREE_MIN_SCALE,
    TREE_MAX_SCALE,
    TREE_TRUNK_COLOR,
    TREE_CANOPY_COLORS,
} from '../../utils/constants.js';

// ── Shared geometries ───────────────────────────────────────

// High detail: 8-sided trunk + icosphere canopy
const trunkGeoHigh = new THREE.CylinderGeometry(0.15, 0.25, 2.0, 8);
trunkGeoHigh.translate(0, 1.0, 0);
const canopyGeoHigh = new THREE.IcosahedronGeometry(1.6, 1);
canopyGeoHigh.translate(0, 3.2, 0);

// Merge into single geometry for 1 draw call per LOD
const highGeo = _mergeSimple(trunkGeoHigh, canopyGeoHigh);

// Medium detail: 5-sided trunk + cone canopy
const trunkGeoMed = new THREE.CylinderGeometry(0.15, 0.25, 2.0, 5);
trunkGeoMed.translate(0, 1.0, 0);
const canopyGeoMed = new THREE.ConeGeometry(1.4, 2.8, 5);
canopyGeoMed.translate(0, 3.4, 0);

const medGeo = _mergeSimple(trunkGeoMed, canopyGeoMed);

// Billboard: vertical plane
const billGeo = new THREE.PlaneGeometry(3.0, 5.0);
billGeo.translate(0, 2.5, 0);

// ── Shared materials ────────────────────────────────────────
const treeMaterialHigh = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
});
const treeMaterialMed = treeMaterialHigh.clone();
// Billboard material is hidden by default to avoid large flat 'aura' planes
const billMaterial = new THREE.MeshBasicMaterial({
    color: 0x2d6b1b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
});

/**
 * Merge two BufferGeometries with vertex colours — trunk brown, canopy green.
 */
function _mergeSimple(trunkGeo, canopyGeo) {
    const trunkCount = trunkGeo.attributes.position.count;
    const canopyCount = canopyGeo.attributes.position.count;

    // Add vertex colours
    const trunkColors = new Float32Array(trunkCount * 3);
    const tc = new THREE.Color(TREE_TRUNK_COLOR);
    for (let i = 0; i < trunkCount; i++) {
        trunkColors[i * 3] = tc.r;
        trunkColors[i * 3 + 1] = tc.g;
        trunkColors[i * 3 + 2] = tc.b;
    }
    trunkGeo.setAttribute('color', new THREE.BufferAttribute(trunkColors, 3));

    const canopyColors = new Float32Array(canopyCount * 3);
    const cc = new THREE.Color(TREE_CANOPY_COLORS[0]);
    for (let i = 0; i < canopyCount; i++) {
        canopyColors[i * 3] = cc.r;
        canopyColors[i * 3 + 1] = cc.g;
        canopyColors[i * 3 + 2] = cc.b;
    }
    canopyGeo.setAttribute('color', new THREE.BufferAttribute(canopyColors, 3));

    // Manual merge — concatenate attributes + indices
    const totalVerts = trunkCount + canopyCount;
    const mergedPos = new Float32Array(totalVerts * 3);
    const mergedNorm = new Float32Array(totalVerts * 3);
    const mergedCol = new Float32Array(totalVerts * 3);

    mergedPos.set(trunkGeo.attributes.position.array);
    mergedPos.set(canopyGeo.attributes.position.array, trunkCount * 3);

    mergedNorm.set(trunkGeo.attributes.normal.array);
    mergedNorm.set(canopyGeo.attributes.normal.array, trunkCount * 3);

    mergedCol.set(trunkColors);
    mergedCol.set(canopyColors, trunkCount * 3);

    // Merge indices
    const trunkIdx = trunkGeo.index ? Array.from(trunkGeo.index.array) : [];
    const canopyIdx = canopyGeo.index
        ? Array.from(canopyGeo.index.array).map(i => i + trunkCount)
        : [];
    const mergedIdx = new Uint16Array([...trunkIdx, ...canopyIdx]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(mergedCol, 3));
    geo.setIndex(new THREE.BufferAttribute(mergedIdx, 1));

    return geo;
}

// ── Temp objects for transforms ─────────────────────────────
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class TreeSystem {
    /**
     * Create instanced tree meshes for a chunk.
     * @param {Array<{x:number,y:number,z:number,scale:number,rotation:number,colorIdx:number}>} placements
     * @param {THREE.Camera} camera  Used for billboard LOD distance
     * @returns {THREE.Group} Group containing 3 LOD InstancedMeshes
     */
    createChunkTrees(placements) {
        const count = Math.min(placements.length, TREE_MAX_PER_CHUNK);

        const group = new THREE.Group();
        group.name = 'trees';

        if (count === 0) return group;

        // Create instanced meshes for each LOD tier
        const highMesh = new THREE.InstancedMesh(highGeo, treeMaterialHigh, count);
        highMesh.castShadow = true;
        highMesh.receiveShadow = false;
        // InstancedMesh frustum culling can incorrectly cull parts of instances
        // (canopy/trunk mismatch). Disable per-mesh frustum culling for stability.
        highMesh.frustumCulled = false;

        const medMesh = new THREE.InstancedMesh(medGeo, treeMaterialMed, count);
        medMesh.castShadow = false;
        medMesh.receiveShadow = false;
        medMesh.frustumCulled = false;

        // Billboard LOD removed — use high/med instanced meshes only to avoid
        // large flat green quads and simplify shading.

            // Compute model height from the high & med geometries so we can scale instances
            highGeo.computeBoundingBox();
            medGeo.computeBoundingBox();

            const highBBox = highGeo.boundingBox;
            const medBBox = medGeo.boundingBox;

            const highModelHeight = highBBox ? (highBBox.max.y - highBBox.min.y) : 4.8;
            const medModelHeight = medBBox ? (medBBox.max.y - medBBox.min.y) : 4.6;

            // Debug: print model heights once per chunk
            console.debug('[TreeSystem] modelHeights', { highModelHeight, medModelHeight, count });

        for (let i = 0; i < count; i++) {
            const p = placements[i];
            _dummy.position.set(p.x, p.y, p.z);
            _dummy.rotation.set(0, p.rotation, 0);

            // If placement specifies a desiredHeight (world units), compute uniform scale
            let instanceScale = p.scale;
            if (p.desiredHeight !== undefined) {
                    instanceScale = p.desiredHeight / highModelHeight;
            }
            // Fallback to previous min/max limits
            instanceScale = Math.max(instanceScale, TREE_MIN_SCALE);
            instanceScale = Math.min(instanceScale, TREE_MAX_SCALE * 10); // allow larger trees if needed

            _dummy.scale.setScalar(instanceScale);
            _dummy.updateMatrix();

            highMesh.setMatrixAt(i, _dummy.matrix);
            medMesh.setMatrixAt(i, _dummy.matrix);

            // Vary canopy colour per instance
            _color.setHex(TREE_CANOPY_COLORS[p.colorIdx % TREE_CANOPY_COLORS.length]);
            // Per-instance colour tinting removed. Vertex colours are baked into
            // the merged geometries (trunk + canopy) to avoid tinting the trunk
            // when varying canopy colours per-instance.

                // Debug: log first few instances' computed values to console for inspection
                if (i < 6) {
                    console.debug('[TreeSystem] instance', i, {
                        pos: { x: p.x, y: p.y, z: p.z },
                        desiredHeight: p.desiredHeight,
                        instanceScale,
                        canopyColorIdx: p.colorIdx,
                    });
                }
        }

            // debug helper removed

        highMesh.instanceMatrix.needsUpdate = true;
        medMesh.instanceMatrix.needsUpdate = true;
        // billMesh removed — only update high/med
        // No per-instance colours used, skip instanceColor updates

        // Store LOD distances for manual switching (high / med)
        highMesh.userData.lodMax = TREE_LOD_HIGH_DIST;
        medMesh.userData.lodMin = TREE_LOD_HIGH_DIST;
        medMesh.userData.lodMax = TREE_LOD_MED_DIST;

        group.add(highMesh, medMesh);
        group.userData.isVegetation = true;
        group.userData.type = 'trees';
        // Keep placement data so LOD can be computed per-instance (nearest tree to camera)
        group.userData.placements = placements;

        return group;
    }

    /**
     * Update LOD visibility based on camera distance to chunk centre.
     * @param {THREE.Group} treeGroup
     * @param {number} distToCamera  Distance from chunk centre to camera
     */
    /**
     * Update LOD visibility based on camera position. Uses nearest-instance distance
     * so trees switch to high detail when the player approaches any tree in the chunk.
     * @param {THREE.Group} treeGroup
     * @param {THREE.Vector3} cameraPos
     */
    updateLOD(treeGroup, cameraPos) {
        const children = treeGroup.children;
        // Support two LOD children: high and med
        if (children.length < 2) return;

        // Compute nearest horizontal distance from camera to any placement in this group.
        const placements = treeGroup.userData.placements;
        let dist = Infinity;
        if (placements && placements.length) {
            for (let i = 0; i < placements.length; i++) {
                const p = placements[i];
                const dx = cameraPos.x - p.x;
                const dz = cameraPos.z - p.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < dist) dist = d;
            }
        } else {
            // Fallback: use chunk centre distance stored on medMesh userData if present
            dist = cameraPos.distanceTo(treeGroup.position || new THREE.Vector3());
        }

        // High / Med
        children[0].visible = dist < TREE_LOD_HIGH_DIST;
        children[1].visible = dist >= TREE_LOD_HIGH_DIST && dist < TREE_LOD_MED_DIST;
    }

    /**
     * Dispose instanced meshes in a tree group.
     * @param {THREE.Group} treeGroup
     */
    dispose(treeGroup) {
        treeGroup.traverse((child) => {
            if (child.isInstancedMesh) {
                child.dispose();
            }
        });
    }
}
