// ============================================================
// assetLoader.js — Centralised asset loading with caching
// ============================================================
import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.cache = new Map();

        // ── Progress events ─────────────────────────────────
        this.manager.onStart = (url, loaded, total) => {
            console.log(`[AssetLoader] Loading started: ${url} (${loaded}/${total})`);
        };
        this.manager.onProgress = (url, loaded, total) => {
            const pct = ((loaded / total) * 100).toFixed(0);
            console.log(`[AssetLoader] ${pct}% — ${url}`);
        };
        this.manager.onLoad = () => {
            console.log('[AssetLoader] All assets loaded.');
        };
        this.manager.onError = (url) => {
            console.error(`[AssetLoader] Failed to load: ${url}`);
        };
    }

    /**
     * Load a texture (cached).
     * @param {string} url       Path to the texture
     * @param {object} [opts]    { wrapS, wrapT, minFilter, magFilter }
     * @returns {Promise<THREE.Texture>}
     */
    loadTexture(url, opts = {}) {
        if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    if (opts.wrapS) texture.wrapS = opts.wrapS;
                    if (opts.wrapT) texture.wrapT = opts.wrapT;
                    if (opts.minFilter) texture.minFilter = opts.minFilter;
                    if (opts.magFilter) texture.magFilter = opts.magFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.cache.set(url, texture);
                    resolve(texture);
                },
                undefined,
                reject,
            );
        });
    }

    /**
     * Stub for future GLTF model loading.
     * Requires importing GLTFLoader from three/addons when needed.
     * @param {string} url
     * @returns {Promise<object>}
     */
    async loadModel(url) {
        if (this.cache.has(url)) return this.cache.get(url);
        // Ensure we have a GLTFLoader implementation. We fetch the module
        // source from a CDN, rewrite its import of 'three' to the local
        // module served at `/src/libs/three.module.min.js`, then import it as
        // a blob so the loader uses the same Three build as the engine.
        if (!this._gltfLoaderModule) {
            await this._loadGLTFLoaderFromCDN();
        }

        // Choose loader by extension
        const ext = (url.split('.').pop() || '').toLowerCase();
        if (ext === 'usdz') {
            if (!this._usdzLoaderModule) await this._loadUSDZLoaderFromCDN();
            const { USDZLoader } = this._usdzLoaderModule;
            return new Promise((resolve, reject) => {
                const loader = new USDZLoader(this.manager);
                loader.load(
                    url,
                    (result) => {
                        try {
                            console.debug('[AssetLoader] USDZ load result:', result);
                            // Inspect and fix up the loaded USDZ scene
                            let meshCount = 0;
                            result.traverse((node) => {
                                if (node.isMesh) {
                                    meshCount++;
                                    try {
                                        const geom = node.geometry;
                                        const attrs = geom && geom.attributes ? Object.keys(geom.attributes) : [];
                                        console.debug('[AssetLoader] USDZ Mesh:', node.name || '<unnamed>', 'attrs:', attrs);
                                        try { geom.computeBoundingBox(); console.debug('[AssetLoader] USDZ bbox:', geom.boundingBox); } catch (e) {}
                                    } catch (e) {
                                        console.debug('[AssetLoader] USDZ mesh inspect error', e);
                                    }
                                    node.castShadow = true;
                                    node.receiveShadow = true;

                                    const mats = Array.isArray(node.material) ? node.material : [node.material];
                                    for (const mat of mats) {
                                        if (!mat) continue;
                                        console.debug('[AssetLoader] USDZ material:', mat.name || '<unnamed>', (mat.constructor && mat.constructor.name) || mat.type);
                                        // Ensure color space for textures
                                        const colorMaps = ['map', 'emissiveMap'];
                                        const linearMaps = ['aoMap','metalnessMap','roughnessMap','normalMap','alphaMap','envMap'];
                                        for (const k of colorMaps) {
                                            if (mat[k] && mat[k].isTexture) {
                                                const tex = mat[k];
                                                if (typeof tex.colorSpace !== 'undefined' && typeof THREE.SRGBColorSpace !== 'undefined') {
                                                    tex.colorSpace = THREE.SRGBColorSpace;
                                                } else if (typeof tex.encoding !== 'undefined' && typeof THREE.sRGBEncoding !== 'undefined') {
                                                    tex.encoding = THREE.sRGBEncoding;
                                                }
                                                tex.needsUpdate = true;
                                                console.debug('[AssetLoader] USDZ color texture', k, tex);
                                            }
                                        }
                                        for (const k of linearMaps) {
                                            if (mat[k] && mat[k].isTexture) {
                                                const tex = mat[k];
                                                if (typeof tex.colorSpace !== 'undefined' && typeof THREE.LinearSRGBColorSpace !== 'undefined') {
                                                    tex.colorSpace = THREE.LinearSRGBColorSpace;
                                                } else if (typeof tex.encoding !== 'undefined' && typeof THREE.LinearEncoding !== 'undefined') {
                                                    tex.encoding = THREE.LinearEncoding;
                                                }
                                                tex.needsUpdate = true;
                                                console.debug('[AssetLoader] USDZ linear texture', k, tex);
                                            }
                                        }
                                    }
                                }
                            });
                                console.debug('[AssetLoader] USDZ mesh count:', meshCount);
                                if (meshCount === 0) {
                                    // Fallback: try loading a sibling .glb with the same basename
                                    (async () => {
                                        try {
                                            const glbUrl = url.replace(/\.usdz$/i, '.glb');
                                            console.debug('[AssetLoader] USDZ empty — attempting fallback GLB:', glbUrl);
                                            await this._loadGLTFLoaderFromCDN();
                                            const { GLTFLoader } = this._gltfLoaderModule;
                                            const gltfLoader = new GLTFLoader(this.manager);
                                            gltfLoader.load(
                                                glbUrl,
                                                (gltf) => {
                                                    console.debug('[AssetLoader] Fallback GLB loaded:', glbUrl);
                                                    this.cache.set(glbUrl, gltf);
                                                    // Also cache original USDZ URL to reference the GLB result
                                                    this.cache.set(url, gltf);
                                                    resolve(gltf);
                                                },
                                                undefined,
                                                (err) => {
                                                    console.warn('[AssetLoader] Fallback GLB failed:', glbUrl, err);
                                                    // leave USDZ result (empty) in cache and resolve it
                                                    this.cache.set(url, result);
                                                    resolve(result);
                                                }
                                            );
                                        } catch (e) {
                                            console.warn('[AssetLoader] Error attempting GLB fallback for USDZ', e);
                                            this.cache.set(url, result);
                                            resolve(result);
                                        }
                                    })();
                                    // return early — the async fallback will call resolve
                                    return;
                                }
                        } catch (e) {
                            console.warn('[AssetLoader] Error post-processing USDZ', e);
                        }

                        this.cache.set(url, result);
                        resolve(result);
                    },
                    undefined,
                    (err) => {
                        console.error(`[AssetLoader] Failed to load USDZ: ${url}`, err);
                        reject(err);
                    }
                );
            });
        }

        const { GLTFLoader } = this._gltfLoaderModule;
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader(this.manager);
            loader.load(
                url,
                (gltf) => {
                    // Post-process textures to ensure correct color space/encoding
                    try {
                        console.debug('[AssetLoader] glTF loaded — scanning materials/textures');
                        // Print gltf images (if any) to help debug missing external textures
                        if (gltf.parser && gltf.parser.json && Array.isArray(gltf.parser.json.images)) {
                            console.debug('[AssetLoader] glTF images:', gltf.parser.json.images);
                        }
                        // Dump material info from both the parsed glTF and the runtime materials
                        try {
                            if (gltf.materials) console.debug('[AssetLoader] gltf.materials (runtime):', gltf.materials);
                            if (gltf.parser && gltf.parser.json && Array.isArray(gltf.parser.json.materials)) {
                                console.debug('[AssetLoader] glTF JSON materials:', gltf.parser.json.materials);
                            }
                        } catch (e) {
                            console.debug('[AssetLoader] Error dumping glTF material info', e);
                        }
                        gltf.scene.traverse((node) => {
                            if (node.isMesh) {
                                try {
                                    const geom = node.geometry;
                                    const attrKeys = geom && geom.attributes ? Object.keys(geom.attributes) : [];
                                    console.debug('[AssetLoader] Mesh:', node.name || '<unnamed>', 'attrs:', attrKeys);
                                } catch (e) {
                                    console.debug('[AssetLoader] Mesh traverse error for', node.name, e);
                                }
                                const mats = Array.isArray(node.material) ? node.material : [node.material];
                                for (const mat of mats) {
                                    if (!mat) continue;
                                    console.debug('[AssetLoader] Material:', mat.name || '<unnamed>', mat.type || (mat.constructor && mat.constructor.name));
                                    const colorMaps = ['map', 'emissiveMap'];
                                    const linearMaps = ['aoMap','metalnessMap','roughnessMap','normalMap','alphaMap','envMap'];
                                    for (const k of colorMaps) {
                                        if (mat[k] && mat[k].isTexture) {
                                            const tex = mat[k];
                                            console.debug('[AssetLoader] colorMap present:', k, 'tex:', tex);
                                            if (typeof tex.colorSpace !== 'undefined' && typeof THREE.SRGBColorSpace !== 'undefined') {
                                                tex.colorSpace = THREE.SRGBColorSpace;
                                            } else if (typeof tex.encoding !== 'undefined' && typeof THREE.sRGBEncoding !== 'undefined') {
                                                tex.encoding = THREE.sRGBEncoding;
                                            }
                                            tex.needsUpdate = true;
                                        }
                                    }
                                    for (const k of linearMaps) {
                                        if (mat[k] && mat[k].isTexture) {
                                            const tex = mat[k];
                                            // Log texture info to help debug missing images
                                            try {
                                                const img = tex.image;
                                                let src;
                                                if (!img) src = '<no image object>';
                                                else if (img.src) src = img.src;
                                                else if (img.currentSrc) src = img.currentSrc;
                                                else if (img.uri) src = img.uri;
                                                else if (img.name) src = img.name;
                                                else if (img.width && img.height) src = '<bitmap ' + img.width + 'x' + img.height + '>';
                                                else if (img.data) src = '<embedded data>';
                                                else src = '<unknown image type>';
                                                console.debug('[AssetLoader] texture', k, '->', src, tex);
                                            } catch (e) {
                                                console.debug('[AssetLoader] texture', k, '-> <unknown image>', tex);
                                            }
                                            if (typeof tex.colorSpace !== 'undefined' && typeof THREE.LinearSRGBColorSpace !== 'undefined') {
                                                tex.colorSpace = THREE.LinearSRGBColorSpace;
                                            } else if (typeof tex.encoding !== 'undefined' && typeof THREE.LinearEncoding !== 'undefined') {
                                                tex.encoding = THREE.LinearEncoding;
                                            }
                                            tex.needsUpdate = true;
                                        }
                                    }
                                }
                            }
                        });
                    } catch (e) {
                        console.warn('[AssetLoader] Error post-processing glTF textures', e);
                    }
                    this.cache.set(url, gltf);
                    resolve(gltf);
                },
                undefined,
                (err) => {
                    console.error(`[AssetLoader] Failed to load model: ${url}`, err);
                    reject(err);
                }
            );
        });
    }

    async _loadUSDZLoaderFromCDN() {
        if (this._usdzLoaderModule) return this._usdzLoaderModule;
        try {
            const mod = await import('/src/libs/USDZLoader.js');
            this._usdzLoaderModule = mod;
            return mod;
        } catch (e) {
            console.error('[AssetLoader] Failed to import local USDZLoader', e);
            throw e;
        }
    }

    async _loadGLTFLoaderFromCDN() {
        if (this._gltfLoaderModule) return this._gltfLoaderModule;
        try {
            // Import the local copy from src/libs. The import map in index.html
            // already maps 'three' to the local `three.module.min.js` so the
            // loader's internal `import 'three'` will resolve correctly.
            const mod = await import('/src/libs/GLTFLoader.js');
            this._gltfLoaderModule = mod;
            return mod;
        } catch (e) {
            console.error('[AssetLoader] Failed to import local GLTFLoader', e);
            throw e;
        }
    }

    /** Dispose a specific cached asset. */
    disposeAsset(url) {
        const asset = this.cache.get(url);
        if (asset && asset.dispose) asset.dispose();
        this.cache.delete(url);
    }

    /** Dispose all cached assets. */
    disposeAll() {
        this.cache.forEach((asset) => {
            if (asset && asset.dispose) asset.dispose();
        });
        this.cache.clear();
    }
}
