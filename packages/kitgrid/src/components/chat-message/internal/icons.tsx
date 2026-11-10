import type { ReactNode, SVGProps } from "react"

const Icon = ({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
)

type P = SVGProps<SVGSVGElement>

export const CopyIcon = (props: P) => (
  <Icon {...props}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Icon>
)

export const CheckIcon = (props: P) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)

export const RetryIcon = (props: P) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
)

export const SparkleIcon = (props: P) => (
  <Icon {...props}>
    <path d="M12 3c.4 4.6 2.4 6.6 7 7-4.6.4-6.6 2.4-7 7-.4-4.6-2.4-6.6-7-7 4.6-.4 6.6-2.4 7-7Z" />
    <path d="M19 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z" />
  </Icon>
)

export const ChevronIcon = (props: P) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const SendIcon = (props: P) => (
  <Icon {...props}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </Icon>
)

export const AlertIcon = (props: P) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5" />
    <path d="M12 16.5h.01" />
  </Icon>
)

export const SpinnerIcon = (props: P) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-6.2-8.56" />
  </Icon>
)

export const DotIcon = (props: P) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
  </Icon>
)

export const SunIcon = (props: P) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const MoonIcon = (props: P) => (
  <Icon {...props}>
    <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a7 7 0 0 0 10.6 10.6Z" />
  </Icon>
)

export const MonitorIcon = (props: P) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
)

export const PlusIcon = (props: P) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const ArrowDownIcon = (props: P) => (
  <Icon {...props}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Icon>
)
