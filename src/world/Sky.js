import * as THREE from 'three'
import { NOISE } from './shaders/common.glsl.js'

/**
 * Koepel van hemel: verlopende gradiënt, een zon/maan-schijf met halo,
 * en dunne wolkenbanken die traag over de horizon schuiven.
 */
export default class Sky {
  constructor() {
    this.uniforms = {
      uTop:       { value: new THREE.Color(0x01050f) },
      uMid:       { value: new THREE.Color(0x061634) },
      uHorizon:   { value: new THREE.Color(0x0b2a5e) },
      uSunColor:  { value: new THREE.Color(0xdfe8ff) },
      uSunDir:    { value: new THREE.Vector3(-0.34, 0.3, -0.9).normalize() },
      uSunSize:   { value: 900 },
      uSunPower:  { value: 0.9 },
      uTime:      { value: 0 },
      uCloud:     { value: 0.35 },
    }

    const geometry = new THREE.SphereGeometry(600, 48, 32)

    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE}
        uniform vec3  uTop, uMid, uHorizon, uSunColor, uSunDir;
        uniform float uSunSize, uSunPower, uTime, uCloud;
        varying vec3 vDir;

        void main(){
          vec3 dir = normalize(vDir);
          float h = dir.y;

          // gradiënt: horizon → midden → zenit
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.30, h));
          col = mix(col, uTop, smoothstep(0.22, 0.85, h));

          // onder de horizon rustig uitdoven
          col = mix(col * 0.55, col, smoothstep(-0.35, 0.0, h));

          // zon/maan
          float d = max(dot(dir, normalize(uSunDir)), 0.0);
          float disc = pow(d, uSunSize) * 3.2;
          float halo = pow(d, 26.0) * 0.55 * uSunPower;
          float bloom = pow(d, 3.5) * 0.18 * uSunPower;
          col += uSunColor * (disc + halo + bloom);

          // wolkenbanken, alleen laag bij de horizon
          vec2 cp = vec2(atan(dir.z, dir.x) * 1.6, h * 5.2);
          float clouds = fbm(cp * 1.1 + vec2(uTime * 0.010, uTime * 0.004));
          clouds = smoothstep(0.05, 0.85, clouds);
          float band = smoothstep(0.42, 0.02, abs(h - 0.09));
          col = mix(col, col + uSunColor * 0.16 + uHorizon * 0.30, clouds * band * uCloud);

          // fijne dithering tegen banding in de verlopen
          float dither = (fract(sin(dot(dir.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
          gl_FragColor = vec4(col + dither, 1.0);
        }
      `,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.renderOrder = -100
    this.mesh.frustumCulled = false
  }

  update(elapsed) {
    this.uniforms.uTime.value = elapsed
  }

  /** Wordt door de Director gevoed met de gemengde hemelsleutel. */
  apply(state) {
    this.uniforms.uTop.value.copy(state.top)
    this.uniforms.uMid.value.copy(state.mid)
    this.uniforms.uHorizon.value.copy(state.horizon)
    this.uniforms.uSunColor.value.copy(state.sun)
    this.uniforms.uSunDir.value.copy(state.sunDir)
    this.uniforms.uSunSize.value = state.sunSize
    this.uniforms.uSunPower.value = state.sunPower
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
