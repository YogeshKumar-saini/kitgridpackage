interface DotPatternSvgProps {
  id: string
  gap: number
  radius: number
  className: string
}

/** One dot per cell, centred so the pattern tiles symmetrically from any edge. */
export const DotPatternSvg = ({ id, gap, radius, className }: DotPatternSvgProps) => (
  <svg className={className} width="100%" height="100%" aria-hidden="true">
    <defs>
      <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
        <circle cx={gap / 2} cy={gap / 2} r={radius} fill="currentColor" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
)
