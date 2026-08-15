import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { PALETTE, CAMPER_POS } from '../config.js'
import { clamp, lerp, smoothstep, makeRandom } from '../utils/math.js'

/**
 * De camper van Phaedra & Nils op de camperplaats aan het water.
 * Alles is met de hand uit primitieven opgebouwd: geen model te laden,
 * dus de pagina is meteen klaar voor gebruik.
 */
export default class Camper {
  constructor() {
    this.group = new THREE.Group()
    this.group.position.set(...CAMPER_POS)
    this.group.rotation.y = 0.44

    this.reveal = 0
    this.nightScale = 1
    this.uniforms = { uTime: { value: 0 } }

    this.mats = {
      cream: new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.42, metalness: 0.06 }),
      navy:  new THREE.MeshStandardMaterial({ color: 0x11337f, roughness: 0.4, metalness: 0.08 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xc9d4e2, roughness: 0.22, metalness: 0.85 }),
      tyre:  new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.95 }),
      rim:   new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.35, metalness: 0.6 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x0a1730, roughness: 0.08, metalness: 0.35,
        emissive: PALETTE.lamp, emissiveIntensity: 0,
      }),
      bulb: new THREE.MeshStandardMaterial({
        color: 0x2a2010, emissive: 0xffc978, emissiveIntensity: 0, roughness: 1,
      }),
    }

    this.#buildBody()
    this.#buildWheels()
    this.#buildAwning()
    this.#buildStringLights()
    this.#buildCampfire()

    // warm licht dat vanuit de camper naar buiten valt
    this.interiorLight = new THREE.PointLight(PALETTE.lamp, 0, 18, 2)
    this.interiorLight.position.set(0, 1.6, -1.6)
    this.group.add(this.interiorLight)
  }

  /* ---------------- carrosserie ---------------- */
  #buildBody() {
    const g = new THREE.Group()

    // romp: crème boven, blauw onder — knipoog naar het merk
    const upper = new THREE.Mesh(new RoundedBoxGeometry(5.2, 1.35, 2.25, 4, 0.34), this.mats.cream)
    upper.position.y = 1.72
    g.add(upper)

    const lower = new THREE.Mesh(new RoundedBoxGeometry(5.2, 1.0, 2.28, 4, 0.3), this.mats.navy)
    lower.position.y = 0.92
    g.add(lower)

    // gele bies op de scheiding
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.1, 2.33),
      new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.5 }))
    stripe.position.y = 1.4
    g.add(stripe)
    this.stripeMat = stripe.material

    // afgeronde neus
    const nose = new THREE.Mesh(new RoundedBoxGeometry(0.5, 1.9, 2.05, 3, 0.4), this.mats.cream)
    nose.position.set(2.62, 1.3, 0)
    g.add(nose)

    // hefdak
    this.popTop = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.42, 2.05, 3, 0.18), this.mats.cream)
    this.popTop.position.set(-0.5, 2.46, 0)
    g.add(this.popTop)

    // imperiaal met wat kampeerspul
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.9), this.mats.chrome)
    rack.position.set(1.5, 2.42, 0)
    g.add(rack)
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 1.1), this.mats.navy)
    crate.position.set(1.5, 2.66, 0)
    g.add(crate)

    // ramen
    const side = new THREE.BoxGeometry(1.35, 0.78, 0.06)
    for (const x of [-1.75, -0.28, 1.2]) {
      for (const z of [-1.16, 1.16]) {
        const w = new THREE.Mesh(side, this.mats.glass)
        w.position.set(x, 1.82, z)
        g.add(w)
      }
    }
    // voorruit
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.85), this.mats.glass)
    front.position.set(2.86, 1.72, 0)
    g.add(front)

    // bumper, koplampen, spiegel
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 2.15), this.mats.chrome)
    bumper.position.set(2.82, 0.62, 0)
    g.add(bumper)

    this.headlights = []
    for (const z of [-0.72, 0.72]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), this.mats.bulb)
      lamp.position.set(2.8, 1.15, z)
      g.add(lamp)
      this.headlights.push(lamp)
    }

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.16), this.mats.chrome)
    mirror.position.set(2.5, 1.95, -1.3)
    g.add(mirror)

    // trapje bij de schuifdeur
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.4), this.mats.chrome)
    step.position.set(-0.3, 0.44, -1.35)
    g.add(step)

    this.body = g
    this.group.add(g)
  }

  /* ---------------- wielen ---------------- */
  #buildWheels() {
    this.wheels = []
    const tyre = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 18)
    tyre.rotateZ(Math.PI / 2)
    const rim = new THREE.CylinderGeometry(0.27, 0.27, 0.36, 12)
    rim.rotateZ(Math.PI / 2)

    for (const x of [1.75, -1.75]) {
      for (const z of [-1.02, 1.02]) {
        const w = new THREE.Group()
        w.add(new THREE.Mesh(tyre, this.mats.tyre))
        w.add(new THREE.Mesh(rim, this.mats.rim))
        w.position.set(x, 0.52, z)
        this.group.add(w)
        this.wheels.push(w)
      }
    }
  }

  /* ---------------- luifel ---------------- */
  #buildAwning() {
    // gestreept doek in het roze en crème van de camping
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 16
    const ctx = canvas.getContext('2d')
    const stripeColors = ['#fbf2e8', '#e38bb1']
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = stripeColors[i % 2]
      ctx.fillRect((i * canvas.width) / 8, 0, canvas.width / 8, canvas.height)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 4

    this.awningMat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.9, side: THREE.DoubleSide,
    })

    // scharnier zit bovenaan de waterzijde van de bus
    this.awningPivot = new THREE.Group()
    this.awningPivot.position.set(-0.4, 2.28, -1.14)
    this.group.add(this.awningPivot)

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.9, 12, 8), this.awningMat)
    cloth.rotation.x = -Math.PI / 2
    cloth.position.z = -1.45
    this.awningCloth = cloth
    this.awningPivot.add(cloth)

    // doorhangen van het doek vastleggen in de geometrie
    const pos = cloth.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)              // -1.45 aan de bus → +1.45 aan de buitenrand
      const outer = (y + 1.45) / 2.9     // 0 → 1
      const acrossHold = Math.cos((x / 2.0) * Math.PI * 0.5) // 1 in het midden, 0 bij de stokken
      // het doek hangt door tussen de stokken, en het meest aan de buitenrand
      pos.setZ(i, -0.2 * (1 - acrossHold) * (0.35 + outer))
    }
    pos.needsUpdate = true
    cloth.geometry.computeVertexNormals()

    // twee stokken die het doek overeind houden
    this.awningPoles = []
    const poleMat = this.mats.chrome
    for (const x of [-1.85, 1.85]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 6), poleMat)
      pole.position.set(x, -1.1, -2.86)
      this.awningPivot.add(pole)
      this.awningPoles.push(pole)
    }

    // stoeltjes en een tafeltje onder de luifel
    this.furniture = new THREE.Group()
    this.furniture.position.set(-1.0, 0, -3.4)
    const chairMats = [
      new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: PALETTE.pink, roughness: 0.85 }),
    ]
    for (let i = 0; i < 2; i++) {
      const chair = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.6), chairMats[i])
      seat.position.y = 0.46
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.09), chairMats[i])
      back.position.set(0, 0.76, 0.28)
      back.rotation.x = -0.2
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.5), this.mats.chrome)
      legs.position.y = 0.23
      legs.scale.set(0.12, 1, 0.12)
      chair.add(seat, back, legs)
      chair.position.set(i === 0 ? -0.75 : 0.75, 0, i === 0 ? 0 : 0.35)
      chair.rotation.y = i === 0 ? 0.3 : -0.45
      this.furniture.add(chair)
    }
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.07, 14), this.mats.cream)
    table.position.set(0, 0.56, 0.9)
    const tleg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.56, 8), this.mats.chrome)
    tleg.position.set(0, 0.28, 0.9)
    this.furniture.add(table, tleg)
    this.group.add(this.furniture)
  }

  /* ---------------- lichtsnoer ---------------- */
  #buildStringLights() {
    this.stringGroup = new THREE.Group()
    this.group.add(this.stringGroup)

    // paaltje waar het snoer aan hangt
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.0, 6), this.mats.chrome)
    post.position.set(-4.4, 1.5, -3.6)
    this.stringGroup.add(post)

    const a = new THREE.Vector3(0.5, 2.5, -1.2)
    const b = new THREE.Vector3(-4.4, 2.9, -3.6)
    const points = []
    const N = 26
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const p = a.clone().lerp(b, u)
      p.y -= Math.sin(u * Math.PI) * 0.65 // doorhang
      points.push(p)
    }

    const curve = new THREE.CatmullRomCurve3(points)
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.012, 4, false),
      new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 1 }),
    )
    this.stringGroup.add(wire)

    // de lampjes zelf
    this.bulbMat = new THREE.MeshStandardMaterial({
      color: 0x2a2010, emissive: 0xffcf8a, emissiveIntensity: 0, roughness: 1,
    })
    const bulbGeo = new THREE.SphereGeometry(0.075, 8, 6)
    this.bulbs = new THREE.InstancedMesh(bulbGeo, this.bulbMat, 13)
    const dummy = new THREE.Object3D()
    this.bulbSeeds = []
    const rand = makeRandom(818)
    for (let i = 0; i < 13; i++) {
      const p = curve.getPointAt((i + 0.5) / 13)
      dummy.position.copy(p).add(new THREE.Vector3(0, -0.09, 0))
      dummy.updateMatrix()
      this.bulbs.setMatrixAt(i, dummy.matrix)
      this.bulbSeeds.push(rand() * 10)
    }
    this.bulbs.instanceMatrix.needsUpdate = true
    this.stringGroup.add(this.bulbs)

    this.stringLight = new THREE.PointLight(0xffcf8a, 0, 16, 2)
    this.stringLight.position.set(-2, 2.4, -2.6)
    this.stringGroup.add(this.stringLight)
  }

  /* ---------------- kampvuur ---------------- */
  #buildCampfire() {
    const g = new THREE.Group()
    g.position.set(-2.4, 0, -5.6)

    // ring van stenen
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5e, roughness: 1 })
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17 + Math.sin(i * 3) * 0.04, 0), stoneMat)
      s.position.set(Math.cos(a) * 0.62, 0.09, Math.sin(a) * 0.62)
      s.rotation.set(i, i * 2, i * 3)
      g.add(s)
    }
    // houtblokken
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3d2a1c, roughness: 1 })
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 6), logMat)
      log.position.set(Math.cos(a) * 0.13, 0.18, Math.sin(a) * 0.13)
      log.rotation.set(Math.PI / 2 - 0.4, a, 0)
      g.add(log)
    }

    // vlammen als punten
    const N = 90
    const positions = new Float32Array(N * 3)
    const seeds = new Float32Array(N)
    const rand = makeRandom(55)
    for (let i = 0; i < N; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.pow(rand(), 0.6) * 0.3
      positions[i * 3 + 0] = Math.cos(a) * r
      positions[i * 3 + 1] = 0.12
      positions[i * 3 + 2] = Math.sin(a) * r
      seeds[i] = rand()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    this.fireUniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uScale: { value: 1 } }
    const fireMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: this.fireUniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uScale;
        varying float vLife; varying float vSeed;
        void main(){
          vSeed = aSeed;
          float life = fract(uTime * (0.55 + aSeed * 0.5) + aSeed);
          vLife = life;
          vec3 p = position;
          p.y += life * 1.25;
          // de vlam kronkelt en knijpt naar boven toe samen
          p.x += sin(uTime * 3.4 + aSeed * 20.0) * 0.09 * life;
          p.z += cos(uTime * 2.9 + aSeed * 17.0) * 0.09 * life;
          p.xz *= 1.0 - life * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (26.0 * (1.0 - life * 0.55) + 4.0) * uScale / max(-mv.z, 1.0) * 6.0;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vLife; varying float vSeed;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float m = smoothstep(0.5, 0.05, d);
          // van geelwit via oranje naar rook
          vec3 hot  = vec3(1.0, 0.92, 0.55);
          vec3 mid  = vec3(1.0, 0.46, 0.12);
          vec3 cold = vec3(0.35, 0.12, 0.05);
          vec3 col = mix(hot, mid, smoothstep(0.0, 0.45, vLife));
          col = mix(col, cold, smoothstep(0.45, 1.0, vLife));
          float fade = (1.0 - smoothstep(0.55, 1.0, vLife));
          gl_FragColor = vec4(col, m * fade * uOpacity * 0.85);
        }
      `,
    })
    this.flames = new THREE.Points(geo, fireMat)
    this.flames.frustumCulled = false
    g.add(this.flames)

    this.fireLight = new THREE.PointLight(0xff7a2a, 0, 15, 2)
    this.fireLight.position.set(0, 0.55, 0)
    g.add(this.fireLight)

    this.campfire = g
    this.group.add(g)
  }

  /* ---------------- animatie ---------------- */

  /**
   * @param {number} v 0 = alles nog dicht en donker, 1 = luifel uit en alles brandt
   */
  setReveal(v) {
    this.reveal = clamp(v)
  }

  setPixelRatio(dpr) {
    this.fireUniforms.uScale.value = dpr
  }

  update(elapsed, dt) {
    const r = this.reveal
    this.uniforms.uTime.value = elapsed
    this.fireUniforms.uTime.value = elapsed

    // luifel klapt uit
    const open = smoothstep(0.0, 0.62, r)
    this.awningPivot.rotation.x = lerp(-Math.PI * 0.52, -0.13, open)
    const poleScale = Math.max(0.001, open)
    for (const p of this.awningPoles) p.scale.y = poleScale

    // meubels verschijnen daarna
    const furn = smoothstep(0.45, 0.95, r)
    this.furniture.scale.setScalar(Math.max(0.001, furn))
    this.furniture.visible = furn > 0.01

    // hefdak omhoog
    this.popTop.position.y = lerp(2.24, 2.62, smoothstep(0.1, 0.7, r))

    // licht aan — en 's ochtends weer uit
    const night = this.nightScale
    const lit = smoothstep(0.15, 0.8, r) * night
    const breathe = 1 + Math.sin(elapsed * 1.7) * 0.05
    this.mats.glass.emissiveIntensity = lit * 0.55 * breathe
    this.interiorLight.intensity = lit * 7 * breathe
    this.mats.bulb.emissiveIntensity = lit * 0.25 // koplampen vangen alleen wat gloed

    // lichtsnoer flikkert lui
    const strung = smoothstep(0.3, 0.9, r) * night
    this.bulbMat.emissiveIntensity = strung * (1.15 + Math.sin(elapsed * 2.3) * 0.16)
    this.stringLight.intensity = strung * 5
    this.stringGroup.position.y = Math.sin(elapsed * 0.9) * 0.02

    // vuur — brandt 's ochtends nog een beetje na
    const fire = smoothstep(0.35, 0.95, r) * (0.25 + night * 0.75)
    this.fireUniforms.uOpacity.value = fire
    const flick = 0.75 + Math.abs(Math.sin(elapsed * 6.1)) * 0.18 + Math.sin(elapsed * 13.7) * 0.09
    this.fireLight.intensity = fire * 8 * flick

    // de bus deint heel licht op zijn vering
    this.body.position.y = Math.sin(elapsed * 1.1) * 0.012
    this.body.rotation.z = Math.sin(elapsed * 0.75) * 0.0035
  }

  apply(state) {
    // 's ochtends dooft alles wat brandt
    const day = clamp((state.ambient - 0.3) / 0.6)
    this.nightScale = clamp(1 - day * 1.1)
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map) m.map.dispose()
        m.dispose()
      })
    })
  }
}
