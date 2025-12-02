<template>
  <div class="voronoi-bg-wrapper">
    <svg ref="svgRef" class="voronoi-bg" width="100%" height="100%" />
    <div class="voronoi-gradient bg-gradient-to-b from-background to-muted/30" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Delaunay } from 'd3-delaunay'

const svgRef = ref<SVGSVGElement | null>(null)
let animationFrameId: number | null = null
let resizeHandler: (() => void) | null = null

const numSites = 10
const sites: Array<{ x: number; y: number; vx: number; vy: number }> = []

onMounted(() => {
  const svg = svgRef.value
  if (!svg) {
    console.error('VoronoiBackground: SVG ref not found')
    return
  }

  console.log('VoronoiBackground: Initializing animation')
  const ns = 'http://www.w3.org/2000/svg'
  let width = window.innerWidth
  let height = window.innerHeight

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  resizeHandler = resize
  resize()
  window.addEventListener('resize', resize)

  const edgePath = document.createElementNS(ns, 'path')
  edgePath.setAttribute('stroke', '#22c55e')
  edgePath.setAttribute('stroke-width', '1.5')
  edgePath.setAttribute('fill', 'none')
  edgePath.setAttribute('opacity', '0.6')
  svg.appendChild(edgePath)

  const dotGroup = document.createElementNS(ns, 'g')
  svg.appendChild(dotGroup)

  for (let i = 0; i < numSites; i++) {
    sites.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    })
    const circle = document.createElementNS(ns, 'circle')
    circle.setAttribute('r', '2.5')
    circle.setAttribute('fill', '#22c55e')
    circle.setAttribute('opacity', '0.8')
    dotGroup.appendChild(circle)
  }

  const updateDots = () => {
    const circles = dotGroup.children
    for (let i = 0; i < numSites; i++) {
      ;(circles[i] as SVGCircleElement).setAttribute('cx', String(sites[i].x))
      ;(circles[i] as SVGCircleElement).setAttribute('cy', String(sites[i].y))
    }
  }

  const animate = () => {
    try {
      sites.forEach((site) => {
        site.x += site.vx
        site.y += site.vy
        if (site.x < 0 || site.x > width) site.vx *= -1
        if (site.y < 0 || site.y > height) site.vy *= -1
      })

      const points = sites.map((s) => [s.x, s.y])
      const delaunay = Delaunay.from(points)
      const voronoi = delaunay.voronoi([0, 0, width, height])

      edgePath.setAttribute('d', voronoi.render())
      updateDots()

      animationFrameId = requestAnimationFrame(animate)
    } catch (error) {
      console.error('VoronoiBackground: Animation error', error)
    }
  }

  animate()
  console.log('VoronoiBackground: Animation started')
})

onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style>
.voronoi-bg-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}

.voronoi-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.voronoi-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
</style>
