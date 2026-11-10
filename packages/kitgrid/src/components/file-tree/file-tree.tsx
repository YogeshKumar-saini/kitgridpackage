"use client"

import { forwardRef, useMemo } from "react"
import { cx } from "../../utils/cx.js"
import { TreeView, type TreeViewNode, type TreeViewProps } from "../tree-view/tree-view.js"

export type FileTreeStatus = "added" | "modified" | "deleted" | "renamed"

export interface FileTreeProps
  extends Omit<
    TreeViewProps,
    "nodes" | "selected" | "defaultSelected" | "onSelectedChange" | "selectionMode" | "onAction"
  > {
  /** Slash-separated file paths. Folders are inferred; a trailing slash marks an empty folder. */
  paths: string[]
  /** Git-style markers shown beside files. */
  status?: Record<string, FileTreeStatus>
  /** `true` opens every folder. */
  expandAll?: boolean
  selectedPath?: string
  defaultSelectedPath?: string
  onSelectPath?: (path: string) => void
}

const STATUS_LETTER: Record<FileTreeStatus, string> = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
}

const EXT_TONE: Record<string, string> = {
  ts: "fill-kg-info",
  tsx: "fill-kg-info",
  js: "fill-kg-warning",
  jsx: "fill-kg-warning",
  json: "fill-kg-warning",
  css: "fill-[color-mix(in_oklab,var(--kg-info)_50%,var(--kg-success))]",
  scss: "fill-[color-mix(in_oklab,var(--kg-info)_50%,var(--kg-success))]",
  md: "fill-kg-fg-muted",
  mdx: "fill-kg-fg-muted",
  png: "fill-kg-success",
  svg: "fill-kg-success",
  jpg: "fill-kg-success",
  html: "fill-kg-danger",
  rs: "fill-kg-danger",
}

/* Paper Layers: git markers are letter chips on the matching paper, so they stay AA on any row. */
const STATUS_PAPER: Record<FileTreeStatus, string> = {
  added: "bg-kg-paper-sage",
  modified: "bg-kg-paper-butter",
  deleted: "bg-kg-paper-rose",
  renamed: "bg-kg-paper-sky",
}

const Folder = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 16 16" data-file-icon="folder" className="text-kg-accent-strong">
    {open ? (
      <path
        d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h2.6l1.4 1.5h4.5c.69 0 1.25.56 1.25 1.25v.75H4.6a1 1 0 0 0-.95.68L1.75 12.5z M3.65 7.18A1 1 0 0 1 4.6 6.5h9.15a.6.6 0 0 1 .57.79l-1.5 4.5a1 1 0 0 1-.95.71H2.2"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h2.6l1.4 1.5h6c.69 0 1.25.56 1.25 1.25v5.75c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    )}
  </svg>
)

const File = ({ ext }: { ext: string }) => (
  <svg viewBox="0 0 16 16" data-file-icon="file" data-ext={ext} className="text-kg-fg-muted">
    <path
      d="M4 1.75h5l3.25 3.25v8c0 .69-.56 1.25-1.25 1.25H4c-.69 0-1.25-.56-1.25-1.25V3c0-.69.56-1.25 1.25-1.25z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d="M9 1.75V5h3.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="4.75" y="9" width="5" height="2.5" rx="1" className={`kg-file-tree__ext ${EXT_TONE[ext] ?? "fill-kg-fg-faint"}`} />
  </svg>
)

interface Draft {
  name: string
  path: string
  folder: boolean
  children: Map<string, Draft>
}

const build = (paths: string[], status: Record<string, FileTreeStatus> | undefined) => {
  const root: Draft = { name: "", path: "", folder: true, children: new Map() }
  for (const raw of paths) {
    const folderOnly = raw.endsWith("/")
    const parts = raw.split("/").filter(Boolean)
    let cursor = root
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/")
      const folder = index < parts.length - 1 || folderOnly
      let next = cursor.children.get(part)
      if (!next) {
        next = { name: part, path, folder, children: new Map() }
        cursor.children.set(part, next)
      } else if (folder) next.folder = true
      cursor = next
    })
  }
  const folders: string[] = []
  const toNodes = (draft: Draft): TreeViewNode[] =>
    [...draft.children.values()]
      .sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name))
      .map((entry) => {
        if (entry.folder) {
          folders.push(entry.path)
          const node: TreeViewNode = {
            id: entry.path,
            label: entry.name,
            icon: <Folder open={false} />,
            expandedIcon: <Folder open />,
            children: toNodes(entry),
          }
          return node
        }
        const ext = entry.name.includes(".") ? (entry.name.split(".").pop() ?? "") : ""
        const mark = status?.[entry.path]
        const node: TreeViewNode = {
          id: entry.path,
          label: (
            <span
              data-status={mark}
              className={mark === "deleted" ? "line-through decoration-kg-fg-faint" : undefined}
            >
              {entry.name}
            </span>
          ),
          textValue: entry.name,
          icon: <File ext={ext.toLowerCase()} />,
        }
        if (mark)
          node.meta = (
            <span
              className={`kg-file-tree__status inline-grid h-4 min-w-4 place-items-center rounded-kg-xs border border-kg-ink px-0.5 font-kg-mono text-[0.6875rem] leading-none font-bold text-kg-fg no-underline ${STATUS_PAPER[mark]}`}
              data-status={mark}
              title={mark}
            >
              {STATUS_LETTER[mark]}
              <span className="kg-file-tree__sr sr-only"> {mark}</span>
            </span>
          )
        return node
      })
  const nodes = toNodes(root)
  return { nodes, folders }
}

/** A file explorer built on `TreeView`: give it paths, get folders, icons and git markers. */
export const FileTree = forwardRef<HTMLUListElement, FileTreeProps>(
  (
    {
      paths,
      status,
      expandAll = false,
      selectedPath,
      defaultSelectedPath,
      onSelectPath,
      defaultExpanded,
      className,
      ...props
    },
    ref,
  ) => {
    const { nodes, folders } = useMemo(() => build(paths, status), [paths, status])
    const isFolder = (id: string) => folders.includes(id)
    return (
      <TreeView
        ref={ref}
        className={cx("kg-file-tree [--_fs:var(--kg-text-sm)]", className)}
        nodes={nodes}
        selectionMode="single"
        defaultExpanded={defaultExpanded ?? (expandAll ? folders : [])}
        {...(selectedPath !== undefined ? { selected: [selectedPath] } : null)}
        defaultSelected={defaultSelectedPath ? [defaultSelectedPath] : []}
        onSelectedChange={(ids) => {
          const id = ids[ids.length - 1]
          if (id && !isFolder(id)) onSelectPath?.(id)
        }}
        {...props}
      />
    )
  },
)
FileTree.displayName = "FileTree"
