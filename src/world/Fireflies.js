import * as THREE from 'three'
import { GROUND_Y } from '../config.js'
import { makeRandom, clamp } from '../utils/math.js'

/**
 * Vuurvliegjes boven het gras en muggen boven het water — de kleine
 * onrust die een stilstaand beeld levend maakt.
 */
export default class Fireflies {
  constructor(count = 320) {
    const rand = makeRandom(1212)
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3) // fase, snelheid, straal
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // twee zwermen: één bij de camper, één losjes over het water
      const overWater = rand() > 0.68
      const x = overWater ? -30 + rand() * 70 : -14 + rand() * 30
      const z = overWater ? 4 + rand() * 14 : 24 + rand() * 26
      const y = overWater ? 0.6 + rand() * 2.2 : GROUND_Y + 0.3 + rand() * 3.4

      positions[i * 3 + 0] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      seeds[i * 3 + 0] = rand() * 100
      seeds[i * 3 + 1] = 0.25 + rand() * 0.7
      seeds[i * 3 + 2] = 0.4 + rand() * 1.6
      sizes[i] = 0.6 + Math.pow(rand(), 2) * 2.2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    this.uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uScale: { value: 1 },
      uColor: { value: new THREE.Color(0xffe08a) },
    }

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        attribute float aSize;
        uniform float uTime, uScale;
        varying float vGlow;
        void main(){
          float phase = aSeed.x;
          float speed = aSeed.y;
          float radius = aSeed.z;

          vec3 p = position;
          // trage lissajous-lus: nooit precies dezelfde baan
          p.x += sin(uTime * speed * 0.6 + phase) * radius;
          p.y += sin(uTime * speed * 0.9 + phase * 1.7) * radius * 0.35;
          p.z += cos(uTime * speed * 0.5 + phase * 2.3) * radius;

          // aan en uit knipperen, met stiltes ertussen
          float pulse = sin(uTime * (1.1 + speed) + phase * 6.0);
          vGlow = smoothstep(-0.1, 0.9, pulse);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale * (0.5 + vGlow) / max(-mv.z, 1.0) * 55.0;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; uniform vec3 uColor;
        varying float vGlow;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor, pow(core, 2.2) * vGlow * uOpacity);
        }
      `,
    })

    this.points = new THREE.Points(geo, mat)
    this.points.frustumCulled = false
    this.points.renderOrder = 6
  }

  update(elapsed) { this.uniforms.uTime.value = elapsed }
  setOpacity(v) {
    this.uniforms.uOpacity.value = clamp(v)
    this.points.visible = v > 0.01
  }
  setPixelRatio(dpr) { this.uniforms.uScale.value = dpr }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.dispose()
  }
}
