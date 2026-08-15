import * as THREE from 'three'
import { PALETTE } from '../config.js'
import { makeRandom, clamp } from '../utils/math.js'

/**
 * Slingers papier die aan het eind over de kade dwarrelen.
 * Alles zit in de shader: geen physics-loop op de CPU.
 */
export default class Confetti {
  constructor(count = 400) {
    const rand = makeRandom(31)

    // één snippertje, viermaal herhaald per deeltje
    const positions = new Float32Array(count * 4 * 3)
    const corners = new Float32Array(count * 4 * 2)
    const origins = new Float32Array(count * 4 * 3)
    const seeds = new Float32Array(count * 4 * 3)
    const colors = new Float32Array(count * 4 * 3)
    const indices = []

    const palette = [PALETTE.yellow, PALETTE.pink, PALETTE.cream, PALETTE.pinkSoft, 0x8fd4c8]
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // ontstaan in een brede boog boven de kade
      const ox = -26 + rand() * 60
      const oy = 14 + rand() * 16
      const oz = 14 + rand() * 34
      c.setHex(palette[Math.floor(rand() * palette.length)])

      const seedA = rand() * 100          // fase
      const seedB = 0.55 + rand() * 0.9   // valsnelheid
      const seedC = 0.6 + rand() * 2.4    // tolsnelheid
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]]

      for (let v = 0; v < 4; v++) {
        const k = i * 4 + v
        positions[k * 3 + 0] = 0
        positions[k * 3 + 1] = 0
        positions[k * 3 + 2] = 0
        corners[k * 2 + 0] = q[v][0]
        corners[k * 2 + 1] = q[v][1]
        origins[k * 3 + 0] = ox
        origins[k * 3 + 1] = oy
        origins[k * 3 + 2] = oz
        seeds[k * 3 + 0] = seedA
        seeds[k * 3 + 1] = seedB
        seeds[k * 3 + 2] = seedC
        colors[k * 3 + 0] = c.r
        colors[k * 3 + 1] = c.g
        colors[k * 3 + 2] = c.b
      }
      const b = i * 4
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aCorner', new THREE.BufferAttribute(corners, 2))
    geo.setAttribute('aOrigin', new THREE.BufferAttribute(origins, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 8, 30), 90)

    this.uniforms = {
      uProgress: { value: 0 },  // 0 → 1: hoe ver de bui gevorderd is
      uOpacity:  { value: 0 },
      uTime:     { value: 0 },
    }

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec2 aCorner;
        attribute vec3 aOrigin;
        attribute vec3 aSeed;
        attribute vec3 aColor;
        uniform float uProgress, uTime;
        varying vec3 vColor;
        varying float vShade;

        mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

        void main(){
          vColor = aColor;

          float phase = aSeed.x;
          float fall  = aSeed.y;
          float spin  = aSeed.z;

          // elk snippertje start op zijn eigen moment
          float t = clamp((uProgress - fract(phase) * 0.28) * 1.4, 0.0, 1.0);

          vec3 p = aOrigin;
          p.y -= t * (16.0 + fall * 16.0);
          // zijwaarts wiegen tijdens het vallen
          p.x += sin(uTime * spin * 0.8 + phase * 6.0) * 1.6 * t;
          p.z += cos(uTime * spin * 0.6 + phase * 4.0) * 1.1 * t;

          // op de grond blijven liggen
          p.y = max(p.y, 1.75);

          // het snippertje zelf: klein vlakje dat om zijn as tolt
          vec2 quad = aCorner * vec2(0.10, 0.16);
          float a = uTime * spin * 2.2 + phase * 3.0;
          quad = rot(a) * quad;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          mv.xy += quad;
          // schijnbare dikte: het vlakje 'draait weg' van de kijker
          vShade = 0.45 + 0.55 * abs(sin(a * 0.9));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vShade;
        void main(){
          gl_FragColor = vec4(vColor * vShade, uOpacity);
        }
      `,
    })

    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.renderOrder = 7
    this.mesh.visible = false
  }

  /** @param {number} p 0 → 1 door de finale heen */
  setProgress(p) {
    const v = clamp(p)
    this.uniforms.uProgress.value = v
    // aan het eind rustig uitfaden zodat het niet blijft liggen
    this.uniforms.uOpacity.value = Math.min(1, v * 6) * (1 - Math.max(0, (v - 0.82) / 0.18) * 0.75)
    this.mesh.visible = v > 0.002
  }

  update(elapsed) { this.uniforms.uTime.value = elapsed }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
