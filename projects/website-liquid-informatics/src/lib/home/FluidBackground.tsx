'use client'

import { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { createFluidBackground } from './fluidSim'

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`

const MAX_DEVICE_PIXEL_RATIO = 2
const RESIZE_DEBOUNCE_MS = 200

export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReducedMotion) return

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))

    const sim = createFluidBackground(canvas)
    if (!sim) return

    sim.start()

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const nextRect = canvas.getBoundingClientRect()
        canvas.width = Math.max(1, Math.round(nextRect.width * dpr))
        canvas.height = Math.max(1, Math.round(nextRect.height * dpr))
        sim.resize()
      }, RESIZE_DEBOUNCE_MS)
    }
    window.addEventListener('resize', handleResize)

    const handleVisibilityChange = () => {
      if (document.hidden) sim.stop()
      else sim.start()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) sim.start()
        else sim.stop()
      },
      { threshold: 0 }
    )
    intersectionObserver.observe(canvas)

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      intersectionObserver.disconnect()
      sim.dispose()
    }
  }, [])

  return <Canvas ref={canvasRef} />
}
