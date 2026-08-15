import * as THREE from 'three'
import { PALETTE, GROUND_Y } from '../config.js'
import { clamp, smoothstep, makeRandom } from '../utils/math.js'

/**
 * De ontbijttafel van de ochtend erna: koffie die damp geeft, croissants,
 * een mandje brood en een bloemetje. Alles komt met een klein sprongetje
 * tevoorschijn zodra de zon opkomt.
 */
export default class Breakfast {
  constructor() {
    this.group = new THREE.Group()
    this.group.position.set(8.2, GROUND_Y, 32.4)
    this.group.rotation.y = -0.5
    this.reveal = 0
    this.items = []

    const rand = makeRandom(606)

    const mats = {
      cloth: new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.9 }),
      porcelain: new THREE.MeshStandardMaterial({ color: 0xfdf8f1, roughness: 0.32 }),
      mug: new THREE.MeshStandardMaterial({ color: PALETTE.pink, roughness: 0.4 }),
      coffee: new THREE.MeshStandardMaterial({ color: 0x2c1a10, roughness: 0.25 }),
      bread: new THREE.MeshStandardMaterial({ color: 0xd8a05a, roughness: 0.85 }),
      crust: new THREE.MeshStandardMaterial({ color: 0xc4813c, roughness: 0.8 }),
      jam: new THREE.MeshStandardMaterial({ color: 0xb2324f, roughness: 0.2, transparent: true, opacity: 0.9 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xcfd8e2, roughness: 0.3, metalness: 0.7 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x4e8a52, roughness: 1 }),
      petal: new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.7 }),
    }
    this.mats = mats

    // ---- tafel ----
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.07, 28), mats.cloth)
    top.position.y = 0.75
    this.group.add(top)

    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.98, 0.34, 28, 1, true), mats.cloth)
    skirt.position.y = 0.56
    skirt.material.side = THREE.DoubleSide
    this.group.add(skirt)

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.72, 10), mats.wood)
    leg.position.y = 0.36
    this.group.add(leg)

    const TOP = 0.79

    // ---- twee couverts ----
    this.steamAnchors = []
    for (const s of [-1, 1]) {
      const px = s * 0.46
      const pz = s * 0.2

      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.028, 20), mats.porcelain)
      plate.position.set(px, TOP, pz)
      this.#pop(plate)

      // croissant: een halve torus, afgeplat
      const croissant = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.045, 8, 14, Math.PI * 1.25), mats.crust,
      )
      croissant.position.set(px, TOP + 0.05, pz)
      croissant.rotation.set(Math.PI / 2, 0, s * 0.6)
      croissant.scale.set(1, 1, 0.75)
      this.#pop(croissant)

      // mok met koffie
      const mug = new THREE.Group()
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.13, 14, 1, true), mats.mug)
      cup.material.side = THREE.DoubleSide
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), mats.mug)
      base.position.y = -0.055
      const brew = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.01, 14), mats.coffee)
      brew.position.y = 0.045
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 12, Math.PI * 1.3), mats.mug)
      handle.position.set(0.09, 0, 0)
      handle.rotation.z = -0.4
      mug.add(cup, base, brew, handle)
      mug.position.set(px + s * 0.3, TOP + 0.065, pz - 0.3)
      this.#pop(mug)

      // mesje
      const knife = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.022), mats.metal)
      knife.position.set(px + s * 0.02, TOP + 0.014, pz + 0.3)
      knife.rotation.y = s * 0.25
      this.#pop(knife)

      this.group.add(plate, croissant, mug, knife)
      this.steamAnchors.push(mug.position.clone().add(new THREE.Vector3(0, 0.08, 0)))
    }

    // ---- broodmandje ----
    const basket = new THREE.Group()
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.14, 14, 1, true), mats.wood)
    bowl.material.side = THREE.DoubleSide
    basket.add(bowl)
    for (let i = 0; i < 5; i++) {
      const roll = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mats.bread)
      roll.position.set((rand() - 0.5) * 0.22, 0.05 + rand() * 0.04, (rand() - 0.5) * 0.22)
      roll.scale.set(1.3, 0.85, 1)
      roll.rotation.y = rand() * Math.PI
      basket.add(roll)
    }
    basket.position.set(0, TOP + 0.07, 0.42)
    this.#pop(basket)
    this.group.add(basket)

    // ---- jampotje ----
    const jar = new THREE.Group()
    jar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), mats.jam))
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.02, 12), mats.metal)
    lid.position.y = 0.07
    jar.add(lid)
    jar.position.set(-0.16, TOP + 0.06, -0.44)
    this.#pop(jar)
    this.group.add(jar)

    // ---- bloemetje in een vaasje ----
    this.flower = new THREE.Group()
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 12), mats.porcelain)
    vase.position.y = 0.08
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.3, 6), mats.leaf)
    stem.position.y = 0.28
    const bloom = new THREE.Group()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.petal)
      petal.position.set(Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045)
      petal.scale.set(1, 0.5, 1)
      bloom.add(petal)
    }
    bloom.position.y = 0.44
    this.flower.add(vase, stem, bloom)
    this.flower.position.set(0.26, TOP, -0.5)
    this.#pop(this.flower)
    this.group.add(this.flower)

    this.#buildSteam()
  }

  /** Markeert een object zodat het straks met een sprongetje verschijnt. */
  #pop(obj) {
    obj.userData.baseScale = obj.scale.clone()
    obj.userData.baseY = obj.position.y
    obj.userData.delay = this.items.length * 0.055
    this.items.push(obj)
    return obj
  }

  /** Damp boven de koffie. */
  #buildSteam() {
    const perMug = 22
    const anchors = this.steamAnchors
    const N = perMug * anchors.length
    const positions = new Float32Array(N * 3)
    const seeds = new Float32Array(N)
    const rand = makeRandom(9091)

    let i = 0
    for (const a of anchors) {
      for (let k = 0; k < perMug; k++, i++) {
        positions[i * 3 + 0] = a.x + (rand() - 0.5) * 0.06
        positions[i * 3 + 1] = a.y
        positions[i * 3 + 2] = a.z + (rand() - 0.5) * 0.06
        seeds[i] = rand()
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    this.steamUniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uScale: { value: 1 } }

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: this.steamUniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uScale;
        varying float vLife;
        void main(){
          float life = fract(uTime * (0.22 + aSeed * 0.12) + aSeed);
          vLife = life;
          vec3 p = position;
          p.y += life * 0.55;
          p.x += sin(uTime * 0.9 + aSeed * 22.0) * 0.06 * life;
          p.z += cos(uTime * 0.7 + aSeed * 18.0) * 0.06 * life;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (5.0 + life * 26.0) * uScale / max(-mv.z, 1.0) * 6.0;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vLife;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float m = smoothstep(0.5, 0.0, d);
          float fade = smoothstep(0.0, 0.18, vLife) * (1.0 - smoothstep(0.4, 1.0, vLife));
          gl_FragColor = vec4(1.0, 0.98, 0.95, m * fade * uOpacity * 0.30);
        }
      `,
    })

    this.steam = new THREE.Points(geo, mat)
    this.steam.frustumCulled = false
    this.group.add(this.steam)
  }

  setReveal(v) { this.reveal = clamp(v) }
  setPixelRatio(dpr) { this.steamUniforms.uScale.value = dpr }

  update(elapsed) {
    const r = this.reveal
    this.steamUniforms.uTime.value = elapsed
    this.steamUniforms.uOpacity.value = smoothstep(0.55, 1.0, r)
    this.group.visible = r > 0.001

    // items ploppen één voor één tevoorschijn
    for (const o of this.items) {
      const local = smoothstep(o.userData.delay, o.userData.delay + 0.45, r * 1.35)
      // kleine overshoot: het landt met een tikje
      const pop = local < 1 ? local * (1 + (1 - local) * 0.35) : 1
      const s = Math.max(0.0001, pop)
      o.scale.set(
        o.userData.baseScale.x * s,
        o.userData.baseScale.y * s,
        o.userData.baseScale.z * s,
      )
      o.position.y = o.userData.baseY + (1 - local) * 0.25
    }

    // het bloemetje wiegt
    this.flower.rotation.z = Math.sin(elapsed * 1.3) * 0.05
    this.flower.rotation.x = Math.cos(elapsed * 1.1) * 0.04
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
    })
    for (const m of Object.values(this.mats)) m.dispose()
    this.steam.material.dispose()
  }
}
