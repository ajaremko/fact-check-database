'use client'

import { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { clamp } from './clamp'
import { createFluidSim } from './createFluidSim'

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`

const MAX_DEVICE_PIXEL_RATIO = 2
const RESIZE_DEBOUNCE_MS = 200
const PARALLAX_FACTOR = 0.7 // fraction of scroll speed the background trails at
const PARALLAX_MAX_OFFSET = 1000 // px, clamps the shift at scroll extremes

type FluidBackgroundProps = {
  maxDevicePixelRatio?: number
  resizeDebounceMs?: number
  parallaxFactor?: number
  parallaxMaxOffset?: number
}

export function FluidBackground({
  maxDevicePixelRatio = MAX_DEVICE_PIXEL_RATIO,
  resizeDebounceMs = RESIZE_DEBOUNCE_MS,
  parallaxFactor = PARALLAX_FACTOR,
  parallaxMaxOffset = PARALLAX_MAX_OFFSET,
}: FluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReducedMotion) return

    const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))

    const sim = createFluidSim(canvas)
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
      }, resizeDebounceMs)
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

    let parallaxRafHandle: number | null = null
    let ticking = false
    const updateParallax = () => {
      ticking = false
      const heroTop = canvas.parentElement?.getBoundingClientRect().top ?? 0
      const offset = clamp(
        -heroTop * parallaxFactor,
        -parallaxMaxOffset,
        parallaxMaxOffset
      )
      canvas.style.transform = `translateY(${offset}px)`
    }
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      parallaxRafHandle = requestAnimationFrame(updateParallax)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    updateParallax()

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      if (parallaxRafHandle !== null) cancelAnimationFrame(parallaxRafHandle)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      intersectionObserver.disconnect()
      sim.dispose()
    }
  }, [])

  return <Canvas ref={canvasRef} />
}
