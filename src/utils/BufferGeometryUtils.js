import * as THREE from 'three';

// Minimal utility: convert strip/fan draw modes to triangle list indices
export function toTrianglesDrawMode(geometry, drawMode) {
    // If already triangles, return a clone
    if (drawMode === THREE.TrianglesDrawMode) return geometry;

    const index = geometry.getIndex();
    const position = geometry.getAttribute('position');

    const newIndices = [];

    if (drawMode === THREE.TriangleStripDrawMode) {
        // each vertex after the first two creates a triangle
        if (index) {
            for (let i = 0; i < index.count - 2; i++) {
                const a = index.getX(i);
                const b = index.getX(i + 1);
                const c = index.getX(i + 2);
                if (i % 2 === 0) {
                    newIndices.push(a, b, c);
                } else {
                    newIndices.push(b, a, c);
                }
            }
        } else {
            for (let i = 0; i < position.count - 2; i++) {
                if (i % 2 === 0) {
                    newIndices.push(i, i + 1, i + 2);
                } else {
                    newIndices.push(i + 1, i, i + 2);
                }
            }
        }
    } else if (drawMode === THREE.TriangleFanDrawMode) {
        // fan: first vertex is shared
        if (index) {
            const a = index.getX(0);
            for (let i = 1; i < index.count - 1; i++) {
                const b = index.getX(i);
                const c = index.getX(i + 1);
                newIndices.push(a, b, c);
            }
        } else {
            for (let i = 1; i < position.count - 1; i++) {
                newIndices.push(0, i, i + 1);
            }
        }
    } else {
        console.warn('toTrianglesDrawMode: Unknown drawMode', drawMode);
        return geometry;
    }

    const newGeo = geometry.clone();
    newGeo.setIndex(newIndices);
    return newGeo;
}
