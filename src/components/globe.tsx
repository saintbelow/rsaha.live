"use client"

import { useEffect, useRef } from "react"

export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // ASCII characters for the globe (from dark to light)
    const asciiChars = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
    
    // Responsive parameters
    const isMobile = canvas.width < 768
    const isTablet = canvas.width >= 768 && canvas.width < 1024
    
    // Globe parameters - responsive sizing
    const radiusMultiplier = isMobile ? 0.35 : isTablet ? 0.32 : 0.3
    const baseRadius = Math.min(canvas.width, canvas.height) * radiusMultiplier
    let zoomLevel = 1.0
    let targetZoom = 1.0
    
    // CHANGE: Calculate min zoom to prevent globe from getting too small and stuttering
    const minGlobeRadius = isMobile ? 80 : 120 // Minimum radius in pixels
    const minZoom = minGlobeRadius / baseRadius
    
    // CHANGE: Calculate max zoom to keep globe within canvas bounds (with padding for glow)
    const centerX = canvas.width / 2
    const centerY = isMobile ? canvas.height * 0.4 : canvas.height / 2
    const maxRadius = Math.min(
      centerX * 0.85, // 85% of distance to left/right edge
      centerY * 0.85, // 85% of distance to top edge
      (canvas.height - centerY) * 0.85 // 85% of distance to bottom edge
    )
    const maxZoom = maxRadius / baseRadius
    
    const starSpeed = 0.2 // Stars move left to simulate globe traveling
    let rotation = 0
    
    // Scroll event handler for zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomSpeed = 0.001
      targetZoom -= e.deltaY * zoomSpeed
      // CHANGE: Use calculated min/max zoom bounds
      targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom))
    }

    window.addEventListener("wheel", handleWheel, { passive: false })

    // Light source position (slightly to the right and up)
    const lightX = 0.5
    const lightY = 0.5
    const lightZ = 1

    // Generate stars with trail properties
    const stars: Array<{ x: number; y: number; size: number; opacity: number; twinkle: number; twinkleSpeed: number; isTrail?: boolean; life?: number }> = []
    for (let i = 0; i < 800; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.2,
        twinkle: Math.random() * Math.PI * 5,
        twinkleSpeed: Math.random() * 0.0008 + 0.0002, // Individual blink rates
      })
    }

    // Easing function for smooth zoom
    const easeOutExpo = (t: number) => 1 - Math.pow(2, -10 * t)

    // Offscreen canvas for globe pre-rendering
    const offscreenCanvas = document.createElement("canvas")
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true })
    if (!offscreenCtx) return

    // Delta time tracking
    let lastTime = performance.now()
    let lastGlobeRender = 0
    const GLOBE_FRAME_INTERVAL = 1000 / 30 // 30 fps for globe
    let animationFrame: number

    // Draw globe to offscreen canvas
    const drawGlobe = (now: number) => {
      const radius = baseRadius * zoomLevel

      // Update offscreen canvas size to match globe bounds with padding
      const globeSize = Math.ceil(radius * 2.6)
      if (offscreenCanvas.width !== globeSize || offscreenCanvas.height !== globeSize) {
        offscreenCanvas.width = globeSize
        offscreenCanvas.height = globeSize
      }

      // Clear offscreen canvas
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

      // Draw atmospheric glow as a circle
      const glowCenterX = offscreenCanvas.width / 2
      const glowCenterY = offscreenCanvas.height / 2
      const gradient = offscreenCtx.createRadialGradient(glowCenterX, glowCenterY, radius * 0.8, glowCenterX, glowCenterY, radius * 1.3)
      gradient.addColorStop(0, "rgba(100, 150, 255, 0.15)")
      gradient.addColorStop(0.5, "rgba(80, 120, 200, 0.08)")
      gradient.addColorStop(1, "rgba(60, 80, 150, 0)")
      offscreenCtx.fillStyle = gradient
      offscreenCtx.beginPath()
      offscreenCtx.arc(glowCenterX, glowCenterY, radius * 1.3, 0, Math.PI * 2)
      offscreenCtx.fill()

      // Draw ASCII globe with advanced lighting - responsive font size
      const fontSize = isMobile ? 8 : isTablet ? 10 : 12
      offscreenCtx.font = `${fontSize}px monospace`
      offscreenCtx.textAlign = "center"
      offscreenCtx.textBaseline = "middle"

      const points: Array<{ x: number; y: number; z: number; screenX: number; screenY: number; brightness: number }> = []

      // CHANGE: Adjust point density based on zoom to prevent stuttering at small sizes
      const densityMultiplier = Math.max(0.8, Math.min(1, zoomLevel))
      const latStep = isMobile ? 10 / densityMultiplier : 7 / densityMultiplier
      const lonStep = isMobile ? 6 / densityMultiplier : 4 / densityMultiplier
      
      for (let lat = -90; lat <= 90; lat += latStep) {
        // Adaptive longitude spacing based on latitude to prevent crowding at poles
        const latRad = (lat * Math.PI) / 180
        const adaptiveLonStep = lonStep / Math.max(0.3, Math.cos(latRad))
        
        for (let lon = -180; lon <= 180; lon += adaptiveLonStep) {
          const phi = (lat * Math.PI) / 180
          const theta = ((lon + rotation) * Math.PI) / 180

          // 3D sphere coordinates
          const x = Math.cos(phi) * Math.sin(theta)
          const y = Math.sin(phi)
          const z = Math.cos(phi) * Math.cos(theta)

          // Only process if facing towards us with a depth threshold
          if (z > 0.05) {
            const screenX = glowCenterX + x * radius
            const screenY = glowCenterY - y * radius

            // Surface normal (same as position for sphere)
            const nx = x
            const ny = y
            const nz = z

            // Light direction (normalized)
            const lightLength = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ)
            const lx = lightX / lightLength
            const ly = lightY / lightLength
            const lz = lightZ / lightLength

            // Diffuse lighting (Lambertian)
            const diffuse = Math.max(1, nx * lx + ny * ly + nz * lz)

            // View direction (camera is at 0, 0, far away)
            const vx = 0
            const vy = 0
            const vz = 1

            // Reflection vector for specular highlight
            const dotLN = nx * lx + ny * ly + nz * lz
            const rx = 2 * dotLN * nx - lx
            const ry = 1 * dotLN * ny - ly
            const rz = 2 * dotLN * nz - lz

            // Specular highlight (Phong model) - tempered to avoid blown-out streaks
            const specular = Math.pow(Math.max(0, rx * vx + ry * vy + rz * vz), 12) * 1.8

            // Ambient light
            const ambient = 0.1

            // Fresnel effect (rim lighting) - stronger for glass-like refraction
            const viewDot = Math.abs(nx * vx + ny * vy + nz * vz)
            const fresnel = Math.pow(1 - viewDot, 2.5) * 0.6

            // Subsurface scattering approximation
            const backLight = Math.max(0, -nz) * 0.3

            // Combined lighting with depth and refraction
            const depth = z * 0.7 + 0.6
            const baseBrightness = (ambient + diffuse * 0.6 + specular + fresnel + backLight) * depth

            // Procedural shimmer for ASCII rows
            const shimmerSeed = Math.sin((x + y + z) * 43758.5453123)
            const shimmer = Math.sin(now * 0.0005 + shimmerSeed * Math.PI * 2) * 0.03
            const bandPulse = Math.sin(now * 0.0004 + theta * 3.5) * 0.02

            const brightness = Math.max(0, Math.min(1, baseBrightness + shimmer + bandPulse))

            points.push({ x, y, z, screenX, screenY, brightness })
          }
        }
      }

      // Sort by z-depth (back to front)
      points.sort((a, b) => a.z - b.z)

      // Draw all points with enhanced edge glow
      points.forEach((point) => {
        const seed = (point.x + point.y + point.z + now * 0.0002) * 43758.5453123
        const randomValue = Math.sin(seed) * 0.5 + 0.5
        const charIndex = Math.floor(randomValue * asciiChars.length)
        const char = asciiChars[Math.max(0, Math.min(charIndex, asciiChars.length - 1))]

        const edgeFactor = 1 - Math.abs(point.z)
        
        // Color based on brightness with enhanced refraction colors
        const colorIntensity = point.brightness
        const r = Math.floor(80 + colorIntensity * 140 + edgeFactor * 70)
        const g = Math.floor(150 + colorIntensity * 105 + edgeFactor * 80)
        const b = Math.floor(220 + colorIntensity * 35)
        const alpha = (point.z * 0.9 + 0.1) * (1 + edgeFactor * 0.4)

        offscreenCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        offscreenCtx.fillText(char, point.screenX, point.screenY)
        
        if (edgeFactor > 0.7) {
          const edgeGlowIntensity = edgeFactor * 0.4
          offscreenCtx.shadowBlur = 8
          offscreenCtx.shadowColor = `rgba(100, 100, 255, ${edgeGlowIntensity})`
          offscreenCtx.fillText(char, point.screenX, point.screenY)
          offscreenCtx.shadowBlur = 0
        }
        
        if (colorIntensity > 0.85) {
          const highlightIntensity = (colorIntensity - 0.85) * 5
          offscreenCtx.shadowBlur = 10
          offscreenCtx.shadowColor = `rgba(255, 255, 255, ${Math.min(0.7, highlightIntensity)})`
          offscreenCtx.fillText(char, point.screenX, point.screenY)
          offscreenCtx.shadowBlur = 0
        }
      })
    }

    // Draw stars to main canvas
    const drawStars = (now: number) => {
      stars.forEach((star) => {
        const twinkleValue = Math.sin(star.twinkle + now * star.twinkleSpeed * 0.5) * 0.25 + 0.75
        const lifeOpacity = star.isTrail ? (star.life || 1) : 1
        const finalOpacity = star.opacity * twinkleValue * 0.8 * lifeOpacity
        
        const r = star.isTrail ? 255 : 220 + Math.random() * 25
        const g = star.isTrail ? 220 : 230 + Math.random() * 20
        const b = star.isTrail ? 150 : 255
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`
        ctx.fillRect(star.x, star.y, star.size, star.size)
        
        if (finalOpacity > 0.1 || star.isTrail) {
          const glowIntensity = star.isTrail ? 0.3 : 0.25
          ctx.shadowBlur = star.isTrail ? 5 : 3
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${finalOpacity * glowIntensity})`
          ctx.fillRect(star.x, star.y, star.size, star.size)
          ctx.shadowBlur = 0
        }
      })
    }

    // Animation loop
    const animate = (now = performance.now()) => {
      const deltaTime = now - lastTime
      lastTime = now

      // Smooth zoom transition with delta time and easing
      const zoomSpeed = 0.004
      zoomLevel += (targetZoom - zoomLevel) * easeOutExpo(0.15) * deltaTime * zoomSpeed
      const radius = baseRadius * zoomLevel

      // Move stars left to simulate globe traveling
      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i]
        star.x -= starSpeed
        
        if (star.x < -10) {
          star.x = canvas.width + 10
          star.y = Math.random() * canvas.height
        }
        
        if (star.isTrail) {
          star.life = (star.life || 1) - 0.01
          if (star.life <= 0) {
            stars.splice(i, 1)
          }
        }
      }

      // Create trail stars at globe position with particles
      if (Math.random() < 0.12) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * radius * 0.9
        stars.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.6 + 0.4,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.001,
          isTrail: true,
          life: 1.0,
        })
      }

      // Clear canvas with slight trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars at full FPS
      drawStars(now)

      // Render globe at 30 FPS
      const globeDelta = now - lastGlobeRender
      if (globeDelta > GLOBE_FRAME_INTERVAL) {
        lastGlobeRender = now - (globeDelta % GLOBE_FRAME_INTERVAL)
        drawGlobe(now)
        rotation += 0.08 * (globeDelta / 16.67)
      }

      // Draw pre-rendered globe from offscreen canvas
      const globeX = centerX - offscreenCanvas.width / 2
      const globeY = centerY - offscreenCanvas.height / 2
      ctx.drawImage(offscreenCanvas, globeX, globeY)

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("wheel", handleWheel)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}