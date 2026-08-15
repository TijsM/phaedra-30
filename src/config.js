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

/** Waar de camper staat: vlak bij de kademuur, neus naar het water. */
export const CAMPER_POS = [-1.5, GROUND_Y, 27]

/** De ontbijttafel, een eindje naast de camper. */
export const TABLE_POS = [7.6, GROUND_Y, 26.4]

/** Het roeibootje dat verderop op het water ligt afgemeerd. */
export const BOAT_POS = [-6, 0.28, -49]

/**
 * De route van Basiel, de teckel.
 *
 * Hij is het hele verhaal in beeld: eerst voorop in het bootje op het
 * water (daar kijkt de camera in het begin naartoe), daarna op de kade
 * bij de camper, en 's ochtends naast de ontbijttafel.
 *
 * `sit` 0→1 = staan → zitten, `walk` 0→1 = stilstaan → trippelen.
 * Een sleutel met `cut: true` springt hard in plaats van te schuiven; dat
 * gebeurt op t≈0.21, als de camera nog van de kade weg kijkt.
 */
export const DOG_TRACK = [
  { t: 0.00, pos: [-6.0, 0.24, -48.4], rotY: 1.44, sit: 1, walk: 0, boat: true },
  { t: 0.18, pos: [-6.0, 0.24, -48.4], rotY: 1.30, sit: 1, walk: 0, boat: true },
  { t: 0.21, pos: [4.6, GROUND_Y, 22.6], rotY: -0.60, sit: 0, walk: 1, cut: true },
  { t: 0.34, pos: [2.6, GROUND_Y, 23.0], rotY: -0.85, sit: 0, walk: 1 },
  { t: 0.46, pos: [0.4, GROUND_Y, 23.4], rotY: -1.15, sit: 0, walk: 0.5 },
  { t: 0.56, pos: [0.2, GROUND_Y, 22.6], rotY: -1.20, sit: 0, walk: 0.7 },
  { t: 0.64, pos: [2.0, GROUND_Y, 21.8], rotY: 0.55, sit: 0, walk: 0 },    // driekwart, staand: zo zie je de teckel
  { t: 0.74, pos: [-4.2, GROUND_Y, 23.9], rotY: -2.10, sit: 1, walk: 0 },
  { t: 0.84, pos: [-0.6, GROUND_Y, 23.2], rotY: -0.70, sit: 0, walk: 1 },
  { t: 0.93, pos: [6.5, GROUND_Y, 25.5], rotY: -0.30, sit: 1, walk: 0 },   // hoopvol naast de tafel
  { t: 1.00, pos: [4.6, GROUND_Y, 23.4], rotY: -0.40, sit: 0, walk: 0.6 },
]

/**
 * De hemel over het verhaal heen: van diepe nacht naar ochtendlicht.
 * `t` is de scrollvoortgang (0 → 1).
 */
export const SKY_KEYS = [
  {
    t: 0.0,
    top: 0x01050f, mid: 0x061634, horizon: 0x0b2a5e,
    sun: 0xdfe8ff, sunSize: 5200, sunPower: 0.9,
    sunDir: [-0.34, 0.30, -0.90],
    waterDeep: 0x030b1e, waterShallow: 0x0a2350, waterSpec: 0xcfe0ff,
    fog: 0x081a3d, stars: 1.0, ambient: 0.28,
  },
  {
    t: 0.45,
    top: 0x02071a, mid: 0x081b40, horizon: 0x123a72,
    sun: 0xe6ecff, sunSize: 4600, sunPower: 1.0,
    sunDir: [-0.20, 0.24, -0.95],
    waterDeep: 0x04102a, waterShallow: 0x0d2c60, waterSpec: 0xdbe8ff,
    fog: 0x0a2049, stars: 0.95, ambient: 0.32,
  },
  {
    t: 0.68,
    top: 0x0a1740, mid: 0x2d2a63, horizon: 0x6e3a66,
    sun: 0xffb9a0, sunSize: 2600, sunPower: 1.3,
    sunDir: [0.10, 0.055, -0.99],
    waterDeep: 0x0a1636, waterShallow: 0x2c3a74, waterSpec: 0xffc9ae,
    fog: 0x2a2a5e, stars: 0.45, ambient: 0.42,
  },
  {
    t: 0.84,
    top: 0x1d3b86, mid: 0x8a5f92, horizon: 0xe8956f,
    sun: 0xffd08a, sunSize: 1500, sunPower: 1.9,
    sunDir: [0.16, 0.028, -0.986],
    waterDeep: 0x123056, waterShallow: 0x6a5f96, waterSpec: 0xffd9a2,
    fog: 0x8a6a86, stars: 0.08, ambient: 0.6,
  },
  {
    t: 1.0,
    top: 0x3f83c8, mid: 0x9fcae6, horizon: 0xfbe9cf,
    sun: 0xfff3d0, sunSize: 1300, sunPower: 2.2,
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
  // De hele reis speelt zich af bóven het water (z < 18), zodat de kade,
  // de camper en de stad steeds mét water in beeld komen. De standen zijn
  // krap gekozen: op een telefoon is het beeld smal.
  { t: 0.00, pos: [1, 4.6, -34], look: [-5, 11.0, -175] },    // op het water, de stad aan de horizon
  { t: 0.13, pos: [10, 4.4, -31], look: [-14, 8.5, -168] },   // zijwaarts drijven, het maanpad schuift mee
  { t: 0.28, pos: [22, 4.4, -8], look: [2, 4.0, 25] },        // draaien naar de kade
  { t: 0.42, pos: [11, 4.4, 12.5], look: [-1, 2.8, 27] },     // de camper, water op de voorgrond
  { t: 0.54, pos: [4.5, 4.15, 17.5], look: [-1.8, 2.45, 27] },// dichterbij: luifel uit, lichtjes aan
  { t: 0.64, pos: [3.6, 3.55, 14.2], look: [2.0, 1.95, 21.8] }, // Basiel groot in beeld
  { t: 0.74, pos: [-14, 4.8, 8], look: [5, 3.2, 38] },        // langs de kade: de kas en het sluiswachtershuis
  { t: 0.84, pos: [-6, 7.0, 4], look: [2, 8.0, -150] },       // omhoog en terug naar het water: zonsopgang
  { t: 0.93, pos: [9.6, 3.55, 21.0], look: [7.1, 2.20, 25.9] },// de ontbijttafel, met Basiel ernaast
  { t: 1.00, pos: [6, 21, 52], look: [0, 2, 8] },             // weg omhoog, alles in één beeld
]

/** Kwaliteitsniveaus — bepaald op basis van het apparaat. */
export const QUALITY = {
  high:   { water: 128, stars: 2600, fireflies: 340, bloom: true,  dpr: 2.0, shadows: false, confetti: 420 },
  medium: { water: 96, stars: 1700, fireflies: 200, bloom: true,  dpr: 1.6, shadows: false, confetti: 280 },
  low:    { water: 64,  stars: 900,  fireflies: 110, bloom: false, dpr: 1.25, shadows: false, confetti: 160 },
}
