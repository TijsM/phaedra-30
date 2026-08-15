import * as THREE from 'three'

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t

/** 0→1 met zachte in- en uitloop */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Framerate-onafhankelijk naderen van een doelwaarde. */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

/** Kaart een waarde van het ene bereik naar het andere, geknipt. */
export const remap = (v, inMin, inMax, outMin, outMax) =>
  lerp(outMin, outMax, clamp((v - inMin) / (inMax - inMin)))

/** Catmull-Rom over vier scalars. */
function crScalar(p0, p1, p2, p3, u) {
  const u2 = u * u
  const u3 = u2 * u
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u3
  )
}

/**
 * Zoekt het segment waarin `t` valt en geeft {i, u} terug:
 * i = index van het beginframe, u = lokale voortgang 0→1.
 */
export function segmentAt(keys, t) {
  const last = keys.length - 1
  if (t <= keys[0].t) return { i: 0, u: 0 }
  if (t >= keys[last].t) return { i: last - 1, u: 1 }
  let i = 0
  while (i < last - 1 && t > keys[i + 1].t) i++
  const span = keys[i + 1].t - keys[i].t
  return { i, u: span > 1e-6 ? (t - keys[i].t) / span : 0 }
}

/**
 * Vloeiende (C1-continue) interpolatie van een baan met [x,y,z]-sleutels.
 * Gebruikt Catmull-Rom zodat de camera niet bij elk keyframe stilvalt.
 */
export function sampleTrack(keys, prop, t, out = new THREE.Vector3()) {
  const { i, u } = segmentAt(keys, t)
  const last = keys.length - 1
  const p1 = keys[i][prop]
  const p2 = keys[Math.min(i + 1, last)][prop]
  const p0 = keys[Math.max(i - 1, 0)][prop]
  const p3 = keys[Math.min(i + 2, last)][prop]
  return out.set(
    crScalar(p0[0], p1[0], p2[0], p3[0], u),
    crScalar(p0[1], p1[1], p2[1], p3[1], u),
    crScalar(p0[2], p1[2], p2[2], p3[2], u),
  )
}

/** Lineaire interpolatie tussen kleursleutels (hex-getallen). */
export function sampleColor(keys, prop, t, out = new THREE.Color()) {
  const { i, u } = segmentAt(keys, t)
  const last = keys.length - 1
  _ca.setHex(keys[i][prop])
  _cb.setHex(keys[Math.min(i + 1, last)][prop])
  return out.copy(_ca).lerp(_cb, u)
}

/** Idem voor gewone getallen. */
export function sampleNumber(keys, prop, t) {
  const { i, u } = segmentAt(keys, t)
  const last = keys.length - 1
  return lerp(keys[i][prop], keys[Math.min(i + 1, last)][prop], u)
}

/** Idem voor [x,y,z]-vectoren, lineair (voor lichtrichtingen). */
export function sampleVec3(keys, prop, t, out = new THREE.Vector3()) {
  const { i, u } = segmentAt(keys, t)
  const last = keys.length - 1
  const a = keys[i][prop]
  const b = keys[Math.min(i + 1, last)][prop]
  return out.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)).normalize()
}

const _ca = new THREE.Color()
const _cb = new THREE.Color()

/** Deterministische pseudo-random — zelfde wereld bij elke laadbeurt. */
export function makeRandom(seed = 1337) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
