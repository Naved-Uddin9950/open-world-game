// ============================================================
// assetLoader.js - Centralised asset loading with caching
// ============================================================
// All 3D creatures/objects are procedural (Three.js primitives).
// This loader handles textures only.
// ============================================================
import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.cache = new Map();

        this.manager.onStart = (url, loaded, total) => {
            console.log('[AssetLoader] Loading started: ' + url + ' (' + loaded + '/' + total + ')');
        };
        this.manager.onProgress = (url, loaded, total) => {
            const pct = ((loaded / total) * 100).toFixed(0);
            console.log('[AssetLoader] ' + pct + '% - ' + url);
        };
        this.manager.onLoad = () => {
            console.log('[AssetLoader] All assets loaded.');
        };
        this.manager.onError = (url) => {
            console.error('[AssetLoader] Failed to load: ' + url);
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
