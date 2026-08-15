import * as THREE from 'three'
import { makeRandom } from '../utils/math.js'

/**
 * Sterrenveld op een halve bol. Elke ster heeft een eigen twinkeltempo,
 * en het hele veld dooft uit zodra de zon opkomt.
 */
export default class Stars {
  constructor(count = 2400) {
    const rand = makeRandom(90210)
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const sizes = new Float32Array(count)
    const tints = new Float32Array(count * 3)

    const warm = new THREE.Color(0xffe7c2)
    const cool = new THREE.Color(0xc7d8ff)
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // gelijkmatig over de bovenste helft van de bol
      const u = rand()
      const phi = Math.acos(1 - u * 1.06) // licht naar boven gewogen
      const theta = rand() * Math.PI * 2
      const r = 460 + rand() * 60

      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) + 12
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      seeds[i] = rand() * 100
      // een paar echt heldere, veel zwakke
      sizes[i] = Math.pow(rand(), 3.2) * 5.4 + 0.7

      c.copy(rand() > 0.72 ? warm : cool).offsetHSL(0, 0, (rand() - 0.5) * 0.14)
      tints[i * 3 + 0] = c.r
      tints[i * 3 + 1] = c.g
      tints[i * 3 + 2] = c.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3))

    this.uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uScale: { value: 1 },
    }

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        attribute float aSize;
        attribute vec3  aTint;
        uniform float uTime, uScale;
        varying float vTwinkle;
        varying vec3  vTint;

        void main(){
          vTint = aTint;
          // twee sinussen door elkaar → onregelmatig knipperen
          float a = sin(uTime * 1.35 + aSeed * 6.1);
          float b = sin(uTime * 0.47 + aSeed * 2.3);
          vTwinkle = 0.55 + 0.45 * (a * 0.6 + b * 0.4);

          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale * (1.0 + vTwinkle * 0.35);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vTwinkle;
        varying vec3  vTint;

        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          // zachte kern met een subtiele halo
          float core = smoothstep(0.5, 0.0, d);
          float glow = pow(core, 3.5);
          float alpha = (glow * 0.9 + core * 0.18) * vTwinkle * uOpacity;
          gl_FragColor = vec4(vTint, alpha);
        }
      `,
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = -90
  }

  update(elapsed) {
    this.uniforms.uTime.value = elapsed
    // heel traag meedraaien — je merkt het niet bewust, maar het leeft
    this.points.rotation.y = elapsed * 0.004
  }

  setOpacity(v) {
    this.uniforms.uOpacity.value = v
    this.points.visible = v > 0.01
  }

  setPixelRatio(dpr) {
    this.uniforms.uScale.value = dpr
  }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.dispose()
  }
}
