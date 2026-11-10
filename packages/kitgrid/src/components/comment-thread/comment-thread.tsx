"use client"

import {
  type FormEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Avatar } from "../avatar/avatar.js"

export interface CommentThreadComment {
  id: string
  author: string
  avatar?: string
  time: ReactNode
  dateTime?: string
  body: ReactNode
  /** e.g. a ReactionsBar. */
  footer?: ReactNode
  replies?: readonly CommentThreadComment[]
}

export interface CommentThreadLabels {
  reply?: string
  cancel?: string
  send?: string
  placeholder?: string
  /** Receives the reply count. */
  hide?: (count: number) => string
  show?: (count: number) => string
}

export interface CommentThreadProps extends HTMLAttributes<HTMLDivElement> {
  comments: readonly CommentThreadComment[]
  /** Enables Reply. Called with the parent id and trimmed text. */
  onReply?: (parentId: string, body: string) => void
  /** Replies deeper than this nest no further: they reply to the last level. */
  maxDepth?: number
  labels?: CommentThreadLabels
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"

const linkClass = cx(
  "kg-comment-thread__link cursor-pointer rounded-kg-xs border-0 bg-transparent p-0 font-[inherit] text-kg-xs font-semibold text-kg-fg-muted underline-offset-2",
  "interactive:hover:text-kg-fg interactive:hover:underline [&[aria-expanded=true]:not([aria-controls])]:text-kg-fg",
  focusRing,
)

const actionVariants = variants({
  base: [
    "kg-comment-thread__action h-kg-sm cursor-pointer rounded-full border-2 px-3 font-[inherit] text-kg-xs font-semibold",
    "transition-[background-color,color] duration-(--kg-duration-fast) ease-kg-out disabled:cursor-not-allowed disabled:opacity-50",
    focusRing,
  ],
  variants: {
    primary: {
      true: "border-kg-ink bg-kg-accent text-kg-accent-fg interactive:hover:bg-kg-accent-hover",
      false:
        "border-transparent bg-transparent text-kg-fg-muted interactive:hover:bg-kg-muted interactive:hover:text-kg-fg",
    },
  },
  defaults: { primary: false },
})

/* Paper Layers: replies hang off an ink rail that drops from the parent and curls into each reply. */
const railClass =
  "before:absolute before:start-[0.9375rem] before:top-[calc(var(--kg-space)*-2)] before:bottom-3 before:w-[2px] before:rounded-full before:bg-kg-ink before:content-['']"

const curlClass = [
  "relative before:absolute before:-top-1 before:start-[calc(var(--kg-space)*-10+0.9375rem)] before:h-[0.9375rem]",
  "before:w-[calc(var(--kg-space)*10-1.25rem)] before:rounded-es-[0.625rem] before:border-s-2 before:border-b-2 before:border-kg-ink before:content-['']",
]

const words: Required<CommentThreadLabels> = {
  reply: "Reply",
  cancel: "Cancel",
  send: "Send",
  placeholder: "Write a reply",
  hide: (count) => `Hide ${count} ${count === 1 ? "reply" : "replies"}`,
  show: (count) => `Show ${count} ${count === 1 ? "reply" : "replies"}`,
}

interface NodeProps {
  comment: CommentThreadComment
  depth: number
  maxDepth: number
  t: Required<CommentThreadLabels>
  onReply?: (parentId: string, body: string) => void
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  parentId?: string
}

const Composer = ({
  t,
  onSubmit,
  onCancel,
  label,
}: {
  t: Required<CommentThreadLabels>
  onSubmit: (text: string) => void
  onCancel: () => void
  label: string
}) => {
  const [text, setText] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => ref.current?.focus(), [])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (text.trim()) onSubmit(text.trim())
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className={cx(
        "kg-comment-thread__composer mt-2 grid origin-top gap-2 rounded-kg-md border-2 border-kg-ink bg-kg-surface p-2 shadow-kg-xs",
        "transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
      )}
      onSubmit={submit}
    >
      <textarea
        ref={ref}
        rows={2}
        className="min-h-14 w-full resize-y border-0 bg-transparent p-1 font-[inherit] text-kg-sm text-kg-fg outline-none placeholder:text-kg-fg-faint"
        aria-label={label}
        placeholder={t.placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="kg-comment-thread__composer-actions flex justify-end gap-1.5">
        <button type="button" className={actionVariants()} onClick={onCancel}>
          {t.cancel}
        </button>
        <button
          type="submit"
          className={actionVariants({ primary: true })}
          data-primary=""
          disabled={!text.trim()}
        >
          {t.send}
        </button>
      </div>
    </form>
  )
}

const CommentNode = ({
  comment,
  depth,
  maxDepth,
  t,
  onReply,
  replyingTo,
  setReplyingTo,
  parentId,
}: NodeProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const repliesId = useId()
  const replies = comment.replies ?? []
  const target = depth >= maxDepth && parentId ? parentId : comment.id
  const replyButton = useRef<HTMLButtonElement>(null)

  return (
    <li
      className={cx("kg-comment-thread__node", depth > 0 && curlClass)}
      data-depth={depth}
    >
      <article
        className="kg-comment-thread__comment grid grid-cols-[auto_minmax(0,1fr)] gap-2.5"
        aria-label={comment.author}
      >
        <Avatar
          className="kg-comment-thread__avatar"
          size={depth === 0 ? "sm" : "xs"}
          name={comment.author}
          src={comment.avatar}
          aria-hidden="true"
        />
        <div className="kg-comment-thread__main grid min-w-0 gap-1">
          <header className="kg-comment-thread__meta flex items-baseline gap-2">
            <span className="kg-comment-thread__author text-kg-sm font-semibold text-kg-fg">
              {comment.author}
            </span>
            <time
              className="kg-comment-thread__time text-kg-xs text-kg-fg-faint"
              dateTime={comment.dateTime}
            >
              {comment.time}
            </time>
          </header>
          <div className="kg-comment-thread__body text-kg-sm leading-[1.55] text-kg-fg-muted [overflow-wrap:anywhere] [&>p]:m-0">
            {comment.body}
          </div>
          {(comment.footer != null || onReply || replies.length > 0) && (
            <div className="kg-comment-thread__footer mt-0.5 flex flex-wrap items-center gap-3">
              {comment.footer}
              {onReply && (
                <button
                  ref={replyButton}
                  type="button"
                  className={linkClass}
                  aria-expanded={replyingTo === comment.id}
                  onClick={() =>
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                  }
                >
                  {t.reply}
                </button>
              )}
              {replies.length > 0 && (
                <button
                  type="button"
                  className={linkClass}
                  aria-expanded={!collapsed}
                  aria-controls={repliesId}
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? t.show(replies.length) : t.hide(replies.length)}
                </button>
              )}
            </div>
          )}
          {replyingTo === comment.id && onReply && (
            <Composer
              t={t}
              label={`${t.reply} to ${comment.author}`}
              onCancel={() => {
                setReplyingTo(null)
                replyButton.current?.focus()
              }}
              onSubmit={(text) => {
                onReply(target, text)
                setReplyingTo(null)
                setCollapsed(false)
              }}
            />
          )}
        </div>
      </article>
      {replies.length > 0 && (
        <ol
          id={repliesId}
          className={cx(
            "kg-comment-thread__replies relative m-0 mt-3 grid list-none gap-3 p-0 ps-10 [&[hidden]]:hidden",
            railClass,
          )}
          hidden={collapsed}
        >
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
              t={t}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              parentId={depth + 1 >= maxDepth ? target : comment.id}
            />
          ))}
        </ol>
      )}
    </li>
  )
}

/** A discussion with nested replies on a rail, inline reply boxes and collapsible branches. */
export const CommentThread = forwardRef<HTMLDivElement, CommentThreadProps>(
  ({ comments, onReply, maxDepth = 3, labels, className, ...props }, ref) => {
    const t = { ...words, ...labels }
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    return (
      <div ref={ref} className={cx("kg-comment-thread min-w-0", className)} {...props}>
        <ol className="kg-comment-thread__root m-0 grid list-none gap-4 p-0">
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              depth={0}
              maxDepth={maxDepth}
              t={t}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </ol>
      </div>
    )
  },
)

CommentThread.displayName = "CommentThread"
