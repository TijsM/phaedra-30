import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import Director from './Director.js'
import { QUALITY } from '../config.js'
import { clamp } from '../utils/math.js'

/** Kiest een kwaliteitsniveau op basis van het apparaat (of ?q= in de URL). */
function detectQuality() {
  const forced = new URLSearchParams(location.search).get('q')
  if (forced && QUALITY[forced]) return forced

  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const w = Math.min(window.innerWidth, window.innerHeight)
  const coarse = window.matchMedia('(pointer: coarse)').matches

  if (coarse && (w < 420 || cores <= 4 || mem <= 3)) return 'low'
  if (coarse || cores <= 4 || mem <= 4 || w < 700) return 'medium'
  return 'high'
}

/**
 * De motor: renderer, compositor, klok en het formaat van het venster.
 * Alles wat inhoudelijk is, zit in Director.
 */
export default class Experience {
  constructor(canvas) {
    this.canvas = canvas
    this.qualityName = detectQuality()
    this.quality = QUALITY[this.qualityName]

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.qualityName === 'high',
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    })
    this.renderer.setClearColor(0x020b22, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1600)

    this.director = new Director(this.scene, this.camera, this.qualityName)

    /* ---- compositor ---- */
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: this.qualityName === 'high' ? 4 : 0,
    }))
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (this.quality.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.55, 0.62)
      this.composer.addPass(this.bloom)
    }
    this.composer.addPass(new OutputPass())

    /* ---- klok & lus ---- */
    this.clock = new THREE.Clock()
    this.elapsed = 0
    this.progress = 0
    this.running = false
    this.motion = 1

    this._frames = 0
    this._fpsAccum = 0
    this._dprScale = 1

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize, { passive: true })
    window.addEventListener('orientationchange', this._onResize, { passive: true })

    this._onPointer = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      this.director.rig.setPointer(nx, ny)
    }
    window.addEventListener('pointermove', this._onPointer, { passive: true })

    // niet renderen als het tabblad op de achtergrond staat
    this._onVisibility = () => {
      if (document.hidden) this.clock.stop()
      else { this.clock.start(); this.clock.getDelta() }
    }
    document.addEventListener('visibilitychange', this._onVisibility)

    this._tick = this._tick.bind(this)
  }

  get dpr() {
    return Math.min(window.devicePixelRatio || 1, this.quality.dpr) * this._dprScale
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = this.dpr

    this.camera.aspect = w / h
    // op een smal scherm iets ruimer kaderen, anders zie je alleen camper
    this.camera.fov = w / h < 0.85 ? 62 : 48
    this.camera.updateProjectionMatrix()

    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(w, h)
    this.director.setPixelRatio(dpr)
  }

  /** Scrollvoortgang 0 → 1, aangeleverd door de pagina. */
  setProgress(p) { this.progress = clamp(p) }

  /** 0 = zoveel mogelijk stilzetten. */
  setMotion(v) {
    this.motion = clamp(v)
    this.director.rig.setMotion(this.motion)
  }

  start() {
    if (this.running) return
    this.running = true
    this.clock.start()
    this._raf = requestAnimationFrame(this._tick)
  }

  stop() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  /** Eén frame renderen zonder de lus te starten (voor de intro). */
  renderOnce() {
    this.director.update(this.progress, 0, 1 / 60)
    this.composer.render()
  }

  _tick() {
    if (!this.running) return
    this._raf = requestAnimationFrame(this._tick)

    const dt = Math.min(this.clock.getDelta(), 0.1)
    // met beweging uit tikt de klok trager door, maar staat niets abrupt stil
    this.elapsed += dt * (0.15 + this.motion * 0.85)

    this.director.update(this.progress, this.elapsed, dt)

    if (this.bloom) this.bloom.strength = this.director.bloomStrength
    this.composer.render()

    this._watchPerformance(dt)
  }

  /** Zakt het beeld te ver weg, dan gaat de resolutie stilletjes omlaag. */
  _watchPerformance(dt) {
    this._fpsAccum += dt
    this._frames++
    if (this._fpsAccum < 2) return

    const fps = this._frames / this._fpsAccum
    this._frames = 0
    this._fpsAccum = 0

    if (fps < 34 && this._dprScale > 0.62) {
      this._dprScale = Math.max(0.62, this._dprScale - 0.18)
      this.resize()
    } else if (fps < 24 && this.bloom) {
      // laatste redmiddel: de gloed eruit
      this.composer.removePass(this.bloom)
      this.bloom.dispose()
      this.bloom = null
    }
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
    window.removeEventListener('orientationchange', this._onResize)
    window.removeEventListener('pointermove', this._onPointer)
    document.removeEventListener('visibilitychange', this._onVisibility)
    this.director.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
