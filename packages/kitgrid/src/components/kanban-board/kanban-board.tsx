"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

export interface KanbanBoardColumn {
  id: string
  title: ReactNode
  /** Work-in-progress limit; the count turns to a warning past it. */
  limit?: number
  /** Accent for the column marker: any CSS color. */
  color?: string
}

export interface KanbanBoardCard {
  id: string
  column: string
  title: string
  /** Secondary content under the title: tags, avatars, dates. */
  meta?: ReactNode
}

export interface KanbanBoardLabels {
  instructions?: string
  pickedUp?: (card: string, column: string, position: number, total: number) => string
  moved?: (card: string, column: string, position: number, total: number) => string
  dropped?: (card: string, column: string, position: number) => string
  cancelled?: (card: string) => string
  empty?: string
}

export interface KanbanBoardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  columns: KanbanBoardColumn[]
  cards?: KanbanBoardCard[]
  defaultCards?: KanbanBoardCard[]
  /** Fires once per completed move, with every card in its new order. */
  onCardsChange?: (cards: KanbanBoardCard[]) => void
  /** Replaces the default card body. */
  renderCard?: (card: KanbanBoardCard) => ReactNode
  /** Accessible name for the board. */
  label?: string
  labels?: KanbanBoardLabels
}

const defaults: Required<KanbanBoardLabels> = {
  instructions:
    "Press Space to pick up. Arrow keys move it, Space drops, Escape cancels.",
  pickedUp: (card, column, position, total) =>
    `Picked up ${card}. ${column}, position ${position} of ${total}.`,
  moved: (_card, column, position, total) => `${column}, position ${position} of ${total}.`,
  dropped: (card, column, position) => `Dropped ${card} in ${column} at position ${position}.`,
  cancelled: (card) => `Move cancelled. ${card} returned.`,
  empty: "No cards",
}

/** Moves a card to `index` within `column`, preserving everyone else's order. */
const moveCard = (
  cards: KanbanBoardCard[],
  id: string,
  column: string,
  index: number,
): KanbanBoardCard[] => {
  const card = cards.find((c) => c.id === id)
  if (!card) return cards
  const rest = cards.filter((c) => c.id !== id)
  const inColumn = rest.filter((c) => c.column === column)
  const clamped = Math.max(0, Math.min(index, inColumn.length))
  const anchor = inColumn[clamped]
  const moved = { ...card, column }
  if (anchor) {
    const at = rest.indexOf(anchor)
    return [...rest.slice(0, at), moved, ...rest.slice(at)]
  }
  const last = inColumn[inColumn.length - 1]
  const at = last ? rest.indexOf(last) + 1 : rest.length
  return [...rest.slice(0, at), moved, ...rest.slice(at)]
}

interface Drag {
  id: string
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  active: boolean
  width: number
  x: number
  y: number
}

/**
 * Columns of cards that move by pointer drag or keyboard (Space to lift, arrows to move, Space
 * to drop, Escape to cancel), with every step announced.
 */
export const KanbanBoard = forwardRef<HTMLDivElement, KanbanBoardProps>(
  (
    {
      columns,
      cards: cardsProp,
      defaultCards = [],
      onCardsChange,
      renderCard,
      label = "Board",
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const words = { ...defaults, ...labels }
    const [committed, setCommitted] = useControllableState({
      value: cardsProp,
      defaultValue: defaultCards,
      onChange: onCardsChange,
    })
    /** Working copy while a card is lifted; committed on drop, discarded on cancel. */
    const [preview, setPreview] = useState<KanbanBoardCard[] | null>(null)
    const [lifted, setLifted] = useState<string | null>(null)
    const [dragging, setDragging] = useState<string | null>(null)
    const [announcement, setAnnouncement] = useState("")
    const drag = useRef<Drag | null>(null)
    const ghost = useRef<HTMLDivElement | null>(null)
    const cardEls = useRef(new Map<string, HTMLElement>())
    const instructionsId = useId()
    const cards = preview ?? committed

    const columnOf = (id: string) => columns.find((c) => c.id === id)
    const titleOf = (id: string) => {
      const col = columnOf(id)
      return typeof col?.title === "string" ? col.title : id
    }
    const position = (list: KanbanBoardCard[], id: string) => {
      const card = list.find((c) => c.id === id)
      if (!card) return { index: 0, total: 0, column: "" }
      const siblings = list.filter((c) => c.column === card.column)
      return { index: siblings.indexOf(card), total: siblings.length, column: card.column }
    }

    useEffect(() => {
      if (lifted) cardEls.current.get(lifted)?.focus()
    }, [lifted, cards])

    const finish = (commit: boolean) => {
      const id = lifted ?? dragging
      if (id && commit && preview) {
        setCommitted(preview)
        const p = position(preview, id)
        const card = preview.find((c) => c.id === id)
        setAnnouncement(words.dropped(card?.title ?? id, titleOf(p.column), p.index + 1))
      } else if (id && !commit) {
        const card = committed.find((c) => c.id === id)
        setAnnouncement(words.cancelled(card?.title ?? id))
      }
      setPreview(null)
      setLifted(null)
      setDragging(null)
    }

    const onCardKeyDown = (event: KeyboardEvent<HTMLElement>, card: KanbanBoardCard) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault()
        if (lifted === card.id) finish(true)
        else {
          setPreview(committed)
          setLifted(card.id)
          const p = position(committed, card.id)
          setAnnouncement(words.pickedUp(card.title, titleOf(p.column), p.index + 1, p.total))
        }
        return
      }
      if (lifted !== card.id || !preview) return
      if (event.key === "Escape") {
        event.preventDefault()
        finish(false)
        return
      }
      const p = position(preview, card.id)
      const colIndex = columns.findIndex((c) => c.id === p.column)
      let next: KanbanBoardCard[] | null = null
      if (event.key === "ArrowUp") next = moveCard(preview, card.id, p.column, p.index - 1)
      else if (event.key === "ArrowDown") next = moveCard(preview, card.id, p.column, p.index + 1)
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
        const delta = (event.key === "ArrowRight") !== rtl ? 1 : -1
        const target = columns[colIndex + delta]
        if (target) next = moveCard(preview, card.id, target.id, p.index)
      } else return
      event.preventDefault()
      if (!next) return
      setPreview(next)
      const q = position(next, card.id)
      setAnnouncement(words.moved(card.title, titleOf(q.column), q.index + 1, q.total))
    }

    /** Where a pointer at (x, y) would drop: the column under it and the index among its cards. */
    const target = (x: number, y: number, id: string) => {
      const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-kanban-column]")
      const column = hit?.dataset.kanbanColumn
      if (!column || !preview) return null
      const others = preview.filter((c) => c.column === column && c.id !== id)
      let index = others.length
      for (let i = 0; i < others.length; i++) {
        const rect = cardEls.current.get((others[i] as KanbanBoardCard).id)?.getBoundingClientRect()
        if (rect && y < rect.top + rect.height / 2) {
          index = i
          break
        }
      }
      return { column, index }
    }

    const onPointerDown = (event: ReactPointerEvent<HTMLElement>, card: KanbanBoardCard) => {
      if (event.button !== 0 || lifted) return
      const rect = event.currentTarget.getBoundingClientRect()
      drag.current = {
        id: card.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        active: false,
        width: rect.width,
        x: event.clientX,
        y: event.clientY,
      }
    }

    useEffect(() => {
      const move = (event: PointerEvent) => {
        const state = drag.current
        if (!state || event.pointerId !== state.pointerId) return
        state.x = event.clientX
        state.y = event.clientY
        if (!state.active) {
          if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 5) return
          state.active = true
          setPreview(committed)
          setDragging(state.id)
        }
        const node = ghost.current
        if (node) {
          node.style.transform = `translate(${event.clientX - state.offsetX}px, ${event.clientY - state.offsetY}px) rotate(2deg)`
        }
        const spot = target(event.clientX, event.clientY, state.id)
        if (!spot) return
        setPreview((current) => {
          if (!current) return current
          const p = position(current, state.id)
          if (p.column === spot.column && p.index === spot.index) return current
          return moveCard(current, state.id, spot.column, spot.index)
        })
      }
      const up = (event: PointerEvent) => {
        const state = drag.current
        if (!state || event.pointerId !== state.pointerId) return
        drag.current = null
        if (state.active) finish(true)
      }
      const cancel = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
        if (event.key === "Escape" && drag.current?.active) {
          drag.current = null
          finish(false)
        }
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
      window.addEventListener("keydown", cancel)
      return () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        window.removeEventListener("keydown", cancel)
      }
    })

    const draggedCard = dragging ? cards.find((c) => c.id === dragging) : undefined

    return (
      <div
        ref={ref}
        role="region"
        aria-label={label}
        className={cx(
          "kg-kanban-board grid min-w-0 auto-cols-[minmax(15rem,1fr)] grid-flow-col items-stretch gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] data-dragging:cursor-grabbing data-dragging:select-none",
          className,
        )}
        data-dragging={dragging ? true : undefined}
        {...props}
      >
        <p id={instructionsId} className="kg-kanban-board__sr sr-only">
          {words.instructions}
        </p>
        {columns.map((column) => {
          const list = cards.filter((card) => card.column === column.id)
          const over = column.limit !== undefined && list.length > column.limit
          const headingId = `${instructionsId}-${column.id}`
          return (
            <section
              key={column.id}
              className="kg-kanban-board__column grid min-w-0 grid-rows-[auto_1fr] gap-2 rounded-kg-xl border-2 border-kg-ink bg-kg-surface-sunken p-2 [--_color:var(--kg-accent)]"
              aria-labelledby={headingId}
              data-kanban-column={column.id}
              style={column.color ? ({ "--_color": column.color } as CSSProperties) : undefined}
            >
              <header className="kg-kanban-board__header flex items-center gap-2 px-1.5 py-1 before:size-2 before:rounded-full before:bg-(--_color) before:shadow-[0_0_0_1.5px_var(--kg-ink)]">
                <h3 id={headingId} className="kg-kanban-board__title m-0 flex-1 text-kg-sm font-semibold text-kg-fg">
                  {column.title}
                </h3>
                <span
                  className={cx(
                    "kg-kanban-board__count rounded-full px-[0.4375rem] text-kg-xs font-semibold tabular-nums",
                    over ? "bg-kg-paper-butter text-kg-fg" : "bg-kg-muted text-kg-fg-muted",
                  )}
                  data-over={over || undefined}
                >
                  {list.length}
                  {column.limit !== undefined && `/${column.limit}`}
                </span>
              </header>
              <ul className="kg-kanban-board__list m-0 grid min-h-12 list-none content-start gap-2 p-0">
                {list.map((card) => (
                  <li
                    key={card.id}
                    ref={(element) => {
                      if (element) cardEls.current.set(card.id, element)
                      else cardEls.current.delete(card.id)
                    }}
                    className={cx(
                      "kg-kanban-board__card cursor-grab touch-none select-none",
                      "grid gap-1.5 rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-3 text-kg-sm text-kg-fg",
                      "transition-[box-shadow,translate,rotate,background-color] duration-(--kg-duration-base) ease-kg-spring",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                      lifted === card.id
                        ? "-translate-y-0.5 -rotate-1 shadow-kg-md"
                        : dragging === card.id
                          ? "border-dashed bg-transparent shadow-none [&>*]:invisible"
                          : "shadow-kg-xs hover:-translate-y-px hover:shadow-kg-sm",
                    )}
                    // biome-ignore lint/a11y/useSemanticElements: a list item that acts as a draggable button.
                    role="button"
                    tabIndex={0}
                    aria-roledescription="draggable card"
                    aria-describedby={instructionsId}
                    aria-pressed={lifted === card.id}
                    data-state={
                      lifted === card.id ? "lifted" : dragging === card.id ? "placeholder" : undefined
                    }
                    onKeyDown={(event) => onCardKeyDown(event, card)}
                    onPointerDown={(event) => onPointerDown(event, card)}
                    onBlur={(event) => {
                      // A card re-mounting in another column blurs with no related target; only
                      // a real focus move away drops it.
                      if (lifted === card.id && event.relatedTarget) finish(true)
                    }}
                  >
                    {renderCard ? (
                      renderCard(card)
                    ) : (
                      <>
                        <span className="kg-kanban-board__card-title leading-[1.4] font-semibold">{card.title}</span>
                        {card.meta != null && (
                          <span className="kg-kanban-board__card-meta flex flex-wrap items-center gap-1.5 text-kg-xs text-kg-fg-muted">{card.meta}</span>
                        )}
                      </>
                    )}
                  </li>
                ))}
                {list.length === 0 && (
                  <li className="kg-kanban-board__empty grid min-h-12 place-items-center rounded-kg-lg border-2 border-dashed border-kg-ink/40 text-kg-xs text-kg-fg-muted" aria-hidden="true">
                    {words.empty}
                  </li>
                )}
              </ul>
            </section>
          )
        })}
        {draggedCard && (
          <div
            ref={ghost}
            className="kg-kanban-board__ghost pointer-events-none fixed top-0 left-0 z-kg-overlay shadow-kg-lg will-change-transform grid gap-1.5 rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-3 text-kg-sm text-kg-fg"
            aria-hidden="true"
            style={{
              width: drag.current?.width,
              transform: drag.current
                ? `translate(${drag.current.x - drag.current.offsetX}px, ${drag.current.y - drag.current.offsetY}px) rotate(2deg)`
                : undefined,
            }}
          >
            {renderCard ? (
              renderCard(draggedCard)
            ) : (
              <>
                <span className="kg-kanban-board__card-title leading-[1.4] font-semibold">{draggedCard.title}</span>
                {draggedCard.meta != null && (
                  <span className="kg-kanban-board__card-meta flex flex-wrap items-center gap-1.5 text-kg-xs text-kg-fg-muted">{draggedCard.meta}</span>
                )}
              </>
            )}
          </div>
        )}
        <div className="kg-kanban-board__sr sr-only" role="status" aria-live="assertive">
          {announcement}
        </div>
      </div>
    )
  },
)
KanbanBoard.displayName = "KanbanBoard"
