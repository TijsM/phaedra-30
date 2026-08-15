import * as THREE from 'three'
import { SKY_KEYS, QUALITY } from '../config.js'
import { sampleColor, sampleNumber, sampleVec3, smoothstep, remap, clamp, lerp } from '../utils/math.js'

import Sky from './Sky.js'
import Stars from './Stars.js'
import Water from './Water.js'
import Skyline from './Skyline.js'
import Quay from './Quay.js'
import Camper from './Camper.js'
import Breakfast from './Breakfast.js'
import Fireflies from './Fireflies.js'
import Confetti from './Confetti.js'
import CameraRig from './CameraRig.js'

/**
 * De regisseur. Houdt de hele wereld bij elkaar en vertaalt één getal —
 * de scrollvoortgang — naar licht, kleur, camerastand en wat er gebeurt.
 */
export default class Director {
  constructor(scene, camera, qualityName) {
    this.scene = scene
    this.camera = camera
    this.quality = QUALITY[qualityName]
    this.qualityName = qualityName
    this.t = 0

    // de gemengde hemelsleutel voor dit moment in het verhaal
    this.state = {
      top: new THREE.Color(), mid: new THREE.Color(), horizon: new THREE.Color(),
      sun: new THREE.Color(), sunDir: new THREE.Vector3(),
      waterDeep: new THREE.Color(), waterShallow: new THREE.Color(),
      waterSpec: new THREE.Color(), fog: new THREE.Color(),
      sunSize: 900, sunPower: 1, stars: 1, ambient: 0.3,
    }

    /* ---------- licht ---------- */
    this.hemi = new THREE.HemisphereLight(0x9fc4ff, 0x16351f, 0.5)
    this.scene.add(this.hemi)

    this.key = new THREE.DirectionalLight(0xdfe8ff, 1.1)
    this.key.position.set(-40, 40, -120)
    this.scene.add(this.key)

    // zwak tegenlicht zodat silhouetten niet dichtslibben
    this.fill = new THREE.DirectionalLight(0x2a4a8f, 0.35)
    this.fill.position.set(60, 20, 60)
    this.scene.add(this.fill)

    this.ambient = new THREE.AmbientLight(0x24407a, 0.5)
    this.scene.add(this.ambient)

    this.scene.fog = new THREE.Fog(0x081a3d, 70, 520)

    /* ---------- de wereld ---------- */
    this.sky = new Sky()
    this.stars = new Stars(this.quality.stars)
    this.water = new Water({ segments: this.quality.water })
    this.skyline = new Skyline()
    this.quay = new Quay({ quality: this.qualityName })
    this.camper = new Camper()
    this.breakfast = new Breakfast()
    this.fireflies = new Fireflies(this.quality.fireflies)
    this.confetti = new Confetti(this.quality.confetti)

    this.scene.add(
      this.sky.mesh,
      this.stars.points,
      this.water.mesh,
      this.skyline.group,
      this.quay.group,
      this.camper.group,
      this.breakfast.group,
      this.fireflies.points,
      this.confetti.mesh,
    )

    this.rig = new CameraRig(camera)

    this.bloomStrength = 0.9
    this.applyState(0)
  }

  setPixelRatio(dpr) {
    this.stars.setPixelRatio(dpr)
    this.camper.setPixelRatio(dpr)
    this.breakfast.setPixelRatio(dpr)
    this.fireflies.setPixelRatio(dpr)
  }

  /** Mengt de hemelsleutels en zet alles wat van kleur/licht afhangt. */
  applyState(t) {
    const s = this.state
    sampleColor(SKY_KEYS, 'top', t, s.top)
    sampleColor(SKY_KEYS, 'mid', t, s.mid)
    sampleColor(SKY_KEYS, 'horizon', t, s.horizon)
    sampleColor(SKY_KEYS, 'sun', t, s.sun)
    sampleColor(SKY_KEYS, 'waterDeep', t, s.waterDeep)
    sampleColor(SKY_KEYS, 'waterShallow', t, s.waterShallow)
    sampleColor(SKY_KEYS, 'waterSpec', t, s.waterSpec)
    sampleColor(SKY_KEYS, 'fog', t, s.fog)
    sampleVec3(SKY_KEYS, 'sunDir', t, s.sunDir)
    s.sunSize = sampleNumber(SKY_KEYS, 'sunSize', t)
    s.sunPower = sampleNumber(SKY_KEYS, 'sunPower', t)
    s.stars = sampleNumber(SKY_KEYS, 'stars', t)
    s.ambient = sampleNumber(SKY_KEYS, 'ambient', t)

    this.sky.apply(s)
    this.water.apply(s)
    this.skyline.apply(s)
    this.quay.apply(s)
    this.camper.apply(s)

    this.stars.setOpacity(s.stars)

    // de zon/maan als richtinglicht
    this.key.position.copy(s.sunDir).multiplyScalar(220)
    this.key.color.copy(s.sun)
    this.key.intensity = lerp(0.7, 2.6, smoothstep(0.68, 1.0, t))

    const day = clamp((s.ambient - 0.28) / 0.62)
    this.hemi.intensity = lerp(0.45, 1.5, day)
    this.hemi.color.copy(s.horizon).lerp(_white, 0.35)
    this.hemi.groundColor.setHex(0x16351f).lerp(_grass, day)

    this.ambient.color.copy(s.mid)
    this.ambient.intensity = lerp(0.55, 1.1, day)
    this.fill.intensity = lerp(0.35, 0.6, day)

    this.scene.fog.color.copy(s.fog)
    this.scene.fog.near = lerp(70, 110, day)
    this.scene.fog.far = lerp(500, 700, day)

    // bloom is 's nachts het mooist; overdag zou het uitspoelen
    this.bloomStrength = lerp(1.05, 0.32, day)
  }

  /**
   * @param {number} t   scrollvoortgang 0 → 1
   * @param {number} elapsed  seconden sinds start
   * @param {number} dt  seconden sinds vorige frame
   */
  update(t, elapsed, dt) {
    this.t = t
    this.applyState(t)

    // ---- wat er wanneer gebeurt ----
    // de camper richt zich op terwijl we naderen
    this.camper.setReveal(smoothstep(0.20, 0.54, t))
    // het ontbijt verschijnt met de zon
    this.breakfast.setReveal(smoothstep(0.79, 0.95, t))
    // vuurvliegjes: op als we bij het kamp zijn, weg bij zonsopgang
    this.fireflies.setOpacity(smoothstep(0.16, 0.34, t) * (1 - smoothstep(0.72, 0.88, t)))
    // confetti over de laatste tien procent
    this.confetti.setProgress(remap(t, 0.90, 1.0, 0, 1))

    // ---- alles laten leven ----
    this.sky.update(elapsed)
    this.stars.update(elapsed)
    this.water.update(elapsed)
    this.skyline.update(elapsed)
    this.quay.update(elapsed)
    this.camper.update(elapsed, dt)
    this.breakfast.update(elapsed)
    this.fireflies.update(elapsed)
    this.confetti.update(elapsed)

    this.rig.update(t, elapsed, dt)
  }

  dispose() {
    for (const part of [this.sky, this.stars, this.water, this.skyline,
      this.quay, this.camper, this.breakfast, this.fireflies, this.confetti]) {
      part.dispose?.()
    }
  }
}

const _white = new THREE.Color(0xffffff)
const _grass = new THREE.Color(0x4e7a4a)
