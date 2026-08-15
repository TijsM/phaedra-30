import * as THREE from 'three'
import { makeRandom, clamp } from '../utils/math.js'

const CITY_Z = -186
const DEPTH = 14

/** Vereenvoudigd silhouet van de Sint-Janskathedraal. */
function cathedralShape() {
  const s = new THREE.Shape()
  const pts = [
    [0, 0], [0, 21], [2, 21], [2, 24], [3, 24], [4.5, 31], [6, 24], [7, 24], [7, 21], [9, 21],
    [9, 13], [13, 13], [14, 17.5], [21, 17.5], [22, 13], [26, 13],
    [26, 25], [27.5, 25], [27.5, 27], [28.5, 27], [30, 44], [31.5, 27], [32.5, 27], [32.5, 25], [34, 25],
    [34, 12], [37, 12], [38, 15.5], [43, 15.5], [44, 12], [47, 12], [47, 0],
  ]
  s.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1])
  s.closePath()
  return s
}

/** Bosch grachtenpand: rechte gevel met trap-, punt- of klokgevel. */
function houseShape(w, h, kind, rand) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(0, h)

  if (kind === 0) {
    // trapgevel
    const steps = 3 + Math.floor(rand() * 3)
    const sw = w / (steps * 2)
    const sh = (w * 0.42) / steps
    for (let i = 0; i < steps; i++) {
      s.lineTo(sw * (i + 1), h + sh * i)
      s.lineTo(sw * (i + 1), h + sh * (i + 1))
    }
    s.lineTo(w / 2, h + sh * steps + 0.7)
    for (let i = steps - 1; i >= 0; i--) {
      s.lineTo(w - sw * (i + 1), h + sh * (i + 1))
      s.lineTo(w - sw * (i + 1), h + sh * i)
    }
  } else if (kind === 1) {
    // puntgevel
    s.lineTo(w / 2, h + w * 0.55)
  } else {
    // halsgevel met schouders
    s.lineTo(w * 0.18, h)
    s.lineTo(w * 0.18, h + w * 0.2)
    s.lineTo(w * 0.34, h + w * 0.34)
    s.lineTo(w * 0.5, h + w * 0.38)
    s.lineTo(w * 0.66, h + w * 0.34)
    s.lineTo(w * 0.82, h + w * 0.2)
    s.lineTo(w * 0.82, h)
  }

  s.lineTo(w, h)
  s.lineTo(w, 0)
  s.closePath()
  return s
}

export default class Skyline {
  constructor() {
    this.group = new THREE.Group()
    const rand = makeRandom(4242)

    this.material = new THREE.MeshBasicMaterial({ color: 0x050f2e, fog: true })

    const shapes = []
    const lights = [] // [x, y, z] van elk verlicht raam

    // ---- de kathedraal, iets links van het midden ----
    {
      const geo = new THREE.ExtrudeGeometry(cathedralShape(), { depth: DEPTH * 1.5, bevelEnabled: false })
      geo.translate(-52, 0, CITY_Z - DEPTH * 0.75)
      shapes.push(geo)
      // een handvol brandende ramen in de toren
      for (let i = 0; i < 7; i++) {
        lights.push([-52 + 26 + rand() * 6, 14 + rand() * 12, CITY_Z + DEPTH * 0.75 + 0.15])
      }
    }

    // ---- rijen panden links en rechts ----
    let x = -240
    while (x < 250) {
      const w = 6 + rand() * 11
      if (x > -60 && x < -2) { x += w + 1.5; continue } // ruimte voor de kathedraal

      const h = 8 + rand() * 20
      const kind = Math.floor(rand() * 3)
      const z = CITY_Z + (rand() - 0.5) * 22

      const geo = new THREE.ExtrudeGeometry(houseShape(w, h, kind, rand), { depth: DEPTH, bevelEnabled: false })
      geo.translate(x, 0, z - DEPTH / 2)
      shapes.push(geo)

      // ramen: een raster over de gevel, willekeurig aan of uit
      const cols = Math.max(1, Math.round(w / 3.1))
      const rows = Math.max(1, Math.round(h / 3.4))
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() > 0.42) continue
          lights.push([
            x + (w / cols) * (c + 0.5),
            2.2 + (h / rows) * (r + 0.45),
            z + DEPTH / 2 + 0.15,
          ])
        }
      }
      x += w + 0.4 + rand() * 2.4
    }

    // ---- een enkele havenkraan voor wat industrie ----
    shapes.push(this.#crane(38, CITY_Z + 6))

    const merged = mergeGeometries(shapes)
    this.mesh = new THREE.Mesh(merged, this.material)
    this.mesh.renderOrder = 0
    this.group.add(this.mesh)

    // ---- de brandende ramen ----
    this.lights = this.#buildWindows(lights)
    this.group.add(this.lights)

    // ---- diezelfde ramen, uitgesmeerd in het water ----
    this.reflection = this.#buildReflection(lights)
    this.group.add(this.reflection)

    this.dayColor = new THREE.Color(0x8fb4d6)
    this.nightColor = new THREE.Color(0x050f2e)
  }

  /** Simpele havenkraan uit balkjes. */
  #crane(x, z) {
    const parts = []
    const mast = new THREE.BoxGeometry(1.1, 26, 1.1); mast.translate(x, 13, z)
    const jib = new THREE.BoxGeometry(24, 0.9, 0.9); jib.translate(x + 8, 25, z)
    const back = new THREE.BoxGeometry(7, 0.8, 0.8); back.translate(x - 5, 22.5, z)
    const cab = new THREE.BoxGeometry(2.4, 2, 2); cab.translate(x, 21, z)
    parts.push(mast, jib, back, cab)
    return mergeGeometries(parts)
  }

  /** Kleine gloeiende vlakjes op de gevels. */
  #buildWindows(lights) {
    const count = lights.length
    const positions = new Float32Array(count * 4 * 3)
    const uvs = new Float32Array(count * 4 * 2)
    const seeds = new Float32Array(count * 4)
    const indices = []
    const rand = makeRandom(777)

    for (let i = 0; i < count; i++) {
      const [x, y, z] = lights[i]
      const w = 0.30 + rand() * 0.22
      const h = 0.44 + rand() * 0.3
      const q = [[-w, -h], [w, -h], [w, h], [-w, h]]
      const seed = rand() * 100
      for (let v = 0; v < 4; v++) {
        const o = (i * 4 + v) * 3
        positions[o + 0] = x + q[v][0]
        positions[o + 1] = y + q[v][1]
        positions[o + 2] = z
        uvs[(i * 4 + v) * 2 + 0] = q[v][0] > 0 ? 1 : 0
        uvs[(i * 4 + v) * 2 + 1] = q[v][1] > 0 ? 1 : 0
        seeds[i * 4 + v] = seed
      }
      const b = i * 4
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setIndex(indices)

    this.windowUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(0xffd08a) },
    }

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.windowUniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        varying vec2 vUv; varying float vSeed;
        void main(){
          vUv = uv; vSeed = aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uOpacity; uniform vec3 uColor;
        varying vec2 vUv; varying float vSeed;
        void main(){
          // zachte rechthoek
          vec2 d = abs(vUv - 0.5);
          float m = smoothstep(0.5, 0.16, max(d.x, d.y));
          // heel af en toe gaat er ergens een licht uit
          float flick = 0.75 + 0.25 * sin(uTime * 0.35 + vSeed * 9.7);
          float rare  = step(0.06, fract(sin(vSeed * 91.3) * 43758.5453));
          gl_FragColor = vec4(uColor, m * flick * rare * uOpacity);
        }
      `,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 2
    mesh.frustumCulled = false
    return mesh
  }

  /**
   * De weerspiegeling van de stad.
   *
   * De strepen liggen plát op het water en lopen van de overkant naar de
   * kijker toe — precies zoals een spiegeling zich uitrekt. Onder een
   * scherende hoek lees je ze op het scherm als verticale lichtstrepen.
   * Ze zweven net boven de hoogste golftop en worden additief gemengd,
   * dus er valt niets te sorteren en de kade dekt ze netjes af.
   */
  #buildReflection(lights) {
    const usable = lights.filter((l) => l[1] > 3)
    const count = usable.length
    const positions = new Float32Array(count * 4 * 3)
    const uvs = new Float32Array(count * 4 * 2)
    const seeds = new Float32Array(count * 4)
    const indices = []
    const rand = makeRandom(31337)
    const Y = 1.3 // net boven de hoogste deining

    for (let i = 0; i < count; i++) {
      const [x, y, z] = usable[i]
      const w = 0.42 + rand() * 0.4
      const len = 9 + y * 1.9 + rand() * 8 // hoger licht = langere spiegeling
      const z0 = z + 3
      const seed = rand() * 100
      // hoeken: [dx, dz-fractie]
      const q = [[-w, 0], [w, 0], [w, 1], [-w, 1]]
      for (let v = 0; v < 4; v++) {
        const o = (i * 4 + v) * 3
        positions[o + 0] = x + q[v][0]
        positions[o + 1] = Y
        positions[o + 2] = z0 + q[v][1] * len
        uvs[(i * 4 + v) * 2 + 0] = q[v][0] > 0 ? 1 : 0
        uvs[(i * 4 + v) * 2 + 1] = q[v][1]
        seeds[i * 4 + v] = seed
      }
      const b = i * 4
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setIndex(indices)

    this.reflectionUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.55 },
      uColor: { value: new THREE.Color(0xffc478) },
    }

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: this.reflectionUniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        varying vec2 vUv; varying float vSeed;
        void main(){
          vUv = uv; vSeed = aSeed;
          vec3 p = position;
          // de streep slingert mee op de golven
          p.x += sin(uTime * 0.8 + p.z * 0.16 + aSeed) * 1.1 * vUv.y;
          p.x += sin(uTime * 2.1 + p.z * 0.55 + aSeed * 2.0) * 0.35 * vUv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uOpacity; uniform vec3 uColor;
        varying vec2 vUv; varying float vSeed;
        void main(){
          // aan de rand uitvloeien, en verder van de bron zwakker worden
          float across = smoothstep(0.5, 0.04, abs(vUv.x - 0.5));
          float along  = pow(1.0 - vUv.y, 1.6);
          // opgebroken door de rimpeling
          float ripple = 0.5 + 0.5 * sin(vUv.y * 34.0 - uTime * 3.0 + vSeed * 5.0);
          float rare = step(0.06, fract(sin(vSeed * 91.3) * 43758.5453));
          gl_FragColor = vec4(uColor, across * along * ripple * rare * uOpacity * 0.55);
        }
      `,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 3 // ná het water
    mesh.frustumCulled = false
    return mesh
  }

  update(elapsed) {
    this.windowUniforms.uTime.value = elapsed
    this.reflectionUniforms.uTime.value = elapsed
  }

  /** Overdag lichter silhouet, 's nachts bijna zwart; lampjes uit bij zonsopgang. */
  apply(state, t) {
    const day = clamp((state.ambient - 0.3) / 0.6)
    this.material.color.copy(this.nightColor).lerp(this.dayColor, day)
    const lit = clamp(1 - day * 1.25)
    this.windowUniforms.uOpacity.value = lit
    this.reflectionUniforms.uOpacity.value = lit * 0.85
    this.lights.visible = lit > 0.02
    this.reflection.visible = lit > 0.02
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.lights.geometry.dispose(); this.lights.material.dispose()
    this.reflection.geometry.dispose(); this.reflection.material.dispose()
  }
}

/** Kleine eigen merge — voorkomt een extra import uit de addons. */
function mergeGeometries(geometries) {
  let vertexCount = 0
  let indexCount = 0
  for (const g of geometries) {
    vertexCount += g.attributes.position.count
    indexCount += g.index ? g.index.count : g.attributes.position.count
  }

  const position = new Float32Array(vertexCount * 3)
  const normal = new Float32Array(vertexCount * 3)
  const index = new Uint32Array(indexCount)

  let vOff = 0
  let iOff = 0
  for (const g of geometries) {
    if (!g.attributes.normal) g.computeVertexNormals()
    position.set(g.attributes.position.array, vOff * 3)
    normal.set(g.attributes.normal.array, vOff * 3)
    const n = g.attributes.position.count
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) index[iOff + i] = g.index.array[i] + vOff
      iOff += g.index.count
    } else {
      for (let i = 0; i < n; i++) index[iOff + i] = i + vOff
      iOff += n
    }
    vOff += n
    g.dispose()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  geo.setIndex(new THREE.BufferAttribute(index, 1))
  geo.computeBoundingSphere()
  return geo
}

export { mergeGeometries }
