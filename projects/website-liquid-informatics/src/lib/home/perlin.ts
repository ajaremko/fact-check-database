// Small, self-contained 2D Perlin (gradient) noise implementation — no
// external noise package, just the standard permutation/fade/gradient
// machinery. The permutation table is built once, deterministically, at
// module load so the noise field is stable across reloads.

const PERMUTATION_SIZE = 256

function buildPermutation(): Uint8Array {
  const table = new Uint8Array(PERMUTATION_SIZE)
  for (let i = 0; i < PERMUTATION_SIZE; i++) table[i] = i

  let seed = 1337
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  for (let i = PERMUTATION_SIZE - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1))
    const tmp = table[i]
    table[i] = table[j]
    table[j] = tmp
  }

  return table
}

const permutation = buildPermutation()

function perm(i: number): number {
  return permutation[i & (PERMUTATION_SIZE - 1)]
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a)
}

const GRADIENTS_2D: readonly (readonly [number, number])[] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function grad(hash: number, x: number, y: number): number {
  const [gx, gy] = GRADIENTS_2D[hash & 7]
  return gx * x + gy * y
}

export function perlin2D(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi

  const u = fade(xf)
  const v = fade(yf)

  const aa = perm(perm(xi) + yi)
  const ab = perm(perm(xi) + yi + 1)
  const ba = perm(perm(xi + 1) + yi)
  const bb = perm(perm(xi + 1) + yi + 1)

  const x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf))
  const x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1))

  return lerp(v, x1, x2)
}
