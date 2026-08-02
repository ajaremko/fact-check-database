// Ported from Matthias Müller's ("Ten Minute Physics") FLIP/PIC fluid
// simulation demo (src/lib/home/animation.html in this repo).
// Copyright 2022 Matthias Müller - Ten Minute Physics, MIT License.
// www.youtube.com/c/TenMinutePhysics · www.matthiasMueller.info/tenMinutePhysics
//
// Adapted here as a framework-agnostic WebGL engine (no DOM globals, no
// debug UI, no draggable obstacle) so it can run as an ambient background.

export const pointVertexShader = `
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
export const splatFragmentShader = `
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
export const quadVertexShader = `
  attribute vec2 attrPosition;
  varying vec2 vUv;

  void main() {
    vUv = attrPosition * 0.5 + 0.5;
    gl_Position = vec4(attrPosition, 0.0, 1.0);
  }
`

export const compositeFragmentShader = `
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

export function createShader(
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

export function resizeDensityTexture(
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
