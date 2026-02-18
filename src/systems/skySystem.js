// ============================================================
// skySystem.js — Dynamic sky with fog
// ============================================================
import * as THREE from 'three';

const skyVert = /* glsl */`
varying vec3 vWorldPosition;
void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFrag = /* glsl */`
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
uniform vec3 uHorizon;
uniform float uSunAlt;
varying vec3 vWorldPosition;

void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = dir.y;
    
    vec3 color = h > 0.0 
        ? mix(uHorizon, uSkyTop, pow(h, 0.6))
        : mix(uHorizon, uSkyBottom, pow(-h, 0.4));
    
    float glow = max(0.0, 1.0 - abs(h) * 4.0) * max(0.0, 0.3 - abs(uSunAlt));
    color += vec3(1.0, 0.5, 0.2) * glow * 2.0;
    
    gl_FragColor = vec4(color, 1.0);
}
`;

export class SkySystem {
    constructor(scene) {
        const geo = new THREE.SphereGeometry(500, 16, 16);
        this.material = new THREE.ShaderMaterial({
            vertexShader: skyVert,
            fragmentShader: skyFrag,
            uniforms: {
                uSkyTop: { value: new THREE.Color(0x1a6baa) },
                uSkyBottom: { value: new THREE.Color(0x3a5f0b) },
                uHorizon: { value: new THREE.Color(0xc8d6e5) },
                uSunAlt: { value: 0.5 }
            },
            side: THREE.BackSide,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.renderOrder = -1;
        scene.add(this.mesh);

        this._palettes = {
            day: { top: new THREE.Color(0x1a6baa), horizon: new THREE.Color(0xaad4f5), bottom: new THREE.Color(0x4a8c3f) },
            dawn: { top: new THREE.Color(0x2a3a6b), horizon: new THREE.Color(0xff9944), bottom: new THREE.Color(0x3a4f2b) },
            night: { top: new THREE.Color(0x0a0a20), horizon: new THREE.Color(0x151530), bottom: new THREE.Color(0x0a0a15) }
        };

        this._tmp = { top: new THREE.Color(), horizon: new THREE.Color(), bottom: new THREE.Color() };

        // Fog
        this.fog = new THREE.Fog(0xc8d6e5, 80, 350);
        scene.fog = this.fog;
    }

    update(time) {
        const alt = time.sunAltitude;
        const u = this.material.uniforms;

        if (alt > 0.15) {
            this._tmp.top.copy(this._palettes.day.top);
            this._tmp.horizon.copy(this._palettes.day.horizon);
            this._tmp.bottom.copy(this._palettes.day.bottom);
            this.fog.color.copy(this._palettes.day.horizon);
        } else if (alt > -0.05) {
            const t = (alt + 0.05) / 0.2;
            this._tmp.top.lerpColors(this._palettes.night.top, this._palettes.dawn.top, t);
            this._tmp.horizon.lerpColors(this._palettes.night.horizon, this._palettes.dawn.horizon, t);
            this._tmp.bottom.lerpColors(this._palettes.night.bottom, this._palettes.dawn.bottom, t);
            this.fog.color.lerpColors(this._palettes.night.horizon, this._palettes.dawn.horizon, t);
        } else {
            this._tmp.top.copy(this._palettes.night.top);
            this._tmp.horizon.copy(this._palettes.night.horizon);
            this._tmp.bottom.copy(this._palettes.night.bottom);
            this.fog.color.copy(this._palettes.night.horizon);
        }

        u.uSkyTop.value.copy(this._tmp.top);
        u.uHorizon.value.copy(this._tmp.horizon);
        u.uSkyBottom.value.copy(this._tmp.bottom);
        u.uSunAlt.value = alt;

        this.fog.near = alt > 0 ? 80 : 50;
        this.fog.far = alt > 0 ? 350 : 200;
    }

    followCamera(pos) {
        this.mesh.position.copy(pos);
    }
}
