import * as THREE from 'three'
import { NOISE } from './shaders/common.glsl.js'

/**
 * Het water van de Dieze.
 *
 * Truc: de mesh zelf wordt maar grof vervormd (drie lange deiningen),
 * maar de normaal wordt per pixel analytisch berekend uit dezelfde
 * golfformule plus vier korte golfjes. Zo krijg je scherpe schittering
 * en fijne rimpeling zonder miljoenen driehoeken.
 */
export default class Water {
  constructor({ segments = 256, size = 1400, shoreZ = 18 } = {}) {
    this.uniforms = {
      uTime:       { value: 0 },
      uDeep:       { value: new THREE.Color(0x030b1e) },
      uShallow:    { value: new THREE.Color(0x0a2350) },
      uSpec:       { value: new THREE.Color(0xcfe0ff) },
      uFog:        { value: new THREE.Color(0x081a3d) },
      uSunDir:     { value: new THREE.Vector3(-0.34, 0.3, -0.9).normalize() },
      uSunPower:   { value: 0.9 },
      uShoreZ:     { value: shoreZ },
      uChop:       { value: 1.0 },
      uSparkle:    { value: 1.0 },
    }

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.FrontSide,
      vertexShader: /* glsl */ `
        uniform float uTime, uChop;
        varying vec3 vWorld;

        // één sinusgolf; vult tegelijk de gradiënt aan
        float waveTerm(vec2 p, vec2 dir, float len, float amp, float spd, float t, inout vec2 grad){
          float k = 6.2831853 / len;
          float f = dot(normalize(dir), p) * k + t * spd;
          grad += normalize(dir) * (k * amp * cos(f));
          return amp * sin(f);
        }

        // lange deining — ook gebruikt in de fragment shader
        float swell(vec2 p, float t, inout vec2 grad){
          float h = 0.0;
          h += waveTerm(p, vec2( 1.0,  0.35), 86.0, 0.62, 0.55, t, grad);
          h += waveTerm(p, vec2(-0.6,  1.0),  54.0, 0.34, 0.72, t, grad);
          h += waveTerm(p, vec2( 0.8, -0.75), 31.0, 0.19, 0.98, t, grad);
          return h;
        }

        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec2 grad = vec2(0.0);
          wp.y += swell(wp.xz, uTime, grad) * uChop;
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE}
        uniform float uTime, uShoreZ, uSunPower, uSparkle, uChop;
        uniform vec3  uDeep, uShallow, uSpec, uFog, uSunDir;
        varying vec3  vWorld;

        float waveTerm(vec2 p, vec2 dir, float len, float amp, float spd, float t, inout vec2 grad){
          float k = 6.2831853 / len;
          vec2  d = normalize(dir);
          float f = dot(d, p) * k + t * spd;
          grad += d * (k * amp * cos(f));
          return amp * sin(f);
        }

        void main(){
          vec2 p = vWorld.xz;
          vec2 grad = vec2(0.0);

          // dezelfde deining als in de vertex shader …
          waveTerm(p, vec2( 1.0,  0.35), 86.0, 0.62, 0.55, uTime, grad);
          waveTerm(p, vec2(-0.6,  1.0),  54.0, 0.34, 0.72, uTime, grad);
          waveTerm(p, vec2( 0.8, -0.75), 31.0, 0.19, 0.98, uTime, grad);
          // … plus het fijne werk dat de mesh nooit zou kunnen dragen
          waveTerm(p, vec2( 0.3,  1.0),  13.0, 0.075, 1.5, uTime, grad);
          waveTerm(p, vec2(-1.0,  0.45),  7.4, 0.040, 2.1, uTime, grad);
          waveTerm(p, vec2( 1.0, -0.15),  4.1, 0.021, 3.0, uTime, grad);
          waveTerm(p, vec2( 0.15, 1.0),   2.3, 0.011, 4.4, uTime, grad);

          // kabbelende ruis er bovenop
          float n = fbm(p * 0.22 + vec2(uTime * 0.05, uTime * 0.03));
          grad += vec2(dFdx(n), dFdy(n)) * 3.0;

          vec3 N = normalize(vec3(-grad.x * uChop, 1.0, -grad.y * uChop));
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);

          float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);

          vec3 col = mix(uDeep, uShallow, clamp(fres * 1.35, 0.0, 1.0));

          // maanpad / zonnepad: een scherpe en een brede lob
          float ndh = max(dot(N, H), 0.0);
          float sharp = pow(ndh, 420.0) * 2.6;
          float broad = pow(ndh, 22.0)  * 0.42;
          col += uSpec * (sharp + broad) * uSunPower;

          // glinstering: kleine hoogfrequente pieken in het pad
          float glint = pow(ndh, 90.0) * smoothstep(0.4, 1.0, fbm(p * 3.1 + uTime * 0.6));
          col += uSpec * glint * 1.6 * uSparkle * uSunPower;

          // schuimrand langs de kade
          float toShore = uShoreZ - vWorld.z;
          float foamBand = smoothstep(5.5, 0.2, toShore) * smoothstep(-1.4, 0.4, toShore);
          float foamNoise = smoothstep(0.15, 0.75, fbm(vec2(p.x * 0.55, uTime * 0.85)));
          col = mix(col, uSpec * 0.85 + vec3(0.08), foamBand * foamNoise * 0.55);

          // naar de horizon toe oplossen in de nevel
          float dist = length(cameraPosition.xz - p);
          float haze = smoothstep(60.0, 620.0, dist);
          col = mix(col, uFog, haze * 0.94);

          // lineair de compositor in — OutputPass doet tonemapping en kleurruimte
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(0, 0, -250)
    this.mesh.renderOrder = 1
    this.mesh.frustumCulled = false
  }

  update(elapsed) {
    this.uniforms.uTime.value = elapsed
  }

  apply(state) {
    this.uniforms.uDeep.value.copy(state.waterDeep)
    this.uniforms.uShallow.value.copy(state.waterShallow)
    this.uniforms.uSpec.value.copy(state.waterSpec)
    this.uniforms.uFog.value.copy(state.fog)
    this.uniforms.uSunDir.value.copy(state.sunDir)
    this.uniforms.uSunPower.value = state.sunPower
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
