// Ported from Matthias Müller's ("Ten Minute Physics") FLIP/PIC fluid
// simulation demo (src/lib/home/animation.html in this repo).
// Copyright 2022 Matthias Müller - Ten Minute Physics, MIT License.
// www.youtube.com/c/TenMinutePhysics · www.matthiasMueller.info/tenMinutePhysics
//
// Adapted here as a framework-agnostic WebGL engine (no DOM globals, no
// debug UI, no draggable obstacle) so it can run as an ambient background.

import { perlin2D } from './perlin'
import { FlipFluid } from './FlipFluid'

// Initial particle placement: an even grid spanning the fill extent, with
// each point nudged off-center by Perlin noise instead of hex-packed into a
// single block, so the tank starts full but organic rather than one clump.
const PLACEMENT_NOISE_FREQUENCY = 0.9 // larger = finer, less-correlated jitter
const PLACEMENT_JITTER_STRENGTH = 1 // fraction of grid spacing particles may wander

export function setupScene(
  tankWidth: number,
  tankHeight: number,
  res: number,
  turbulenceStrength: number,
  turbulenceFrequency: number,
  turbulenceSpeed: number
): FlipFluid {
  const h = tankHeight / res
  const density = 1000.0

  const r = 0.3 * h
  const spacing = 2.4 * r

  const numX = Math.floor((tankWidth - 2.0 * h - 2.0 * r) / spacing)
  const numY = Math.floor((tankHeight - 2.0 * h - 2.0 * r) / spacing)
  const maxParticles = numX * numY

  const f = new FlipFluid(
    density,
    tankWidth,
    tankHeight,
    h,
    r,
    maxParticles,
    turbulenceFrequency,
    turbulenceStrength,
    turbulenceSpeed
  )

  f.numParticles = numX * numY
  const jitter = spacing * PLACEMENT_JITTER_STRENGTH
  let p = 0
  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      const cellX = h + r + spacing * (i + 0.5)
      const cellY = h + r + spacing * (j + 0.5)
      const nx = perlin2D(
        cellX * PLACEMENT_NOISE_FREQUENCY,
        cellY * PLACEMENT_NOISE_FREQUENCY
      )
      const ny = perlin2D(
        cellX * PLACEMENT_NOISE_FREQUENCY + 100,
        cellY * PLACEMENT_NOISE_FREQUENCY + 100
      )
      f.particlePos[p++] = cellX + nx * jitter
      f.particlePos[p++] = cellY + ny * jitter
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
