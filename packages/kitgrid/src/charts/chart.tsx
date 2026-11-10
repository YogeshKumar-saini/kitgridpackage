"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useReducedMotion } from "../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../utils/compose-refs.js"
import { cx } from "../utils/cx.js"
import { type EChartsOption, type EChartsType, init } from "./echarts.js"
import { themeOption } from "./option-parts.js"
import { type ChartTokens, readChartTokens, tokenSignature } from "./tokens.js"

export type ChartOptionBuilder = (tokens: ChartTokens, width: number) => EChartsOption

export interface ChartSummary {
  caption?: string
  columns: string[]
  rows: (string | number | null)[][]
}

export interface ChartProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** A raw ECharts option, or a builder that receives the live theme and the plot width. */
  option: EChartsOption | ChartOptionBuilder
  /** Names the chart for assistive tech. */
  label: string
  /** Number in px or any CSS length. */
  height?: number | string
  /** A visually hidden table of the plotted data, announced with the chart. */
  summary?: ChartSummary
  /** Rendered instead of the canvas, for a chart with nothing to plot. */
  empty?: ReactNode
  /** Called with the ECharts instance once it exists. Return a cleanup to unbind events. */
  onInit?: (instance: EChartsType) => void | (() => void)
}

/** Props every data-first chart shares. */
export interface ChartCommonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "color"
> {
  /** Names the chart for assistive tech. */
  label?: string
  height?: number | string
  /** Adds a visually hidden table of the data. On by default. */
  summary?: boolean
  /** Shown instead of the chart when there is no data. */
  empty?: ReactNode
}

/**
 * Keeps a spec referentially stable while its serializable content and functions are
 * unchanged, so inline `data={[...]}` does not replay the chart on every parent render.
 */
export const useStableSpec = <T extends object>(spec: T, ...functions: unknown[]): T =>
  useMemo(() => spec, [JSON.stringify(spec), ...functions])

// Width is quantised so dragging a window edge rebuilds the option on real resizes only.
const STEP = 8
const WATCHED = ["class", "style", "data-theme", "data-kg-scope"]
const SUMMARY_ROWS = 60

const Summary = ({ id, summary }: { id: string; summary: ChartSummary }) => (
  <table id={id} className="kg-visually-hidden">
    {summary.caption ? <caption>{summary.caption}</caption> : null}
    <thead>
      <tr>
        {summary.columns.map((column, index) => (
          <th key={index} scope="col">
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {summary.rows.slice(0, SUMMARY_ROWS).map((row, index) => (
        <tr key={index}>
          {row.map((cell, column) => (
            <td key={column}>{cell ?? "n/a"}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)

/**
 * The ECharts host: one canvas per chart, themed from the `--kg-*` properties in scope and
 * rebuilt when the theme, accent or size changes. Renders an empty box on the server.
 */
export const Chart = forwardRef<HTMLDivElement, ChartProps>(
  (
    { option, label, height = 280, summary, empty, onInit, className, style, ...props },
    ref,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const plot = useRef<HTMLDivElement>(null)
    const chart = useRef<EChartsType | null>(null)
    const composed = useComposedRefs(root, ref)
    const summaryId = useId()
    const reduced = useReducedMotion()
    const [tokens, setTokens] = useState<ChartTokens | null>(null)
    const [width, setWidth] = useState(0)
    const isEmpty = empty != null

    useEffect(() => {
      const scope = root.current
      const node = plot.current
      if (!scope || !node || isEmpty) return

      const instance = init(node, undefined, { renderer: "canvas" })
      chart.current = instance

      const measure = () => setWidth(Math.round(node.clientWidth / STEP) * STEP)
      // A resize can be queued before cleanup and delivered after it.
      const resizer = new ResizeObserver(() => {
        if (instance.isDisposed()) return
        instance.resize()
        measure()
      })
      resizer.observe(node)
      measure()

      // Canvas holds resolved colors, so a theme, accent or scope change must re-read them.
      // Only a real color change commits, or every unrelated style write would replay the chart.
      let signature = ""
      const read = () => {
        const next = readChartTokens(scope)
        const nextSignature = tokenSignature(next)
        if (nextSignature === signature) return
        signature = nextSignature
        setTokens(next)
      }
      read()
      const watcher = new MutationObserver(read)
      const watch = { attributes: true, attributeFilter: WATCHED }
      watcher.observe(document.documentElement, watch)
      const themed = scope.parentElement?.closest<HTMLElement>(
        "[data-theme], [data-kg-scope]",
      )
      if (themed && themed !== document.documentElement) watcher.observe(themed, watch)
      const dark = window.matchMedia("(prefers-color-scheme: dark)")
      dark.addEventListener("change", read)

      return () => {
        resizer.disconnect()
        watcher.disconnect()
        dark.removeEventListener("change", read)
        instance.dispose()
        chart.current = null
      }
    }, [isEmpty])

    useEffect(() => {
      const instance = chart.current
      if (!instance || !onInit) return
      const detach = onInit(instance)
      return () => {
        if (!instance.isDisposed()) detach?.()
      }
    }, [onInit, isEmpty])

    const resolved = useMemo(() => {
      if (!tokens || width === 0) return null
      return themeOption(
        typeof option === "function" ? option(tokens, width) : option,
        tokens,
      )
    }, [option, tokens, width])

    useEffect(() => {
      const instance = chart.current
      if (!instance || instance.isDisposed() || !resolved) return
      instance.setOption(reduced ? { ...resolved, animation: false } : resolved, {
        notMerge: true,
      })
    }, [resolved, reduced])

    const box = {
      ...style,
      "--_height": typeof height === "number" ? `${height}px` : height,
    } as CSSProperties

    return (
      <div
        ref={composed}
        className={cx("kg-chart", className)}
        style={box}
        data-empty={isEmpty || undefined}
        {...props}
      >
        {isEmpty ? (
          // Keyed apart from the plot: dispose() wipes the innerHTML of the node ECharts owns.
          <div key="empty" className="kg-chart__empty" role="note" aria-label={label}>
            {empty}
          </div>
        ) : (
          <div
            key="plot"
            ref={plot}
            className="kg-chart__plot"
            role="img"
            aria-label={label}
            aria-busy={resolved ? undefined : true}
            data-state={resolved ? "ready" : "loading"}
            aria-describedby={summary ? summaryId : undefined}
          />
        )}
        {summary && !isEmpty ? <Summary id={summaryId} summary={summary} /> : null}
      </div>
    )
  },
)

Chart.displayName = "Chart"
