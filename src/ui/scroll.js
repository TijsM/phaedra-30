import Lenis from 'lenis'
import { clamp } from '../utils/math.js'

/**
 * Eén scrollbron voor de hele pagina.
 *
 * Standaard met Lenis erbovenop, zodat de camerareis niet met het
 * schokkerige muiswiel meeschokt. Wie liever geen vloeiend scrollen heeft,
 * krijgt gewoon de scroll van de browser — de voortgang komt er hetzelfde uit.
 */
export function createScroll({ smooth = true } = {}) {
  const listeners = new Set()
  let progress = 0
  let lenis = null
  let raf = null

  const emit = () => {
    for (const fn of listeners) fn(progress)
  }

  const nativeProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    return max > 0 ? clamp(window.scrollY / max) : 0
  }

  if (smooth) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      wheelMultiplier: 0.9,
    })
    lenis.on('scroll', (e) => {
      progress = clamp(Number.isFinite(e.progress) ? e.progress : nativeProgress())
      emit()
    })
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  } else {
    const onScroll = () => { progress = nativeProgress(); emit() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    onScroll()
  }

  return {
    get progress() { return progress },
    onProgress(fn) { listeners.add(fn); fn(progress); return () => listeners.delete(fn) },
    scrollTo(target, opts = {}) {
      if (lenis) lenis.scrollTo(target, { duration: 1.5, ...opts })
      else if (typeof target === 'string') {
        document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
      }
    },
    /** Na het openen van het cadeau moet Lenis opnieuw meten. */
    refresh() {
      lenis?.resize()
      if (!lenis) { progress = nativeProgress(); emit() }
    },
    stop() { lenis?.stop() },
    start() { lenis?.start() },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      lenis?.destroy()
      listeners.clear()
    },
  }
}
