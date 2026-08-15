import gsap from 'gsap'
import Experience from './world/Experience.js'
import { createScroll } from './ui/scroll.js'
import { initReveals, initChapters } from './ui/reveals.js'

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const canvas = document.getElementById('webgl')
const intro = document.getElementById('intro')
const introBtn = document.getElementById('intro-btn')
const introLoading = document.getElementById('intro-loading')
const motionBtn = document.getElementById('motion-toggle')

/* ---------------------------------------------------------------
   De wereld opbouwen
   --------------------------------------------------------------- */

let experience
try {
  experience = new Experience(canvas)
  // handvat om vanuit de console aan de wereld te draaien
  window.__phaedra = experience
} catch (err) {
  console.error('[phaedra-30] WebGL kon niet starten:', err)
  showFallback()
}

/* ---------------------------------------------------------------
   Scrollen
   --------------------------------------------------------------- */

const scroll = createScroll({ smooth: !prefersReduced })
scroll.onProgress((p) => experience?.setProgress(p))
scroll.stop() // pas vrijgeven als het cadeau open is

initReveals()
initChapters(scroll)

/* ---------------------------------------------------------------
   Beweging aan/uit
   --------------------------------------------------------------- */

let motionOn = !prefersReduced
applyMotion()

motionBtn?.addEventListener('click', () => {
  motionOn = !motionOn
  applyMotion()
})

function applyMotion() {
  experience?.setMotion(motionOn ? 1 : 0)
  motionBtn?.setAttribute('aria-pressed', String(!motionOn))
  document.body.classList.toggle('is-still', !motionOn)
}

/* ---------------------------------------------------------------
   Het cadeau openen
   --------------------------------------------------------------- */

let opened = false

async function prepare() {
  if (!experience) return
  // eerst één frame renderen: shaders compileren, texturen uploaden
  experience.renderOnce()
  try { await document.fonts.ready } catch { /* niet erg */ }
  // even ademruimte zodat de intro-animatie niet halverwege hapert
  await new Promise((r) => setTimeout(r, 220))
  introLoading?.classList.add('is-done')
  introBtn?.removeAttribute('disabled')
}

introBtn?.setAttribute('disabled', '')
prepare()

function open() {
  if (opened || !experience) return
  opened = true

  document.body.classList.remove('is-locked')
  document.body.classList.add('is-open')
  intro?.classList.add('is-gone')
  scroll.start()
  experience.start()
  // de pagina was tot nu toe niet scrollbaar; Lenis moet opnieuw meten
  requestAnimationFrame(() => scroll.refresh())

  if (prefersReduced) {
    experience.renderer.toneMappingExposure = 1.05
    return
  }

  // korte lichtflits alsof er iemand het licht aanknipt op de camping
  const r = experience.renderer
  gsap.fromTo(r,
    { toneMappingExposure: 0.0 },
    { toneMappingExposure: 2.1, duration: 0.5, ease: 'power2.out' },
  )
  gsap.to(r, { toneMappingExposure: 1.05, duration: 1.9, delay: 0.5, ease: 'power2.inOut' })

  if (experience.bloom) {
    gsap.fromTo(experience.bloom, { radius: 1.4 }, { radius: 0.55, duration: 2.2, ease: 'power2.out' })
  }
}

introBtn?.addEventListener('click', open)

// wie meteen begint te scrollen of op Enter drukt, hoeft niet te klikken
window.addEventListener('keydown', (e) => {
  if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open() }
})
window.addEventListener('wheel', () => { if (!opened && introBtn && !introBtn.hasAttribute('disabled')) open() }, { passive: true })

/* ---------------------------------------------------------------
   Als WebGL het niet doet
   --------------------------------------------------------------- */

function showFallback() {
  document.body.classList.remove('is-locked')
  document.body.classList.add('is-open', 'no-webgl')
  intro?.classList.add('is-gone')
  canvas?.remove()
}

/* ---------------------------------------------------------------
   Opruimen bij het verlaten van de pagina
   --------------------------------------------------------------- */

window.addEventListener('pagehide', () => {
  experience?.stop()
})
