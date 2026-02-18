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

// Medium detail: 5-sided trunk + low-detail icosahedron canopy
const trunkGeoMed = new THREE.CylinderGeometry(0.15, 0.25, 2.0, 5);
trunkGeoMed.translate(0, 1.0, 0);
// Use an icosahedron for the medium LOD canopy so the silhouette remains
// round when switching between med and high LODs (avoids cone->sphere pop).
const canopyGeoMed = new THREE.IcosahedronGeometry(1.4, 0);
canopyGeoMed.translate(0, 3.4, 0);

const medGeo = _mergeSimple(trunkGeoMed, canopyGeoMed);

// Billboard: vertical plane

// ── Shared materials ────────────────────────────────────────
const treeMaterialHigh = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
});
const treeMaterialMed = treeMaterialHigh.clone();
// Billboard material is hidden by default to avoid large flat 'aura' planes
// billboard geometry/material removed — we use only high/med instanced meshes

/**
 * Merge two BufferGeometries with vertex colours — trunk brown, canopy green.
 */
function _mergeSimple(trunkGeo, canopyGeo) {
    // Normalize to non-indexed geometries so we can concatenate attributes
    trunkGeo = trunkGeo.toNonIndexed();
    canopyGeo = canopyGeo.toNonIndexed();

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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(mergedCol, 3));
    // Keep geometry non-indexed (attributes already concatenated). This
    // avoids problems when source geometries mix indexed and non-indexed forms.

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

        // Create simple invisible colliders for each tree instance.
        // These are lightweight Meshes (cylinders) used only for physics/raycasting.
        const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
        const colliderGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
        const colliders = [];

        for (let i = 0; i < count; i++) {
            const p = placements[i];

            // compute instance scale (same logic as above)
            let instanceScale = p.scale;
            if (p.desiredHeight !== undefined) {
                instanceScale = p.desiredHeight / highModelHeight;
            }
            instanceScale = Math.max(instanceScale, TREE_MIN_SCALE);
            instanceScale = Math.min(instanceScale, TREE_MAX_SCALE * 10);

            const modelHeight = highModelHeight * instanceScale;
            const trunkRadius = 0.25 * instanceScale; // approximate trunk radius

            const col = new THREE.Mesh(colliderGeo, colliderMat);
            col.name = 'treeCollider';
            col.position.set(p.x, p.y + modelHeight / 2, p.z);
            // Make cylinder height match modelHeight exactly
            col.scale.set(trunkRadius, modelHeight, trunkRadius);
            // Allow Three to compute world matrices; we'll update on registration
            col.matrixAutoUpdate = true;
            colliders.push(col);
            group.add(col);
        }

        group.userData.colliders = colliders;

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

        const highMesh = children[0];
        const medMesh = children[1];

        // Per-instance LOD: compute distance per placement and assign its matrix
        // to the appropriate InstancedMesh. This avoids switching the entire
        // chunk to high detail when only one tree is near.
        const placements = treeGroup.userData.placements || [];

        // Prepare a zero matrix to hide instances on the other mesh
        _dummy.position.set(0, -9999, 0);
        _dummy.scale.setScalar(0.000001);
        _dummy.updateMatrix();
        const hideMatrix = _dummy.matrix.clone();

        for (let i = 0; i < placements.length; i++) {
            const p = placements[i];
            const dx = cameraPos.x - p.x;
            const dz = cameraPos.z - p.z;
            const d = Math.sqrt(dx * dx + dz * dz);

            // Recompute instance matrix (same logic as creation)
            _dummy.position.set(p.x, p.y, p.z);
            _dummy.rotation.set(0, p.rotation || 0, 0);

            let instanceScale = p.scale || 1;
            if (p.desiredHeight !== undefined) {
                // Use highGeo model height to compute scale — fallbacks kept simple
                const highModelHeight = highMesh.geometry.boundingBox ? (highMesh.geometry.boundingBox.max.y - highMesh.geometry.boundingBox.min.y) : 4.8;
                instanceScale = p.desiredHeight / highModelHeight;
            }
            instanceScale = Math.max(instanceScale, TREE_MIN_SCALE);
            instanceScale = Math.min(instanceScale, TREE_MAX_SCALE * 10);

            _dummy.scale.setScalar(instanceScale);
            _dummy.updateMatrix();

            if (d < TREE_LOD_HIGH_DIST) {
                highMesh.setMatrixAt(i, _dummy.matrix);
                medMesh.setMatrixAt(i, hideMatrix);
            } else if (d < TREE_LOD_MED_DIST) {
                medMesh.setMatrixAt(i, _dummy.matrix);
                highMesh.setMatrixAt(i, hideMatrix);
            } else {
                // Out of render LOD range — hide both
                medMesh.setMatrixAt(i, hideMatrix);
                highMesh.setMatrixAt(i, hideMatrix);
            }
        }

        highMesh.instanceMatrix.needsUpdate = true;
        medMesh.instanceMatrix.needsUpdate = true;
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
