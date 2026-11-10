"use client"

import { type CSSProperties, forwardRef, useState } from "react"
import { cx } from "../../utils/cx.js"
import { ModalRoot, type ModalRootProps } from "../dialog/modal.js"
import {
  DrawerBody,
  type DrawerBodyProps,
  DrawerClose,
  type DrawerCloseProps,
  DrawerContent,
  type DrawerContentProps,
  DrawerDescription,
  type DrawerDescriptionProps,
  DrawerFooter,
  type DrawerFooterProps,
  DrawerHeader,
  type DrawerHeaderProps,
  DrawerTitle,
  type DrawerTitleProps,
  DrawerTrigger,
  type DrawerTriggerProps,
} from "../drawer/drawer.js"
import { StackLevel, useStackLevel } from "../modal-stack/stack-level.js"

/*
 * A covered drawer slides back on the individual translate/scale properties, which compose with
 * the drawer's entry and drag transforms. Child layers clear the overlay token their ::backdrop
 * inherits: one scrim is enough.
 */
const nestedClass = [
  "kg-nested-drawer data-behind:pointer-events-none data-behind:scale-(--_scale) data-behind:brightness-90",
  "data-behind:data-[side=right]:origin-[100%_50%] data-behind:data-[side=right]:translate-x-(--_tx)",
  "data-behind:data-[side=left]:origin-[0_50%] data-behind:data-[side=left]:translate-x-(--_tx)",
  "data-behind:data-[side=bottom]:origin-[50%_100%] data-behind:data-[side=bottom]:translate-y-(--_ty)",
  "[&:not([data-depth='0'])]:[--kg-overlay:transparent]",
]

export interface NestedDrawerProps extends ModalRootProps {}

/**
 * A drawer that can push further drawers over itself, for drill-in flows (cart, then address,
 * then a map). Each parent slides back and dims while a child is open.
 */
export const NestedDrawer = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: NestedDrawerProps) => {
  const [internal, setInternal] = useState(defaultOpen)
  const open = openProp ?? internal
  return (
    <StackLevel open={open}>
      <ModalRoot
        {...props}
        open={open}
        onOpenChange={(next) => {
          if (openProp === undefined) setInternal(next)
          onOpenChange?.(next)
        }}
      />
    </StackLevel>
  )
}

NestedDrawer.displayName = "NestedDrawer"

export interface NestedDrawerContentProps extends DrawerContentProps {}

export const NestedDrawerContent = forwardRef<HTMLDialogElement, NestedDrawerContentProps>(
  ({ className, style, side = "right", ...props }, ref) => {
    const { depth, above } = useStackLevel()
    return (
      <DrawerContent
        ref={ref}
        side={side}
        className={cx(nestedClass, className)}
        data-depth={depth}
        data-behind={above > 0 || undefined}
        style={
          {
            "--_above": above,
            "--_scale": 1 - above * 0.04,
            "--_tx": `${side === "left" ? above * 28 : above * -28}px`,
            "--_ty": `${above * -20}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

NestedDrawerContent.displayName = "NestedDrawerContent"

export interface NestedDrawerTriggerProps extends DrawerTriggerProps {}
export const NestedDrawerTrigger = DrawerTrigger

export interface NestedDrawerCloseProps extends DrawerCloseProps {}
export const NestedDrawerClose = DrawerClose

export interface NestedDrawerHeaderProps extends DrawerHeaderProps {}
export const NestedDrawerHeader = DrawerHeader

export interface NestedDrawerTitleProps extends DrawerTitleProps {}
export const NestedDrawerTitle = DrawerTitle

export interface NestedDrawerDescriptionProps extends DrawerDescriptionProps {}
export const NestedDrawerDescription = DrawerDescription

export interface NestedDrawerBodyProps extends DrawerBodyProps {}
export const NestedDrawerBody = DrawerBody

export interface NestedDrawerFooterProps extends DrawerFooterProps {}
export const NestedDrawerFooter = DrawerFooter
