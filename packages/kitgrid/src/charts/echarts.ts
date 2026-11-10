// Aliased so lint rules don't mistake the registration call for a React hook.
import { init as initChart, use as register } from "echarts/core"
import {
  BarChart,
  BoxplotChart,
  CandlestickChart,
  CustomChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  ParallelChart,
  PictorialBarChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  ThemeRiverChart,
  TreeChart,
  TreemapChart,
} from "echarts/charts"
import {
  CalendarComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  ParallelComponent,
  PolarComponent,
  RadarComponent,
  SingleAxisComponent,
  TooltipComponent,
  VisualMapContinuousComponent,
} from "echarts/components"
// ECharts 6 ignores `grid.containLabel` unless LegacyGridContainLabel is registered.
import { LabelLayout, LegacyGridContainLabel } from "echarts/features"
import { CanvasRenderer } from "echarts/renderers"

let registered = false

/**
 * Registers only what these charts draw, on first use. Calling it from `init` keeps it reachable,
 * so bundlers honouring the package's `sideEffects` list never drop it from production builds.
 */
const ensureRegistered = () => {
  if (registered) return
  registered = true
  register([
    BarChart,
    BoxplotChart,
    CandlestickChart,
    CustomChart,
    FunnelChart,
    GaugeChart,
    GraphChart,
    HeatmapChart,
    LineChart,
    ParallelChart,
    PictorialBarChart,
    PieChart,
    RadarChart,
    SankeyChart,
    ScatterChart,
    SunburstChart,
    ThemeRiverChart,
    TreeChart,
    TreemapChart,
    CalendarComponent,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    MarkPointComponent,
    ParallelComponent,
    PolarComponent,
    RadarComponent,
    SingleAxisComponent,
    TooltipComponent,
    VisualMapContinuousComponent,
    LabelLayout,
    LegacyGridContainLabel,
    CanvasRenderer,
  ])
}

export const init: typeof initChart = (...args) => {
  ensureRegistered()
  return initChart(...args)
}
export type { EChartsType } from "echarts/core"
export type { EChartsOption } from "echarts"
