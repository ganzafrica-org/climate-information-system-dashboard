"use client"

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

// A motion-based ACTION menu in the interior.dev aesthetic (open animation,
// click-outside / Escape / arrow-key navigation), exposed through a small
// compound API. Replaces the previous Radix dropdown-menu. Items fire onClick
// handlers (View / Edit / Delete etc.) rather than picking a value.

const OPEN = { type: "spring", stiffness: 460, damping: 34, mass: 0.7 } as const
const EASE = [0.23, 1, 0.32, 1] as const
const EXIT = [0.4, 0, 1, 1] as const

type Align = "start" | "end"

type MenuCtx = {
  open: boolean
  setOpen: (v: boolean) => void
  align: Align
  rootRef: React.RefObject<HTMLDivElement>
  triggerRef: React.RefObject<HTMLButtonElement>
  contentRef: React.RefObject<HTMLDivElement>
  contentId: string
  registerItem: (el: HTMLButtonElement | null, index: number) => void
  focusItem: (index: number) => void
  itemCount: () => number
}

const Ctx = createContext<MenuCtx | null>(null)
function useMenu(component: string) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error(`${component} must be used within <DropdownMenu>`)
  return ctx
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<Align>("start")
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const contentId = `menu-${useId()}`

  const registerItem = useCallback((el: HTMLButtonElement | null, index: number) => {
    items.current[index] = el
  }, [])
  const focusItem = useCallback((index: number) => {
    const list = items.current.filter(Boolean) as HTMLButtonElement[]
    if (list.length === 0) return
    const i = ((index % list.length) + list.length) % list.length
    list[i]?.focus()
  }, [])
  const itemCount = useCallback(() => items.current.filter(Boolean).length, [])

  useEffect(() => {
    if (!open) {
      items.current = []
      return
    }
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (!t) return
      if (rootRef.current?.contains(t)) return
      if (contentRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("keydown", onKey, true)
    }
  }, [open])

  const ctx: MenuCtx = {
    open,
    setOpen: (v) => {
      // choose alignment based on trigger position when opening
      if (v && triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect()
        setAlign(r.left > window.innerWidth - r.right ? "end" : "start")
      }
      setOpen(v)
    },
    align,
    rootRef,
    triggerRef,
    contentRef,
    contentId,
    registerItem,
    focusItem,
    itemCount,
  }

  return (
    <Ctx.Provider value={ctx}>
      <div ref={rootRef} className="relative inline-block text-left">
        {children}
      </div>
    </Ctx.Provider>
  )
}

type TriggerChild = ReactElement<{
  onClick?: (e: React.MouseEvent) => void
  ref?: React.Ref<HTMLButtonElement>
  "aria-haspopup"?: string
  "aria-expanded"?: boolean
}>

export function DropdownMenuTrigger({
  children,
  asChild,
  onClick,
}: {
  children: ReactNode
  asChild?: boolean
  onClick?: (e: React.MouseEvent) => void
}) {
  const { open, setOpen, triggerRef, contentId } = useMenu("DropdownMenuTrigger")
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.(e)
    setOpen(!open)
  }
  const shared = {
    ref: triggerRef,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    "aria-controls": open ? contentId : undefined,
    onClick: toggle,
  }

  if (asChild && isValidElement(children)) {
    const child = children as TriggerChild
    return cloneElement(child, {
      ...shared,
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        toggle(e)
      },
    } as Partial<TriggerChild["props"]>)
  }

  return (
    <button type="button" {...shared}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  children,
  align: alignProp,
  className,
}: {
  children: ReactNode
  align?: Align
  className?: string
}) {
  const { open, align, contentId, focusItem, triggerRef, contentRef } = useMenu("DropdownMenuContent")
  const reduced = useReducedMotion()
  const resolvedAlign = alignProp ?? align
  const triggerRect = triggerRef.current?.getBoundingClientRect()
  const top = triggerRect ? triggerRect.bottom + 6 : 0
  const left = triggerRect?.left ?? 0
  const right = triggerRect ? window.innerWidth - triggerRect.right : 0

  const onKeyDown = (e: React.KeyboardEvent) => {
    const focusables = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '[data-menu-item]:not([disabled])'
      )
    )
    const idx = focusables.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === "ArrowDown") {
      e.preventDefault()
      focusItem(idx + 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      focusItem(idx - 1)
    } else if (e.key === "Home") {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === "End") {
      e.preventDefault()
      focusItem(focusables.length - 1)
    }
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          id={contentId}
          role="menu"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.97,
            y: -6,
            transition: reduced ? { duration: 0 } : { duration: 0.12, ease: EXIT },
          }}
          transition={
            reduced ? { duration: 0 } : { ...OPEN, opacity: { duration: 0.12, ease: EASE } }
          }
          onKeyDown={onKeyDown}
          style={{
            position: "fixed",
            top,
            transformOrigin: resolvedAlign === "end" ? "top right" : "top left",
            ...(resolvedAlign === "end" ? { right } : { left }),
          }}
          className={cn(
            "z-[200] min-w-[200px] whitespace-nowrap rounded-[11px] border border-border bg-popover p-[5px] text-popover-foreground shadow-lg",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

let itemSeq = 0

export function DropdownMenuItem({
  children,
  onClick,
  disabled,
  destructive,
  asChild,
  className,
}: {
  children: ReactNode
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  destructive?: boolean
  asChild?: boolean
  className?: string
}) {
  const { setOpen, registerItem } = useMenu("DropdownMenuItem")
  const indexRef = useRef<number>((itemSeq = (itemSeq + 1) % 100000))

  const itemClass = cn(
    "flex h-8 w-full cursor-default select-none items-center gap-2 rounded-[7px] px-2.5 text-left text-[13px] outline-none transition-colors",
    "hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    disabled && "pointer-events-none opacity-50",
    destructive && "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10",
    className
  )

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    onClick?.(e)
    setOpen(false)
  }

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (e: React.MouseEvent) => void
      className?: string
      ref?: React.Ref<HTMLButtonElement>
    }>
    return cloneElement(child, {
      role: "menuitem",
      "data-menu-item": "",
      ref: (el: HTMLButtonElement | null) => registerItem(el, indexRef.current),
      className: cn(itemClass, child.props.className),
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        handleClick(e)
      },
    } as Record<string, unknown>)
  }

  return (
    <button
      type="button"
      role="menuitem"
      data-menu-item=""
      disabled={disabled}
      ref={(el) => registerItem(el, indexRef.current)}
      onClick={handleClick}
      className={itemClass}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-border", className)} />
}
