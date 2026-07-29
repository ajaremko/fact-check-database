// Ported from Matthias Müller's ("Ten Minute Physics") FLIP/PIC fluid
// simulation demo (src/lib/home/animation.html in this repo).
// Copyright 2022 Matthias Müller - Ten Minute Physics, MIT License.
// www.youtube.com/c/TenMinutePhysics · www.matthiasMueller.info/tenMinutePhysics
//
// Adapted here as a framework-agnostic WebGL engine (no DOM globals, no
// debug UI, no draggable obstacle) so it can run as an ambient background.

const FLUID_CELL = 0
const AIR_CELL = 1
const SOLID_CELL = 2

// Uniform bulk water color, in place of the original's blue-water palette,
// so the sim reads as part of the site's dark green hero rather than a
// contrasting demo accent.
const BULK_COLOR: readonly [number, number, number] = [0.05, 0.45, 0.35]

function clamp(x: number, min: number, max: number): number {
  if (x < min) return min
  else if (x > max) return max
  else return x
}

class FlipFluid {
  density: number
  fNumX: number
  fNumY: number
  h: number
  fInvSpacing: number
  fNumCells: number

  u: Float32Array
  v: Float32Array
  du: Float32Array
  dv: Float32Array
  prevU: Float32Array
  prevV: Float32Array
  p: Float32Array
  s: Float32Array
  cellType: Int32Array

  maxParticles: number
  particlePos: Float32Array
  particleColor: Float32Array
  particleVel: Float32Array
  particleDensity: Float32Array
  particleRestDensity: number

  particleRadius: number
  pInvSpacing: number
  pNumX: number
  pNumY: number
  pNumCells: number

  numCellParticles: Int32Array
  firstCellParticle: Int32Array
  cellParticleIds: Int32Array

  numParticles: number

  constructor(
    density: number,
    width: number,
    height: number,
    spacing: number,
    particleRadius: number,
    maxParticles: number
  ) {
    this.density = density
    this.fNumX = Math.floor(width / spacing) + 1
    this.fNumY = Math.floor(height / spacing) + 1
    this.h = Math.max(width / this.fNumX, height / this.fNumY)
    this.fInvSpacing = 1.0 / this.h
    this.fNumCells = this.fNumX * this.fNumY

    this.u = new Float32Array(this.fNumCells)
    this.v = new Float32Array(this.fNumCells)
    this.du = new Float32Array(this.fNumCells)
    this.dv = new Float32Array(this.fNumCells)
    this.prevU = new Float32Array(this.fNumCells)
    this.prevV = new Float32Array(this.fNumCells)
    this.p = new Float32Array(this.fNumCells)
    this.s = new Float32Array(this.fNumCells)
    this.cellType = new Int32Array(this.fNumCells)

    this.maxParticles = maxParticles

    this.particlePos = new Float32Array(2 * this.maxParticles)
    this.particleColor = new Float32Array(3 * this.maxParticles)
    for (let i = 0; i < this.maxParticles; i++) {
      this.particleColor[3 * i] = BULK_COLOR[0]
      this.particleColor[3 * i + 1] = BULK_COLOR[1]
      this.particleColor[3 * i + 2] = BULK_COLOR[2]
    }

    this.particleVel = new Float32Array(2 * this.maxParticles)
    this.particleDensity = new Float32Array(this.fNumCells)
    this.particleRestDensity = 0.0

    this.particleRadius = particleRadius
    this.pInvSpacing = 1.0 / (2.2 * particleRadius)
    this.pNumX = Math.floor(width * this.pInvSpacing) + 1
    this.pNumY = Math.floor(height * this.pInvSpacing) + 1
    this.pNumCells = this.pNumX * this.pNumY

    this.numCellParticles = new Int32Array(this.pNumCells)
    this.firstCellParticle = new Int32Array(this.pNumCells + 1)
    this.cellParticleIds = new Int32Array(maxParticles)

    this.numParticles = 0
  }

  integrateParticles(dt: number, gravity: number) {
    for (let i = 0; i < this.numParticles; i++) {
      this.particleVel[2 * i + 1] += dt * gravity
      this.particlePos[2 * i] += this.particleVel[2 * i] * dt
      this.particlePos[2 * i + 1] += this.particleVel[2 * i + 1] * dt
    }
  }

  pushParticlesApart(numIters: number) {
    const colorDiffusionCoeff = 0.001

    this.numCellParticles.fill(0)

    for (let i = 0; i < this.numParticles; i++) {
      const x = this.particlePos[2 * i]
      const y = this.particlePos[2 * i + 1]

      const xi = clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1)
      const yi = clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1)
      const cellNr = xi * this.pNumY + yi
      this.numCellParticles[cellNr]++
    }

    let first = 0
    for (let i = 0; i < this.pNumCells; i++) {
      first += this.numCellParticles[i]
      this.firstCellParticle[i] = first
    }
    this.firstCellParticle[this.pNumCells] = first // guard

    for (let i = 0; i < this.numParticles; i++) {
      const x = this.particlePos[2 * i]
      const y = this.particlePos[2 * i + 1]

      const xi = clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1)
      const yi = clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1)
      const cellNr = xi * this.pNumY + yi
      this.firstCellParticle[cellNr]--
      this.cellParticleIds[this.firstCellParticle[cellNr]] = i
    }

    const minDist = 2.0 * this.particleRadius
    const minDist2 = minDist * minDist

    for (let iter = 0; iter < numIters; iter++) {
      for (let i = 0; i < this.numParticles; i++) {
        const px = this.particlePos[2 * i]
        const py = this.particlePos[2 * i + 1]

        const pxi = Math.floor(px * this.pInvSpacing)
        const pyi = Math.floor(py * this.pInvSpacing)
        const x0 = Math.max(pxi - 1, 0)
        const y0 = Math.max(pyi - 1, 0)
        const x1 = Math.min(pxi + 1, this.pNumX - 1)
        const y1 = Math.min(pyi + 1, this.pNumY - 1)

        for (let xi = x0; xi <= x1; xi++) {
          for (let yi = y0; yi <= y1; yi++) {
            const cellNr = xi * this.pNumY + yi
            const first = this.firstCellParticle[cellNr]
            const last = this.firstCellParticle[cellNr + 1]
            for (let j = first; j < last; j++) {
              const id = this.cellParticleIds[j]
              if (id === i) continue
              const qx = this.particlePos[2 * id]
              const qy = this.particlePos[2 * id + 1]

              let dx = qx - px
              let dy = qy - py
              const d2 = dx * dx + dy * dy
              if (d2 > minDist2 || d2 === 0.0) continue
              const d = Math.sqrt(d2)
              const s = (0.5 * (minDist - d)) / d
              dx *= s
              dy *= s
              this.particlePos[2 * i] -= dx
              this.particlePos[2 * i + 1] -= dy
              this.particlePos[2 * id] += dx
              this.particlePos[2 * id + 1] += dy

              for (let k = 0; k < 3; k++) {
                const color0 = this.particleColor[3 * i + k]
                const color1 = this.particleColor[3 * id + k]
                const color = (color0 + color1) * 0.5
                this.particleColor[3 * i + k] =
                  color0 + (color - color0) * colorDiffusionCoeff
                this.particleColor[3 * id + k] =
                  color1 + (color - color1) * colorDiffusionCoeff
              }
            }
          }
        }
      }
    }
  }

  handleWallCollisions() {
    const h = 1.0 / this.fInvSpacing
    const r = this.particleRadius

    const minX = h + r
    const maxX = (this.fNumX - 1) * h - r
    const minY = h + r
    const maxY = (this.fNumY - 1) * h - r

    for (let i = 0; i < this.numParticles; i++) {
      let x = this.particlePos[2 * i]
      let y = this.particlePos[2 * i + 1]

      if (x < minX) {
        x = minX
        this.particleVel[2 * i] = 0.0
      }
      if (x > maxX) {
        x = maxX
        this.particleVel[2 * i] = 0.0
      }
      if (y < minY) {
        y = minY
        this.particleVel[2 * i + 1] = 0.0
      }
      if (y > maxY) {
        y = maxY
        this.particleVel[2 * i + 1] = 0.0
      }
      this.particlePos[2 * i] = x
      this.particlePos[2 * i + 1] = y
    }
  }

  updateParticleDensity() {
    const n = this.fNumY
    const h = this.h
    const h1 = this.fInvSpacing
    const h2 = 0.5 * h

    const d = this.particleDensity
    d.fill(0.0)

    for (let i = 0; i < this.numParticles; i++) {
      let x = this.particlePos[2 * i]
      let y = this.particlePos[2 * i + 1]

      x = clamp(x, h, (this.fNumX - 1) * h)
      y = clamp(y, h, (this.fNumY - 1) * h)

      const x0 = Math.floor((x - h2) * h1)
      const tx = (x - h2 - x0 * h) * h1
      const x1 = Math.min(x0 + 1, this.fNumX - 2)

      const y0 = Math.floor((y - h2) * h1)
      const ty = (y - h2 - y0 * h) * h1
      const y1 = Math.min(y0 + 1, this.fNumY - 2)

      const sx = 1.0 - tx
      const sy = 1.0 - ty

      if (x0 < this.fNumX && y0 < this.fNumY) d[x0 * n + y0] += sx * sy
      if (x1 < this.fNumX && y0 < this.fNumY) d[x1 * n + y0] += tx * sy
      if (x1 < this.fNumX && y1 < this.fNumY) d[x1 * n + y1] += tx * ty
      if (x0 < this.fNumX && y1 < this.fNumY) d[x0 * n + y1] += sx * ty
    }

    if (this.particleRestDensity === 0.0) {
      let sum = 0.0
      let numFluidCells = 0

      for (let i = 0; i < this.fNumCells; i++) {
        if (this.cellType[i] === FLUID_CELL) {
          sum += d[i]
          numFluidCells++
        }
      }

      if (numFluidCells > 0) this.particleRestDensity = sum / numFluidCells
    }
  }

  transferVelocities(toGrid: boolean, flipRatio = 0) {
    const n = this.fNumY
    const h = this.h
    const h1 = this.fInvSpacing
    const h2 = 0.5 * h

    if (toGrid) {
      this.prevU.set(this.u)
      this.prevV.set(this.v)

      this.du.fill(0.0)
      this.dv.fill(0.0)
      this.u.fill(0.0)
      this.v.fill(0.0)

      for (let i = 0; i < this.fNumCells; i++)
        this.cellType[i] = this.s[i] === 0.0 ? SOLID_CELL : AIR_CELL

      for (let i = 0; i < this.numParticles; i++) {
        const x = this.particlePos[2 * i]
        const y = this.particlePos[2 * i + 1]
        const xi = clamp(Math.floor(x * h1), 0, this.fNumX - 1)
        const yi = clamp(Math.floor(y * h1), 0, this.fNumY - 1)
        const cellNr = xi * n + yi
        if (this.cellType[cellNr] === AIR_CELL)
          this.cellType[cellNr] = FLUID_CELL
      }
    }

    for (let component = 0; component < 2; component++) {
      const dx = component === 0 ? 0.0 : h2
      const dy = component === 0 ? h2 : 0.0

      const f = component === 0 ? this.u : this.v
      const prevF = component === 0 ? this.prevU : this.prevV
      const d = component === 0 ? this.du : this.dv

      for (let i = 0; i < this.numParticles; i++) {
        let x = this.particlePos[2 * i]
        let y = this.particlePos[2 * i + 1]

        x = clamp(x, h, (this.fNumX - 1) * h)
        y = clamp(y, h, (this.fNumY - 1) * h)

        const x0 = Math.min(Math.floor((x - dx) * h1), this.fNumX - 2)
        const tx = (x - dx - x0 * h) * h1
        const x1 = Math.min(x0 + 1, this.fNumX - 2)

        const y0 = Math.min(Math.floor((y - dy) * h1), this.fNumY - 2)
        const ty = (y - dy - y0 * h) * h1
        const y1 = Math.min(y0 + 1, this.fNumY - 2)

        const sx = 1.0 - tx
        const sy = 1.0 - ty

        const d0 = sx * sy
        const d1 = tx * sy
        const d2 = tx * ty
        const d3 = sx * ty

        const nr0 = x0 * n + y0
        const nr1 = x1 * n + y0
        const nr2 = x1 * n + y1
        const nr3 = x0 * n + y1

        if (toGrid) {
          const pv = this.particleVel[2 * i + component]
          f[nr0] += pv * d0
          d[nr0] += d0
          f[nr1] += pv * d1
          d[nr1] += d1
          f[nr2] += pv * d2
          d[nr2] += d2
          f[nr3] += pv * d3
          d[nr3] += d3
        } else {
          const offset = component === 0 ? n : 1
          const valid0 =
            this.cellType[nr0] !== AIR_CELL ||
            this.cellType[nr0 - offset] !== AIR_CELL
              ? 1.0
              : 0.0
          const valid1 =
            this.cellType[nr1] !== AIR_CELL ||
            this.cellType[nr1 - offset] !== AIR_CELL
              ? 1.0
              : 0.0
          const valid2 =
            this.cellType[nr2] !== AIR_CELL ||
            this.cellType[nr2 - offset] !== AIR_CELL
              ? 1.0
              : 0.0
          const valid3 =
            this.cellType[nr3] !== AIR_CELL ||
            this.cellType[nr3 - offset] !== AIR_CELL
              ? 1.0
              : 0.0

          const v = this.particleVel[2 * i + component]
          const dSum = valid0 * d0 + valid1 * d1 + valid2 * d2 + valid3 * d3

          if (dSum > 0.0) {
            const picV =
              (valid0 * d0 * f[nr0] +
                valid1 * d1 * f[nr1] +
                valid2 * d2 * f[nr2] +
                valid3 * d3 * f[nr3]) /
              dSum
            const corr =
              (valid0 * d0 * (f[nr0] - prevF[nr0]) +
                valid1 * d1 * (f[nr1] - prevF[nr1]) +
                valid2 * d2 * (f[nr2] - prevF[nr2]) +
                valid3 * d3 * (f[nr3] - prevF[nr3])) /
              dSum
            const flipV = v + corr

            this.particleVel[2 * i + component] =
              (1.0 - flipRatio) * picV + flipRatio * flipV
          }
        }
      }

      if (toGrid) {
        for (let i = 0; i < f.length; i++) {
          if (d[i] > 0.0) f[i] /= d[i]
        }

        for (let i = 0; i < this.fNumX; i++) {
          for (let j = 0; j < this.fNumY; j++) {
            const solid = this.cellType[i * n + j] === SOLID_CELL
            if (
              solid ||
              (i > 0 && this.cellType[(i - 1) * n + j] === SOLID_CELL)
            )
              this.u[i * n + j] = this.prevU[i * n + j]
            if (solid || (j > 0 && this.cellType[i * n + j - 1] === SOLID_CELL))
              this.v[i * n + j] = this.prevV[i * n + j]
          }
        }
      }
    }
  }

  solveIncompressibility(
    numIters: number,
    dt: number,
    overRelaxation: number,
    compensateDrift = true
  ) {
    this.p.fill(0.0)
    this.prevU.set(this.u)
    this.prevV.set(this.v)

    const n = this.fNumY
    const cp = (this.density * this.h) / dt

    for (let iter = 0; iter < numIters; iter++) {
      for (let i = 1; i < this.fNumX - 1; i++) {
        for (let j = 1; j < this.fNumY - 1; j++) {
          if (this.cellType[i * n + j] !== FLUID_CELL) continue

          const center = i * n + j
          const left = (i - 1) * n + j
          const right = (i + 1) * n + j
          const bottom = i * n + j - 1
          const top = i * n + j + 1

          const sx0 = this.s[left]
          const sx1 = this.s[right]
          const sy0 = this.s[bottom]
          const sy1 = this.s[top]
          const s = sx0 + sx1 + sy0 + sy1
          if (s === 0.0) continue

          let div =
            this.u[right] - this.u[center] + this.v[top] - this.v[center]

          if (this.particleRestDensity > 0.0 && compensateDrift) {
            const k = 1.0
            const compression =
              this.particleDensity[i * n + j] - this.particleRestDensity
            if (compression > 0.0) div = div - k * compression
          }

          let p = -div / s
          p *= overRelaxation
          this.p[center] += cp * p

          this.u[center] -= sx0 * p
          this.u[right] += sx1 * p
          this.v[center] -= sy0 * p
          this.v[top] += sy1 * p
        }
      }
    }
  }

  applyTurbulence(dt: number, time: number) {
    for (let i = 0; i < this.numParticles; i++) {
      const x = this.particlePos[2 * i]
      const y = this.particlePos[2 * i + 1]
      const vx =
        Math.sin(y * TURBULENCE_FREQUENCY + time * TURBULENCE_SPEED) *
        TURBULENCE_STRENGTH
      const vy =
        Math.cos(x * TURBULENCE_FREQUENCY - time * TURBULENCE_SPEED) *
        TURBULENCE_STRENGTH
      this.particleVel[2 * i] += vx * dt
      this.particleVel[2 * i + 1] += vy * dt
    }
  }

  updateParticleColors() {
    // Every particle settles toward the same bulk water color — no
    // density-based foam/highlight recolor, so low-density (near-surface)
    // regions don't stand out as separate white blobs against the water.
    const step = 0.01

    for (let i = 0; i < this.numParticles; i++) {
      for (let k = 0; k < 3; k++) {
        const idx = 3 * i + k
        const target = BULK_COLOR[k]
        const c = this.particleColor[idx]
        if (c < target) this.particleColor[idx] = clamp(c + step, 0, target)
        else if (c > target)
          this.particleColor[idx] = clamp(c - step, target, 1)
      }
    }
  }

  simulate(
    dt: number,
    gravity: number,
    flipRatio: number,
    numPressureIters: number,
    numParticleIters: number,
    overRelaxation: number,
    time: number
  ) {
    this.integrateParticles(dt, gravity)
    this.applyTurbulence(dt, time)
    this.pushParticlesApart(numParticleIters)
    this.handleWallCollisions()
    this.transferVelocities(true)
    this.updateParticleDensity()
    this.solveIncompressibility(numPressureIters, dt, overRelaxation, true)
    this.transferVelocities(false, flipRatio)
    this.updateParticleColors()
  }
}

// ----------------- scene setup ------------------------------

const SIM_HEIGHT = 3.0

// The simulated tank is built larger than the visible viewport (see
// `OVERSCAN` in createFluidBackground) and only its central portion is
// rendered, so the solid walls — and the air-leaking-along-the-wall
// artifact that appears near them — stay cropped out of view.
const RES = 10
const REL_WATER_WIDTH = 0.98
const REL_WATER_HEIGHT = 0.9

// The tank is simulated this much larger than the visible viewport in each
// dimension; only the centered `OVERSCAN`-fraction crop is ever rendered.
const OVERSCAN = 1.25

// Metaball rendering: particles are splatted as soft, oversized sprites into
// a reduced-resolution density framebuffer, then a full-screen pass
// thresholds that density field into a single merged liquid silhouette.
const SPLAT_SIZE_SCALE = 2.2
const DENSITY_THRESHOLD = 0.4
const THRESHOLD_SOFTNESS = 0.15
const SPLAT_RESOLUTION_SCALE = 0.5

// A small swirling force applied to every particle each frame (see
// `FlipFluid.applyTurbulence`), so the fluid keeps drifting instead of
// settling into a static arrangement once gravity/packing equilibrate.
const TURBULENCE_STRENGTH = 0.1 // velocity nudge amplitude (sim-units/sec)
const TURBULENCE_FREQUENCY = 2.0 // spatial frequency — smaller = larger eddies
const TURBULENCE_SPEED = 0.5 // how fast the flow pattern drifts over time

function setupScene(tankWidth: number, tankHeight: number): FlipFluid {
  const h = tankHeight / RES
  const density = 1000.0

  const relWaterHeight = REL_WATER_HEIGHT
  const relWaterWidth = REL_WATER_WIDTH

  const r = 0.3 * h
  const dx = 2.0 * r
  const dy = (Math.sqrt(3.0) / 2.0) * dx

  const numX = Math.floor((relWaterWidth * tankWidth - 2.0 * h - 2.0 * r) / dx)
  const numY = Math.floor(
    (relWaterHeight * tankHeight - 2.0 * h - 2.0 * r) / dy
  )
  const maxParticles = numX * numY

  const f = new FlipFluid(density, tankWidth, tankHeight, h, r, maxParticles)

  f.numParticles = numX * numY
  let p = 0
  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      f.particlePos[p++] = h + r + dx * i + (j % 2 === 0 ? 0.0 : r)
      f.particlePos[p++] = h + r + dy * j
    }
  }

  const n = f.fNumY
  for (let i = 0; i < f.fNumX; i++) {
    for (let j = 0; j < f.fNumY; j++) {
      let s = 1.0 // fluid
      if (i === 0 || i === f.fNumX - 1 || j === 0 || j === f.fNumY - 1) s = 0.0 // solid: fully enclosed tank
      f.s[i * n + j] = s
    }
  }

  return f
}

// ----------------- rendering ------------------------------

const pointVertexShader = `
  attribute vec2 attrPosition;
  attribute vec3 attrColor;
  uniform vec2 domainSize;
  uniform vec2 viewOffset;
  uniform float pointSize;

  varying vec3 fragColor;

  void main() {
    vec4 screenTransform =
      vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
    gl_Position =
      vec4((attrPosition - viewOffset) * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

    gl_PointSize = pointSize;
    fragColor = attrColor;
  }
`

// Splat pass: soft radial falloff instead of a hard disc, output premultiplied
// by weight so overlapping splats accumulate correctly under additive
// blending (weight itself accumulates in alpha, giving a density field).
const splatFragmentShader = `
  precision mediump float;
  varying vec3 fragColor;

  void main() {
    float rx = 0.5 - gl_PointCoord.x;
    float ry = 0.5 - gl_PointCoord.y;
    float r = length(vec2(rx, ry)) * 2.0;
    float weight = smoothstep(1.0, 0.0, r);
    gl_FragColor = vec4(fragColor * weight, weight);
  }
`

// Composite pass: a full-screen quad that samples the accumulated density
// field and thresholds it into a single merged liquid silhouette.
const quadVertexShader = `
  attribute vec2 attrPosition;
  varying vec2 vUv;

  void main() {
    vUv = attrPosition * 0.5 + 0.5;
    gl_Position = vec4(attrPosition, 0.0, 1.0);
  }
`

const compositeFragmentShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D densityTexture;
  uniform float threshold;
  uniform float softness;

  void main() {
    vec4 sample = texture2D(densityTexture, vUv);
    float density = sample.a;
    if (density <= 0.0001) discard;
    vec3 color = sample.rgb / density;
    float alpha = smoothstep(threshold - softness, threshold + softness, density);
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

function createShader(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram {
  const vsShader = gl.createShader(gl.VERTEX_SHADER)
  if (!vsShader) throw new Error('Failed to create vertex shader')
  gl.shaderSource(vsShader, vsSource)
  gl.compileShader(vsShader)

  const fsShader = gl.createShader(gl.FRAGMENT_SHADER)
  if (!fsShader) throw new Error('Failed to create fragment shader')
  gl.shaderSource(fsShader, fsSource)
  gl.compileShader(fsShader)

  const shader = gl.createProgram()
  if (!shader) throw new Error('Failed to create shader program')
  gl.attachShader(shader, vsShader)
  gl.attachShader(shader, fsShader)
  gl.linkProgram(shader)

  return shader
}

export interface FluidBackground {
  start(): void
  stop(): void
  dispose(): void
  resize(): void
}

function resizeDensityTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  width: number,
  height: number
) {
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )
  gl.bindTexture(gl.TEXTURE_2D, null)
}

export function createFluidBackground(
  canvas: HTMLCanvasElement
): FluidBackground | null {
  const glContext = canvas.getContext('webgl', { alpha: true, antialias: true })
  if (!glContext) return null
  // Nested closures below (draw/tick) capture `gl` for the lifetime of the
  // simulation; re-binding to an explicitly non-null const (rather than
  // relying on control-flow narrowing of `glContext`) keeps its type solid
  // across those closures.
  const gl: WebGLRenderingContext = glContext

  let cScale = canvas.height / SIM_HEIGHT
  let simWidth = canvas.width / cScale

  const tankWidth = simWidth * OVERSCAN
  const tankHeight = SIM_HEIGHT * OVERSCAN
  const fluid = setupScene(tankWidth, tankHeight)

  const splatShader = createShader(gl, pointVertexShader, splatFragmentShader)
  const compositeShader = createShader(
    gl,
    quadVertexShader,
    compositeFragmentShader
  )

  const pointVertexBuffer = gl.createBuffer()
  const pointColorBuffer = gl.createBuffer()

  const quadVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  )
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  let densityWidth = Math.max(
    1,
    Math.round(canvas.width * SPLAT_RESOLUTION_SCALE)
  )
  let densityHeight = Math.max(
    1,
    Math.round(canvas.height * SPLAT_RESOLUTION_SCALE)
  )

  const densityTexture = gl.createTexture()
  if (!densityTexture) throw new Error('Failed to create density texture')
  resizeDensityTexture(gl, densityTexture, densityWidth, densityHeight)
  gl.bindTexture(gl.TEXTURE_2D, densityTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_2D, null)

  const densityFramebuffer = gl.createFramebuffer()
  if (!densityFramebuffer) throw new Error('Failed to create framebuffer')
  gl.bindFramebuffer(gl.FRAMEBUFFER, densityFramebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    densityTexture,
    0
  )
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  const dt = 1.0 / 60.0
  const gravity = -0.5
  const flipRatio = 0.9
  const numPressureIters = 30
  const numParticleIters = 2
  const overRelaxation = 1.9

  let time = 0
  let rafHandle: number | null = null

  function draw() {
    // Pass 1: splat particles as soft, oversized sprites into the
    // reduced-resolution density framebuffer, additively.
    gl.bindFramebuffer(gl.FRAMEBUFFER, densityFramebuffer)
    gl.viewport(0, 0, densityWidth, densityHeight)
    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)

    const splatPointSize =
      ((2.0 * fluid.particleRadius) / simWidth) *
      densityWidth *
      SPLAT_SIZE_SCALE

    gl.useProgram(splatShader)
    gl.uniform2f(
      gl.getUniformLocation(splatShader, 'domainSize'),
      simWidth,
      SIM_HEIGHT
    )
    gl.uniform2f(
      gl.getUniformLocation(splatShader, 'viewOffset'),
      (tankWidth - simWidth) / 2,
      (tankHeight - SIM_HEIGHT) / 2
    )
    gl.uniform1f(
      gl.getUniformLocation(splatShader, 'pointSize'),
      splatPointSize
    )

    gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, fluid.particlePos, gl.DYNAMIC_DRAW)

    const splatPosLoc = gl.getAttribLocation(splatShader, 'attrPosition')
    gl.enableVertexAttribArray(splatPosLoc)
    gl.vertexAttribPointer(splatPosLoc, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, fluid.particleColor, gl.DYNAMIC_DRAW)

    const splatColorLoc = gl.getAttribLocation(splatShader, 'attrColor')
    gl.enableVertexAttribArray(splatColorLoc)
    gl.vertexAttribPointer(splatColorLoc, 3, gl.FLOAT, false, 0, 0)

    gl.drawArrays(gl.POINTS, 0, fluid.numParticles)

    gl.disableVertexAttribArray(splatPosLoc)
    gl.disableVertexAttribArray(splatColorLoc)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    // Pass 2: composite the density field onto the canvas, thresholding it
    // into a single merged liquid silhouette.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.useProgram(compositeShader)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, densityTexture)
    gl.uniform1i(gl.getUniformLocation(compositeShader, 'densityTexture'), 0)
    gl.uniform1f(
      gl.getUniformLocation(compositeShader, 'threshold'),
      DENSITY_THRESHOLD
    )
    gl.uniform1f(
      gl.getUniformLocation(compositeShader, 'softness'),
      THRESHOLD_SOFTNESS
    )

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer)
    const quadPosLoc = gl.getAttribLocation(compositeShader, 'attrPosition')
    gl.enableVertexAttribArray(quadPosLoc)
    gl.vertexAttribPointer(quadPosLoc, 2, gl.FLOAT, false, 0, 0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    gl.disableVertexAttribArray(quadPosLoc)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  function tick() {
    time += dt
    fluid.simulate(
      dt,
      gravity,
      flipRatio,
      numPressureIters,
      numParticleIters,
      overRelaxation,
      time
    )
    draw()
    rafHandle = requestAnimationFrame(tick)
  }

  return {
    start() {
      if (rafHandle === null) rafHandle = requestAnimationFrame(tick)
    },
    stop() {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle)
        rafHandle = null
      }
    },
    dispose() {
      if (rafHandle !== null) cancelAnimationFrame(rafHandle)
      rafHandle = null
      gl.deleteProgram(splatShader)
      gl.deleteProgram(compositeShader)
      gl.deleteBuffer(pointVertexBuffer)
      gl.deleteBuffer(pointColorBuffer)
      gl.deleteBuffer(quadVertexBuffer)
      gl.deleteTexture(densityTexture)
      gl.deleteFramebuffer(densityFramebuffer)
    },
    resize() {
      // Only the viewport-to-simulation mapping (and the density
      // framebuffer's pixel size) is recomputed here — the fluid's own
      // grid/particle domain is not rebuilt, matching the original demo's
      // behavior of not handling resize either.
      cScale = canvas.height / SIM_HEIGHT
      simWidth = canvas.width / cScale
      densityWidth = Math.max(
        1,
        Math.round(canvas.width * SPLAT_RESOLUTION_SCALE)
      )
      densityHeight = Math.max(
        1,
        Math.round(canvas.height * SPLAT_RESOLUTION_SCALE)
      )
      resizeDensityTexture(gl, densityTexture, densityWidth, densityHeight)
    },
  }
}
