import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { PALETTE, DOG_TRACK } from '../config.js'
import { segmentAt, smoothstep, lerp, clamp } from '../utils/math.js'

/**
 * Basiel, de teckel.
 *
 * Lang, laag en met flaporen. Hij loopt het hele verhaal mee: eerst voorop
 * in het bootje op het water, daarna over de kade bij de camper en 's
 * ochtends naast de ontbijttafel. Zijn plek en houding komen uit DOG_TRACK
 * en worden — net als alles hier — door de scroll aangestuurd.
 *
 * Het model kijkt in eigen assenstelsel langs de +X-as.
 */
export default class Dog {
  constructor() {
    this.group = new THREE.Group()
    this.sit = 0
    this.walk = 0
    this.inBoat = true

    const coat = new THREE.MeshStandardMaterial({ color: 0xa35c2c, roughness: 0.8 })
    const tan = new THREE.MeshStandardMaterial({ color: 0xd9a05c, roughness: 0.85 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x140d08, roughness: 0.5 })
    const collar = new THREE.MeshStandardMaterial({
      color: PALETTE.yellow, roughness: 0.55, emissive: PALETTE.yellow, emissiveIntensity: 0.25,
    })
    this.mats = { coat, tan, dark, collar }

    // alles hangt onder één romp-groep, zodat zitten één rotatie is
    this.rig = new THREE.Group()
    this.rig.position.y = 0.26
    this.group.add(this.rig)

    // ---- romp ----
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.25, 0.23, 3, 0.105), coat)
    this.rig.add(body)

    const chest = new THREE.Mesh(new RoundedBoxGeometry(0.30, 0.29, 0.26, 3, 0.12), coat)
    chest.position.set(0.33, 0.015, 0)
    this.rig.add(chest)

    const neck = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.19, 0.18, 2, 0.08), coat)
    neck.position.set(0.50, 0.08, 0)
    neck.rotation.z = 0.28
    this.rig.add(neck)

    // ---- kop ----
    this.head = new THREE.Group()
    this.head.position.set(0.63, 0.17, 0)
    this.rig.add(this.head)

    const skull = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.18, 0.17, 2, 0.075), coat)
    this.head.add(skull)

    const snout = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.085, 0.088, 2, 0.04), tan)
    snout.position.set(0.20, -0.04, 0)
    this.head.add(snout)

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 6), dark)
    nose.position.set(0.325, -0.028, 0)
    this.head.add(nose)

    for (const z of [-0.062, 0.062]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 8, 6), dark)
      eye.position.set(0.095, 0.038, z)
      this.head.add(eye)
    }

    // flaporen: hangen naar beneden en wiebelen mee
    this.ears = []
    for (const z of [-1, 1]) {
      const ear = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.27, 0.042, 2, 0.021), coat)
      ear.position.set(-0.005, -0.10, z * 0.092)
      ear.rotation.x = z * 0.16
      ear.rotation.z = -0.12
      this.head.add(ear)
      this.ears.push({ mesh: ear, side: z, baseX: ear.rotation.x })
    }

    // ---- pootjes: kort, dat is het hele punt van een teckel ----
    this.legs = []
    const legGeo = new THREE.CylinderGeometry(0.036, 0.030, 0.15, 6)
    legGeo.translate(0, -0.075, 0) // draaipunt bovenaan, bij de schouder
    const pawGeo = new THREE.SphereGeometry(0.040, 7, 5)

    let i = 0
    for (const x of [0.33, -0.33]) {
      for (const z of [-0.085, 0.085]) {
        const leg = new THREE.Group()
        leg.position.set(x, -0.11, z)
        leg.add(new THREE.Mesh(legGeo, coat))
        const paw = new THREE.Mesh(pawGeo, tan)
        paw.position.y = -0.15
        paw.scale.set(1.1, 0.75, 1.2)
        leg.add(paw)
        this.rig.add(leg)
        // voor- en achterpoten lopen in tegenfase, links en rechts ook
        this.legs.push({ group: leg, front: x > 0, phase: (i % 2) * Math.PI + (x > 0 ? 0 : Math.PI) })
        i++
      }
    }

    // ---- staart ----
    this.tail = new THREE.Group()
    this.tail.position.set(-0.47, 0.06, 0)
    const tailGeo = new THREE.CylinderGeometry(0.030, 0.013, 0.30, 6)
    tailGeo.translate(0, 0.15, 0)
    const tailMesh = new THREE.Mesh(tailGeo, coat)
    tailMesh.rotation.z = 1.15 // schuin omhoog naar achteren
    this.tail.add(tailMesh)
    this.rig.add(this.tail)

    // ---- halsbandje in het geel van de camping ----
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.016, 6, 14), collar)
    band.position.set(0.48, 0.07, 0)
    band.rotation.y = Math.PI / 2
    band.rotation.x = 0.28
    this.rig.add(band)

    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.010, 8), collar)
    tag.position.set(0.50, -0.025, 0)
    tag.rotation.x = Math.PI / 2
    this.rig.add(tag)

    // ruim boven levensgroot: hij moet ook op een telefoonscherm
    // herkenbaar een teckel zijn
    this.group.scale.setScalar(1.45)
  }

  /**
   * Zet Basiel neer op het punt in het verhaal.
   * @param {number} t scrollvoortgang
   */
  place(t) {
    const { i, u } = segmentAt(DOG_TRACK, t)
    const a = DOG_TRACK[i]
    const b = DOG_TRACK[Math.min(i + 1, DOG_TRACK.length - 1)]

    // een sleutel met `cut` springt hard — dat gebeurt op een moment dat de
    // camera de andere kant op kijkt, dus je ziet hem niet zweven
    if (b.cut) {
      const snap = u > 0.5 ? b : a
      this.group.position.fromArray(snap.pos)
      this.group.rotation.y = snap.rotY
      this.sit = snap.sit
      this.walk = snap.walk
      this.inBoat = !!snap.boat
      return
    }

    const k = smoothstep(0, 1, u)
    this.group.position.set(
      lerp(a.pos[0], b.pos[0], k),
      lerp(a.pos[1], b.pos[1], k),
      lerp(a.pos[2], b.pos[2], k),
    )
    // via de korte kant draaien
    let d = b.rotY - a.rotY
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    this.group.rotation.y = a.rotY + d * k
    this.sit = lerp(a.sit, b.sit, k)
    this.walk = lerp(a.walk, b.walk, k)
    this.inBoat = !!(u > 0.5 ? b.boat : a.boat)
  }

  /**
   * @param {number} elapsed seconden
   * @param {{y:number, roll:number}} carrier deining van het bootje, als hij erin zit
   */
  update(elapsed, carrier) {
    const sit = clamp(this.sit)
    const walk = clamp(this.walk)

    // zitten: kont omlaag, kop omhoog
    this.rig.rotation.z = sit * 0.42
    this.rig.position.y = 0.26 - sit * 0.07

    // ademen
    const breathe = 1 + Math.sin(elapsed * 2.4) * 0.02
    this.rig.scale.set(1, breathe, breathe)

    // pootjes
    for (const l of this.legs) {
      const swing = Math.sin(elapsed * 7.5 + l.phase) * 0.55 * walk
      // achterpoten klappen in bij het zitten
      const fold = l.front ? 0 : sit * 1.15
      l.group.rotation.z = swing + fold
      l.group.scale.y = 1 - fold * 0.32
    }
    // lichte cadans in de romp tijdens het lopen
    this.rig.position.y += Math.abs(Math.sin(elapsed * 7.5)) * 0.022 * walk

    // kwispelen — sneller zodra hij stilstaat en oplet
    const wagSpeed = 6.5 + (1 - walk) * 3.5
    this.tail.rotation.y = Math.sin(elapsed * wagSpeed) * (0.35 + sit * 0.35)
    this.tail.rotation.x = Math.sin(elapsed * wagSpeed * 0.5) * 0.12

    // kop: rondkijken, en de oren wiebelen mee
    const look = Math.sin(elapsed * 0.42) * 0.34 + Math.sin(elapsed * 0.17) * 0.16
    this.head.rotation.y = look
    this.head.rotation.z = Math.sin(elapsed * 1.6) * 0.05 - sit * 0.12
    for (const e of this.ears) {
      e.mesh.rotation.x = e.baseX + Math.sin(elapsed * 5.2 + e.side) * 0.11 * (0.35 + walk)
      e.mesh.rotation.z = -0.12 - look * 0.18 * e.side
    }

    // meedeinen met het bootje
    if (this.inBoat && carrier) {
      this.group.position.y += carrier.y
      this.group.rotation.z = carrier.roll
    } else {
      this.group.rotation.z = 0
    }
  }

  dispose() {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose() })
    for (const m of Object.values(this.mats)) m.dispose()
  }
}
