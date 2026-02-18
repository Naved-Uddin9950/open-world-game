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

        const { GLTFLoader } = this._gltfLoaderModule;
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader(this.manager);
            loader.load(
                url,
                (gltf) => {
                    // Post-process textures to ensure correct color space/encoding
                    try {
                        gltf.scene.traverse((node) => {
                            if (node.isMesh) {
                                const mats = Array.isArray(node.material) ? node.material : [node.material];
                                for (const mat of mats) {
                                    if (!mat) continue;
                                    const maps = ['map','aoMap','emissiveMap','metalnessMap','roughnessMap','normalMap','alphaMap','envMap'];
                                    for (const k of maps) {
                                        if (mat[k] && mat[k].isTexture) {
                                            const tex = mat[k];
                                            // Prefer new colorSpace API when available
                                            if (typeof tex.colorSpace !== 'undefined' && typeof THREE.SRGBColorSpace !== 'undefined') {
                                                tex.colorSpace = THREE.SRGBColorSpace;
                                            } else if (typeof tex.encoding !== 'undefined' && typeof THREE.sRGBEncoding !== 'undefined') {
                                                tex.encoding = THREE.sRGBEncoding;
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
