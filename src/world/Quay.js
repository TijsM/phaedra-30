import * as THREE from 'three'
import { PALETTE, GROUND_Y, BOAT_POS } from '../config.js'
import { makeRandom, clamp } from '../utils/math.js'
import { mergeGeometries } from './Skyline.js'

const SHORE_Z = 18

/**
 * De kade van Stadscamping Overboord: gras, kademuur, steiger, riet,
 * bomen, het oude sluiswachtershuis, de kas en het stadsstrandje.
 */
export default class Quay {
  constructor({ quality }) {
    this.group = new THREE.Group()
    this.uniforms = { uTime: { value: 0 } }
    this.pointLights = []
    this.lampScale = 1

    const rand = makeRandom(2024)

    this.mats = {
      grass: new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x33405f, roughness: 0.92 }),
      wood:  new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 }),
      sand:  new THREE.MeshStandardMaterial({ color: 0xb9a483, roughness: 1 }),
      brick: new THREE.MeshStandardMaterial({ color: 0x6d4a45, roughness: 0.94 }),
      roof:  new THREE.MeshStandardMaterial({ color: 0x2b3350, roughness: 0.85 }),
      cream: new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.7 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x2e3a4d, roughness: 0.45, metalness: 0.5 }),
      leaf:  new THREE.MeshStandardMaterial({ color: 0x27503c, roughness: 1 }),
      glow:  new THREE.MeshStandardMaterial({
        color: 0x1a1408, emissive: PALETTE.lamp, emissiveIntensity: 1.0, roughness: 1,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x9fd8cf, emissive: 0x6fbfae, emissiveIntensity: 0.55,
        transparent: true, opacity: 0.42, roughness: 0.15, metalness: 0.1,
      }),
    }

    this.#buildGround()
    this.#buildDock()
    this.#buildReeds(rand, quality)
    this.#buildTrees(rand, quality)
    this.#buildLockHouse()
    this.#buildGreenhouse()
    this.#buildBeach(rand)
    this.#buildLampPosts()
    this.#buildRowboat()
  }

  /* ---------------- afgemeerd roeibootje ---------------- */
  #buildRowboat() {
    const g = new THREE.Group()
    g.position.set(...BOAT_POS)
    g.rotation.y = 0.42

    // romp: onderste helft van een bol, uitgerekt tot een sloep
    const hullGeo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
    hullGeo.scale(0.62, 0.40, 1.75)
    const hull = new THREE.Mesh(hullGeo, this.mats.wood)
    hull.material.side = THREE.DoubleSide
    g.add(hull)

    // dolboord
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 6, 26), this.mats.wood)
    rim.rotation.x = Math.PI / 2
    rim.scale.set(0.62, 1.75, 1)
    g.add(rim)

    // twee doften
    for (const z of [-0.55, 0.5]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.22), this.mats.wood)
      bench.position.set(0, -0.06, z)
      bench.scale.x = 1 - Math.abs(z) * 0.22
      g.add(bench)
    }

    // riemen, schuin in het bootje
    for (const s of [-1, 1]) {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 1.9, 6), this.mats.wood)
      oar.position.set(s * 0.22, -0.02, 0.15)
      oar.rotation.set(0.12, s * 0.2, Math.PI / 2 - 0.06)
      g.add(oar)
    }

    // meerpaaltje ernaast, anders drijft hij nergens aan vast
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 8), this.mats.wood)
    pole.position.set(1.1, 0.2, -1.4)
    g.add(pole)

    g.scale.setScalar(1.2)
    this.rowboat = g
    this.boatMotion = { y: 0, roll: 0 }
    this.group.add(g)
  }

  /* ---------------- grond & kademuur ---------------- */
  #buildGround() {
    const parts = []

    const land = new THREE.BoxGeometry(340, 3.4, 130)
    land.translate(0, GROUND_Y - 1.7, SHORE_Z + 65)
    parts.push(land)

    // lichte glooiing achterin zodat het niet als een plaat leest
    const rise = new THREE.BoxGeometry(340, 2.2, 46)
    rise.translate(0, GROUND_Y - 0.2, SHORE_Z + 104)
    parts.push(rise)

    this.ground = new THREE.Mesh(mergeGeometries(parts), this.mats.grass)
    this.ground.receiveShadow = false
    this.group.add(this.ground)

    // kademuur met verticale voegen
    const wall = []
    const face = new THREE.BoxGeometry(340, 4.2, 1.2)
    face.translate(0, GROUND_Y - 2.1 + 0.6, SHORE_Z - 0.6)
    wall.push(face)
    for (let x = -160; x < 160; x += 4.6) {
      const rib = new THREE.BoxGeometry(0.45, 3.6, 0.5)
      rib.translate(x, GROUND_Y - 1.6, SHORE_Z - 1.3)
      wall.push(rib)
    }
    // dekplaat
    const cap = new THREE.BoxGeometry(340, 0.4, 2.4)
    cap.translate(0, GROUND_Y + 0.1, SHORE_Z - 0.6)
    wall.push(cap)

    this.quayWall = new THREE.Mesh(mergeGeometries(wall), this.mats.stone)
    this.group.add(this.quayWall)
  }

  /* ---------------- houten steiger ---------------- */
  #buildDock() {
    const parts = []
    // dek
    const deck = new THREE.BoxGeometry(6, 0.35, 15)
    deck.translate(21, GROUND_Y - 0.6, SHORE_Z - 7)
    parts.push(deck)
    // planken-naden
    for (let i = 0; i < 9; i++) {
      const plank = new THREE.BoxGeometry(5.8, 0.42, 1.35)
      plank.translate(21, GROUND_Y - 0.55, SHORE_Z - 1.2 - i * 1.6)
      parts.push(plank)
    }
    // palen
    for (const [px, pz] of [[18.4, 12], [23.6, 12], [18.4, 4], [23.6, 4], [18.4, -1.5], [23.6, -1.5]]) {
      const pile = new THREE.CylinderGeometry(0.28, 0.34, 5.2, 8)
      pile.translate(px, GROUND_Y - 2, pz)
      parts.push(pile)
    }
    // meerpaal met touw-ring
    const bollard = new THREE.CylinderGeometry(0.42, 0.5, 1.6, 10)
    bollard.translate(12, GROUND_Y + 0.6, SHORE_Z - 1.4)
    parts.push(bollard)

    this.dock = new THREE.Mesh(mergeGeometries(parts), this.mats.wood)
    this.group.add(this.dock)
  }

  /* ---------------- riet langs de waterlijn ---------------- */
  #buildReeds(rand, quality) {
    const count = quality === 'low' ? 260 : quality === 'medium' ? 520 : 900

    const blade = new THREE.CylinderGeometry(0.012, 0.05, 1, 3, 1, true)
    blade.translate(0, 0.5, 0) // voet op de oorsprong

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3c6b4a, roughness: 1, side: THREE.DoubleSide,
    })
    this.#addSway(mat, 1.0)

    const mesh = new THREE.InstancedMesh(blade, mat, count)
    const dummy = new THREE.Object3D()

    let i = 0
    while (i < count) {
      // in polletjes, links en rechts van de steiger
      const cx = -60 + rand() * 120
      if (cx > 14 && cx < 30) continue // steiger vrijhouden
      const cz = SHORE_Z - 0.7 - rand() * 1.8
      const clump = 5 + Math.floor(rand() * 7)
      for (let c = 0; c < clump && i < count; c++, i++) {
        dummy.position.set(cx + (rand() - 0.5) * 1.9, GROUND_Y - 1.5, cz + (rand() - 0.5) * 1.6)
        dummy.rotation.set((rand() - 0.5) * 0.16, rand() * Math.PI, (rand() - 0.5) * 0.22)
        // laag houden: hoog riet vlak voor de lens verstopt het hele kamp
        const h = 0.55 + rand() * 0.75
        const w = 0.6 + rand() * 0.4
        dummy.scale.set(w, h, w)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    this.reeds = mesh
    this.group.add(mesh)
  }

  /* ---------------- bomen op het trekkersveld ---------------- */
  #buildTrees(rand, quality) {
    const count = quality === 'low' ? 22 : quality === 'medium' ? 38 : 56

    const trunk = new THREE.CylinderGeometry(0.16, 0.28, 3.2, 6)
    trunk.translate(0, 1.6, 0)
    const trunkMesh = new THREE.InstancedMesh(trunk, this.mats.wood, count)

    // twee kegels op elkaar geeft een simpele, illustratieve kruin
    const c1 = new THREE.ConeGeometry(1.7, 3.0, 7); c1.translate(0, 4.2, 0)
    const c2 = new THREE.ConeGeometry(1.25, 2.4, 7); c2.translate(0, 5.7, 0)
    const crown = mergeGeometries([c1, c2])
    // eigen materiaal: de kruinen wiegen, de stammen niet
    this.leafMat = this.mats.leaf.clone()
    this.#addSway(this.leafMat, 0.16)
    const crownMesh = new THREE.InstancedMesh(crown, this.leafMat, count)

    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const x = -110 + rand() * 220
      const z = SHORE_Z + 26 + rand() * 84
      dummy.position.set(x, GROUND_Y, z)
      dummy.rotation.y = rand() * Math.PI
      const s = 0.8 + rand() * 1.1
      dummy.scale.set(s, s * (0.85 + rand() * 0.45), s)
      dummy.updateMatrix()
      trunkMesh.setMatrixAt(i, dummy.matrix)
      crownMesh.setMatrixAt(i, dummy.matrix)
    }
    trunkMesh.instanceMatrix.needsUpdate = true
    crownMesh.instanceMatrix.needsUpdate = true
    this.treeCrowns = crownMesh
    this.group.add(trunkMesh, crownMesh)
  }

  /* ---------------- het oude sluiswachtershuis ---------------- */
  #buildLockHouse() {
    const g = new THREE.Group()
    g.position.set(19, GROUND_Y, 46)
    g.rotation.y = -0.34

    const body = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.6, 6), this.mats.brick)
    body.position.y = 2.3
    g.add(body)

    // zadeldak uit een driehoekige extrusie
    const roofShape = new THREE.Shape()
    roofShape.moveTo(-4.2, 0); roofShape.lineTo(0, 2.9); roofShape.lineTo(4.2, 0); roofShape.closePath()
    const roof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roofShape, { depth: 6.6, bevelEnabled: false }),
      this.mats.roof,
    )
    roof.position.set(0, 4.6, -3.3)
    g.add(roof)

    // schoorsteen
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), this.mats.brick)
    chimney.position.set(2.4, 6.2, 0)
    g.add(chimney)

    // verlichte ramen
    for (const [x, y, z, ry] of [[-1.8, 2.4, 3.05, 0], [1.8, 2.4, 3.05, 0], [3.8, 2.4, 0.6, Math.PI / 2], [0, 5.2, 3.05, 0]]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.5), this.mats.glow)
      win.position.set(x, y, z)
      win.rotation.y = ry
      g.add(win)
    }

    const lamp = new THREE.PointLight(PALETTE.lamp, 9, 26, 2)
    lamp.position.set(0, 3.4, 4.2)
    g.add(lamp)
    this.pointLights.push({ light: lamp, base: 9, flicker: 0.04 })

    this.lockHouse = g
    this.group.add(g)
  }

  /* ---------------- de kas ---------------- */
  #buildGreenhouse() {
    const g = new THREE.Group()
    g.position.set(-17, GROUND_Y, 43)
    g.rotation.y = 0.22

    const frame = []
    // stijlen
    for (const x of [-4.5, 4.5]) for (const z of [-3, 3]) {
      const p = new THREE.BoxGeometry(0.22, 3.6, 0.22); p.translate(x, 1.8, z); frame.push(p)
    }
    // liggers
    for (const z of [-3, 3]) {
      const b = new THREE.BoxGeometry(9.2, 0.2, 0.2); b.translate(0, 3.6, z); frame.push(b)
    }
    for (const x of [-4.5, 4.5]) {
      const b = new THREE.BoxGeometry(0.2, 0.2, 6.2); b.translate(x, 3.6, 0); frame.push(b)
    }
    // nokbalk
    const ridge = new THREE.BoxGeometry(9.2, 0.22, 0.22); ridge.translate(0, 5.3, 0); frame.push(ridge)
    // dakspanten, links en rechts van de nok
    for (const z of [-3, 0, 3]) {
      for (const s of [-1, 1]) {
        const rafter = new THREE.BoxGeometry(4.9, 0.16, 0.16)
        rafter.rotateZ(s * 0.34)
        rafter.translate(s * 2.3, 4.45, z)
        frame.push(rafter)
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(frame), this.mats.metal))

    // glas: wanden en dakschilden
    const glassParts = []
    for (const z of [-3, 3]) { const p = new THREE.PlaneGeometry(9, 3.6); p.translate(0, 1.8, z); glassParts.push(p) }
    for (const x of [-4.5, 4.5]) { const p = new THREE.PlaneGeometry(6, 3.6); p.rotateY(Math.PI / 2); p.translate(x, 1.8, 0); glassParts.push(p) }
    for (const s of [-1, 1]) {
      const p = new THREE.PlaneGeometry(4.9, 6.05)
      p.rotateX(-Math.PI / 2); p.rotateZ(0); p.rotateY(0)
      p.rotateZ(s * 0.34)
      p.translate(s * 2.3, 4.45, 0)
      glassParts.push(p)
    }
    const glass = new THREE.Mesh(mergeGeometries(glassParts), this.mats.glass)
    glass.renderOrder = 4
    g.add(glass)

    const inner = new THREE.PointLight(0xa8e6c8, 7, 22, 2)
    inner.position.set(0, 2.4, 0)
    g.add(inner)
    this.pointLights.push({ light: inner, base: 7, flicker: 0.03 })

    this.greenhouse = g
    this.group.add(g)
  }

  /* ---------------- stadsstrandje met parasols ---------------- */
  #buildBeach(rand) {
    const g = new THREE.Group()

    const sand = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 12), this.mats.sand)
    sand.position.set(-34, GROUND_Y - 0.1, SHORE_Z + 6)
    g.add(sand)

    const poleMat = this.mats.wood
    const parasolMats = [
      new THREE.MeshStandardMaterial({ color: PALETTE.pink, roughness: 0.9, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.9, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.9, side: THREE.DoubleSide }),
    ]

    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 5.2 + (rand() - 0.5) * 1.4
      const z = SHORE_Z + 3 + rand() * 8
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.9, 6), poleMat)
      pole.position.set(x, GROUND_Y + 1.45, z)
      g.add(pole)
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.7, 0.85, 8, 1, true),
        parasolMats[i % parasolMats.length],
      )
      canopy.position.set(x, GROUND_Y + 3.05, z)
      canopy.rotation.y = rand() * Math.PI
      g.add(canopy)
    }

    // picknicktafels
    for (let i = 0; i < 3; i++) {
      const x = -28 + i * 6
      const z = SHORE_Z + 13 + rand() * 3
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.1), poleMat)
      top.position.set(x, GROUND_Y + 0.78, z)
      const bench1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.11, 0.42), poleMat)
      bench1.position.set(x, GROUND_Y + 0.45, z - 0.85)
      const bench2 = bench1.clone(); bench2.position.z = z + 0.85
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.78, 1.9), poleMat)
      legs.position.set(x, GROUND_Y + 0.39, z)
      g.add(top, bench1, bench2, legs)
    }

    this.beach = g
    this.group.add(g)
  }

  /* ---------------- lantaarnpalen langs de kade ---------------- */
  #buildLampPosts() {
    const g = new THREE.Group()
    this.lampBulbs = []

    for (const x of [-46, -10, 30]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 5.2, 8), this.mats.metal)
      post.position.set(x, GROUND_Y + 2.6, SHORE_Z + 2.4)
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), this.mats.metal)
      arm.position.set(x - 0.5, GROUND_Y + 5.1, SHORE_Z + 2.4)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), this.mats.glow)
      bulb.position.set(x - 1, GROUND_Y + 5.0, SHORE_Z + 2.4)
      g.add(post, arm, bulb)
      this.lampBulbs.push(bulb)
    }

    // één echte lamp bij de camper, de rest is alleen gloed
    const light = new THREE.PointLight(PALETTE.lamp, 11, 30, 2)
    light.position.set(-10, GROUND_Y + 5, SHORE_Z + 2.4)
    g.add(light)
    this.pointLights.push({ light, base: 11, flicker: 0.02 })

    this.group.add(g)
  }

  /* ---------------- gedeelde wiegbeweging ---------------- */
  #addSway(material, amount) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime
      shader.uniforms.uSway = { value: amount }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSway;')
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `
            #include <begin_vertex>
            #ifdef USE_INSTANCING
              float swayPhase = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.45;
            #else
              float swayPhase = 0.0;
            #endif
            float swayAmt = sin(uTime * 1.25 + swayPhase) * 0.7
                          + sin(uTime * 2.7 + swayPhase * 1.9) * 0.3;
            transformed.x += swayAmt * uSway * max(transformed.y, 0.0) * 0.09;
            transformed.z += swayAmt * uSway * max(transformed.y, 0.0) * 0.05;
          `,
        )
    }
    material.needsUpdate = true
  }

  update(elapsed) {
    this.uniforms.uTime.value = elapsed

    // het bootje deint op de golven; Basiel deint mee
    if (this.rowboat) {
      const y = Math.sin(elapsed * 0.85) * 0.075 + Math.sin(elapsed * 1.7) * 0.025
      const roll = Math.sin(elapsed * 0.62) * 0.055
      this.rowboat.position.y = BOAT_POS[1] + y
      this.rowboat.rotation.z = roll
      this.rowboat.rotation.x = Math.sin(elapsed * 0.74) * 0.03
      this.boatMotion.y = y
      this.boatMotion.roll = roll
    }
    // lantaarns en ramen ademen heel licht
    for (const p of this.pointLights) {
      p.light.intensity = p.base * this.lampScale * (1 + Math.sin(elapsed * 2.1 + p.base) * p.flicker)
    }
  }

  /** Gras vergroent en de lampen doven bij zonsopgang. */
  apply(state) {
    const day = clamp((state.ambient - 0.3) / 0.6)
    this.mats.grass.color.setHex(PALETTE.grass).lerp(_day.setHex(PALETTE.grassDay), day)
    this.leafMat.color.setHex(0x27503c).lerp(_day.setHex(0x4e8a52), day)
    const lit = clamp(1 - day * 1.15)
    this.lampScale = lit
    this.mats.glow.emissiveIntensity = 1.0 * lit
    this.mats.glass.emissiveIntensity = 0.55 * lit + 0.1
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
    })
  }
}

const _day = new THREE.Color()
