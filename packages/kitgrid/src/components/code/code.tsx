import { forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

const codeVariants = variants({
  base: [
    "kg-code rounded-kg-sm border px-[0.38em] py-[0.1em] font-kg-mono text-[0.86em] font-medium leading-[1.4]",
    "text-kg-fg box-decoration-clone",
  ],
  variants: {
    tone: {
      neutral: "border-kg-border bg-kg-muted",
      accent: "border-kg-ink bg-kg-paper-sage",
    },
    nowrap: {
      true: "whitespace-nowrap [overflow-wrap:normal]",
      false: "[overflow-wrap:anywhere]",
    },
  },
  defaults: { tone: "neutral", nowrap: false },
})

export type CodeTone = NonNullable<VariantProps<typeof codeVariants>["tone"]>

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  tone?: CodeTone
  /** Keeps the snippet on one line. */
  nowrap?: boolean
}

/** Inline code: a mono run on a soft paper chip that scales with the text around it. */
export const Code = forwardRef<HTMLElement, CodeProps>(
  ({ tone = "neutral", nowrap = false, className, ...props }, ref) => (
    <code
      ref={ref}
      className={codeVariants({ tone, nowrap, className })}
      data-tone={tone}
      data-nowrap={nowrap || undefined}
      {...props}
    />
  ),
)

Code.displayName = "Code"
