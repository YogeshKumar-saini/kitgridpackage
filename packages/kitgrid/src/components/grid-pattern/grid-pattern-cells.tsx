"use client"

import { type CSSProperties, useEffect, useRef } from "react"
import { createRandom, round } from "../aurora/internal/random.js"

interface GridPatternCellsProps {
  size: number
  inset: number
  count: number
  duration: number
  seed: number
}

// The server cannot measure, so first placement assumes a typical hero and is corrected on mount.
const ASSUMED_COLUMNS = 32
const ASSUMED_ROWS = 14

/**
 * Cells flash on a CSS loop. Each time a cell's loop restarts (fully transparent) it jumps to a
 * fresh random cell, written straight to the DOM so the grid never re-renders.
 */
export const GridPatternCells = ({
  size,
  inset,
  count,
  duration,
  seed,
}: GridPatternCellsProps) => {
  const ref = useRef<SVGGElement>(null)
  const bounds = useRef({ columns: ASSUMED_COLUMNS, rows: ASSUMED_ROWS })
  const next = useRef<(() => number) | null>(null)

  const random = createRandom(seed)
  const total = Math.max(Math.round(count), 0)
  const span = Math.max(size - inset, 0)
  const cells = Array.from({ length: total }, (_, index) => {
    const column = Math.floor(random() * ASSUMED_COLUMNS)
    const row = Math.floor(random() * ASSUMED_ROWS)
    const delay = round(random() * duration * 1.5, 2)
    const length = round(duration * (0.7 + random() * 0.6), 2)
    return (
      <rect
        key={index}
        className="kg-grid-pattern__cell fill-[var(--_fill)] opacity-70"
        x={column * size + inset}
        y={row * size + inset}
        width={span}
        height={span}
        data-column={column}
        data-row={row}
        style={
          {
            animationDelay: `${delay}s`,
            animationDuration: `${length}s`,
          } as CSSProperties
        }
      />
    )
  })

  const place = (rect: SVGElement) => {
    const group = ref.current
    if (!group) return
    next.current ??= createRandom(seed + 1)
    const { columns, rows } = bounds.current
    const taken = new Set<string>()
    for (const other of Array.from(group.children) as SVGElement[]) {
      if (other !== rect) taken.add(`${other.dataset.column}:${other.dataset.row}`)
    }
    let column = 0
    let row = 0
    for (let attempt = 0; attempt < 6; attempt++) {
      column = Math.floor(next.current() * columns)
      row = Math.floor(next.current() * rows)
      if (!taken.has(`${column}:${row}`)) break
    }
    rect.dataset.column = String(column)
    rect.dataset.row = String(row)
    rect.setAttribute("x", String(column * size + inset))
    rect.setAttribute("y", String(row * size + inset))
  }

  useEffect(() => {
    const group = ref.current
    const svg = group?.ownerSVGElement
    if (!group || !svg) return
    const measure = () => {
      const { width, height } = svg.getBoundingClientRect()
      if (!width || !height) return
      const columns = Math.max(Math.floor(width / size), 1)
      const rows = Math.max(Math.floor(height / size), 1)
      bounds.current = { columns, rows }
      for (const rect of Array.from(group.children) as SVGElement[]) {
        if (
          Number(rect.dataset.column) >= columns ||
          Number(rect.dataset.row) >= rows
        ) {
          place(rect)
        }
      }
    }
    const handleIteration = (event: Event) => {
      const target = event.target as SVGElement
      if (target.classList.contains("kg-grid-pattern__cell")) place(target)
    }

    measure()
    group.addEventListener("animationiteration", handleIteration)
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    observer?.observe(svg)
    return () => {
      group.removeEventListener("animationiteration", handleIteration)
      observer?.disconnect()
    }
  }, [size, inset, seed])

  return (
    <g ref={ref} className="kg-grid-pattern__cells">
      {cells}
    </g>
  )
}
