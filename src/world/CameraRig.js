import * as THREE from 'three'
import { CAMERA_TRACK } from '../config.js'
import { sampleTrack, damp, clamp, smoothstep } from '../utils/math.js'

/**
 * Stuurt de camera langs de vaste reis uit config.js, met daar bovenop
 * een beetje eigen leven: hij dobbert licht en volgt de muis een tikje.
 */
export default class CameraRig {
  constructor(camera) {
    this.camera = camera
    this.pos = new THREE.Vector3()
    this.look = new THREE.Vector3()
    this.smoothPos = new THREE.Vector3()
    this.smoothLook = new THREE.Vector3()
    this.pointer = new THREE.Vector2()
    this.pointerTarget = new THREE.Vector2()
    this.motion = 1
    this.first = true
    this.backOff = 0
    this.backOffMax = 10

    sampleTrack(CAMERA_TRACK, 'pos', 0, this.smoothPos)
    sampleTrack(CAMERA_TRACK, 'look', 0, this.smoothLook)
  }

  setPointer(nx, ny) {
    this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1))
  }

  /** 0 = alles stil (voor wie liever geen beweging heeft), 1 = normaal. */
  setMotion(v) { this.motion = clamp(v) }

  /**
   * Hoeveel de camera een stap terug doet.
   *
   * Op een smal scherm is het horizontale blikveld nu eenmaal klein: een
   * camper van vijf meter past er op tien meter afstand gewoon niet in.
   * De FOV opschroeven maakt alles klein; een stap achteruit houdt het
   * onderwerp groot én compleet in beeld.
   *
   * @param {number} factor deel van de kijkafstand, 0 = niets doen
   * @param {number} max    hoeveel meter maximaal
   */
  setBackOff(factor, max = 10) {
    this.backOff = factor
    this.backOffMax = max
  }

  update(t, elapsed, dt) {
    sampleTrack(CAMERA_TRACK, 'pos', t, this.pos)
    sampleTrack(CAMERA_TRACK, 'look', t, this.look)

    // stap terug op smalle schermen — alleen bij beelden met een onderwerp
    // dichtbij; een vergezicht over het water heeft het niet nodig
    if (this.backOff > 0) {
      const away = _away.copy(this.pos).sub(this.look)
      const dist = away.length()
      if (dist > 0.01) {
        const nearby = 1 - smoothstep(30, 48, dist)
        const extra = Math.min(dist * this.backOff, this.backOffMax) * nearby
        this.pos.addScaledVector(away.divideScalar(dist), extra)
      }
    }

    const m = this.motion

    // dobberen — alsof de camera zelf op het water ligt
    this.pos.x += Math.sin(elapsed * 0.31) * 0.42 * m
    this.pos.y += Math.sin(elapsed * 0.47 + 1.3) * 0.26 * m
    this.pos.z += Math.cos(elapsed * 0.26) * 0.34 * m

    // muisparallax: subtiel, anders wordt het zeeziek
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 3.2, dt)
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 3.2, dt)
    this.pos.x += this.pointer.x * 1.5 * m
    this.pos.y += -this.pointer.y * 0.9 * m
    this.look.x += this.pointer.x * 0.8 * m
    this.look.y += -this.pointer.y * 0.5 * m

    // naijlen zodat schokkerig scrollen niet doorwerkt in het beeld
    if (this.first) {
      this.smoothPos.copy(this.pos)
      this.smoothLook.copy(this.look)
      this.first = false
    } else {
      const k = 1 - Math.exp(-7 * dt)
      this.smoothPos.lerp(this.pos, k)
      this.smoothLook.lerp(this.look, k)
    }

    this.camera.position.copy(this.smoothPos)
    this.camera.lookAt(this.smoothLook)

    // heel lichte rolbeweging voor het gevoel van deining
    this.camera.rotation.z += Math.sin(elapsed * 0.37) * 0.006 * m
  }
}

const _away = new THREE.Vector3()
