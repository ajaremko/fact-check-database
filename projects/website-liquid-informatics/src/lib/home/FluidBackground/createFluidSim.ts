// Ported from Matthias Müller's ("Ten Minute Physics") FLIP/PIC fluid
// simulation demo (src/lib/home/animation.html in this repo).
// Copyright 2022 Matthias Müller - Ten Minute Physics, MIT License.
// www.youtube.com/c/TenMinutePhysics · www.matthiasMueller.info/tenMinutePhysics
//
// Adapted here as a framework-agnostic WebGL engine (no DOM globals, no
// debug UI, no draggable obstacle) so it can run as an ambient background.

import {
  createShader,
  compositeFragmentShader,
  quadVertexShader,
  splatFragmentShader,
  pointVertexShader,
  resizeDensityTexture,
} from './shaders'
import { setupScene } from './setupScene'

// ----------------- scene setup ------------------------------

const SIM_HEIGHT = 3.0

// The simulated tank is built larger than the visible viewport (see
// `OVERSCAN_X`/`OVERSCAN_Y` below) and only its central portion is rendered,
// so the solid walls stay cropped out of view.
const RES = 6

// The tank is simulated larger than the visible viewport in each dimension;
// only the centered crop is ever rendered. Horizontal and vertical margins
// are tuned independently: X only needs enough to hide the wall artifact
// near the side walls, while Y needs enough that the floor-collision effect
// (particles compressing/bouncing on the bottom wall) fully dissipates
// before it would enter the visible area.
const OVERSCAN_X = 1.5
const OVERSCAN_Y = 3

// Metaball rendering: particles are splatted as soft, oversized sprites into
// a reduced-resolution density framebuffer, then a full-screen pass
// thresholds that density field into a single merged liquid silhouette.
const SPLAT_SIZE_SCALE = 4 // 2.2
const DENSITY_THRESHOLD = 0.9
const THRESHOLD_SOFTNESS = 0.15
const SPLAT_RESOLUTION_SCALE = 0.5

// A small swirling force applied to every particle each frame (see
// `FlipFluid.applyTurbulence`), so the fluid keeps drifting instead of
// settling into a static arrangement once gravity/packing equilibrate.
const TURBULENCE_STRENGTH = 0.5 // velocity nudge amplitude (sim-units/sec)
const TURBULENCE_FREQUENCY = 1.5 // spatial frequency — smaller = larger eddies
const TURBULENCE_SPEED = 0.15 // how fast the flow pattern drifts over time

export interface FluidBackground {
  start(): void
  stop(): void
  dispose(): void
  resize(): void
}

export function createFluidSim(
  canvas: HTMLCanvasElement,
  simHeight: number = SIM_HEIGHT,
  res: number = RES,
  turbulenceStrength: number = TURBULENCE_STRENGTH,
  turbulenceFrequency: number = TURBULENCE_FREQUENCY,
  turbulenceSpeed: number = TURBULENCE_SPEED,
  overscanX: number = OVERSCAN_X,
  overscanY: number = OVERSCAN_Y
): FluidBackground | null {
  const glContext = canvas.getContext('webgl', { alpha: true, antialias: true })
  if (!glContext) return null
  // Nested closures below (draw/tick) capture `gl` for the lifetime of the
  // simulation; re-binding to an explicitly non-null const (rather than
  // relying on control-flow narrowing of `glContext`) keeps its type solid
  // across those closures.
  const gl: WebGLRenderingContext = glContext

  let cScale = canvas.height / simHeight
  let simWidth = canvas.width / cScale

  const tankWidth = simWidth * overscanX
  const tankHeight = simHeight * overscanY
  const fluid = setupScene(
    tankWidth,
    tankHeight,
    res,
    turbulenceStrength,
    turbulenceFrequency,
    turbulenceSpeed
  )

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
