/**
 * Alle knoppen van de wereld op één plek.
 * Kleuren komen uit de huisstijl van Stadscamping Overboord.
 */

export const PALETTE = {
  navy: 0x082274,
  navyDeep: 0x041338,
  abyss: 0x020b22,
  pink: 0xe38bb1,
  pinkSoft: 0xf0d0de,
  yellow: 0xedd43d,
  cream: 0xfbf2e8,
  grass: 0x2c5f4a,
  grassDay: 0x5f9e5c,
  stone: 0x2a3559,
  lamp: 0xffcf6b,
}

/** Hoogte van het maaiveld op de kade. */
export const GROUND_Y = 1.6

/** Waar de camper staat. */
export const CAMPER_POS = [-1.2, GROUND_Y, 33]

/**
 * De hemel over het verhaal heen: van diepe nacht naar ochtendlicht.
 * `t` is de scrollvoortgang (0 → 1).
 */
export const SKY_KEYS = [
  {
    t: 0.0,
    top: 0x01050f, mid: 0x061634, horizon: 0x0b2a5e,
    sun: 0xdfe8ff, sunSize: 900, sunPower: 0.9,
    sunDir: [-0.34, 0.30, -0.90],
    waterDeep: 0x030b1e, waterShallow: 0x0a2350, waterSpec: 0xcfe0ff,
    fog: 0x081a3d, stars: 1.0, ambient: 0.28,
  },
  {
    t: 0.45,
    top: 0x02071a, mid: 0x081b40, horizon: 0x123a72,
    sun: 0xe6ecff, sunSize: 780, sunPower: 1.0,
    sunDir: [-0.20, 0.24, -0.95],
    waterDeep: 0x04102a, waterShallow: 0x0d2c60, waterSpec: 0xdbe8ff,
    fog: 0x0a2049, stars: 0.95, ambient: 0.32,
  },
  {
    t: 0.68,
    top: 0x0a1740, mid: 0x2d2a63, horizon: 0x6e3a66,
    sun: 0xffb9a0, sunSize: 520, sunPower: 1.3,
    sunDir: [0.10, 0.055, -0.99],
    waterDeep: 0x0a1636, waterShallow: 0x2c3a74, waterSpec: 0xffc9ae,
    fog: 0x2a2a5e, stars: 0.45, ambient: 0.42,
  },
  {
    t: 0.84,
    top: 0x1d3b86, mid: 0x8a5f92, horizon: 0xe8956f,
    sun: 0xffd08a, sunSize: 300, sunPower: 1.9,
    sunDir: [0.16, 0.028, -0.986],
    waterDeep: 0x123056, waterShallow: 0x6a5f96, waterSpec: 0xffd9a2,
    fog: 0x8a6a86, stars: 0.08, ambient: 0.6,
  },
  {
    t: 1.0,
    top: 0x3f83c8, mid: 0x9fcae6, horizon: 0xfbe9cf,
    sun: 0xfff3d0, sunSize: 260, sunPower: 2.2,
    sunDir: [0.22, 0.20, -0.95],
    waterDeep: 0x1d5488, waterShallow: 0x74b6cf, waterSpec: 0xfff6dd,
    fog: 0xcfe2ee, stars: 0.0, ambient: 0.9,
  },
]

/**
 * De camerareis. Elke sleutel: op welk punt in de scroll de camera
 * waar staat en waar hij naar kijkt.
 */
export const CAMERA_TRACK = [
  { t: 0.00, pos: [0.5, 5.4, 44], look: [-1, 9.5, -170] },   // laag boven het water, blik op de stad
  { t: 0.14, pos: [10, 4.4, 38], look: [-14, 8, -150] },     // zijwaarts drijven, maanpad in beeld
  { t: 0.30, pos: [23, 5.2, 20], look: [1, 3.6, 33] },       // bocht naar de kade
  { t: 0.44, pos: [15.5, 3.6, 15], look: [-0.8, 2.9, 33] },  // de camper
  { t: 0.56, pos: [8.5, 3.0, 17], look: [-1.2, 2.6, 33.5] }, // dichterbij, luifel uit
  { t: 0.70, pos: [-13, 4.6, 18], look: [7, 3.2, 37] },      // langs de kade: sluiswachtershuis
  { t: 0.82, pos: [-5, 7.2, 27], look: [3, 7.5, -140] },     // omhoog, zonsopgang boven het water
  { t: 0.92, pos: [10.5, 3.1, 26.5], look: [8.2, 2.3, 32.5] },// de ontbijttafel
  { t: 1.00, pos: [2, 27, 74], look: [0, 1, 16] },            // weg omhoog, alles in beeld
]

/** Kwaliteitsniveaus — bepaald op basis van het apparaat. */
export const QUALITY = {
  high:   { water: 256, stars: 2600, fireflies: 340, bloom: true,  dpr: 2.0, shadows: false, confetti: 420 },
  medium: { water: 160, stars: 1700, fireflies: 200, bloom: true,  dpr: 1.6, shadows: false, confetti: 280 },
  low:    { water: 96,  stars: 900,  fireflies: 110, bloom: false, dpr: 1.25, shadows: false, confetti: 160 },
}
