"use client"

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useModal } from "@/components/ui/modal"

// Compound Dialog API backed by interior.dev's useModal (portal, focus trap,
// scroll lock, backdrop/escape, motion). Call-sites use the controlled
// open/onOpenChange pattern plus DialogContent/Header/Title/Description/Footer.

const EASE = [0.23, 1, 0.32, 1] as const
const LEAVE = [0.4, 0, 1, 1] as const
const SURFACE = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const

type DialogCtx = {
  open: boolean
  onOpenChange: (open: boolean) => void
  titleId: string
  descriptionId: string
  setTitleId: (id: string) => void
  setDescriptionId: (id: string) => void
}

const Ctx = createContext<DialogCtx | null>(null)
function useDialogCtx(name: string) {
  const c = useContext(Ctx)
  if (!c) throw new Error(`${name} must be used within <Dialog>`)
  return c
}

export function Dialog({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolled
  const [titleId, setTitleId] = useState("")
  const [descriptionId, setDescriptionId] = useState("")

  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setUncontrolled(v)
    onOpenChange?.(v)
  }

  return (
    <Ctx.Provider
      value={{ open, onOpenChange: setOpen, titleId, descriptionId, setTitleId, setDescriptionId }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: ReactNode
  asChild?: boolean
}) {
  const { onOpenChange } = useDialogCtx("DialogTrigger")
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        onOpenChange(true)
      },
    } as Record<string, unknown>)
  }
  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  )
}

export function DialogClose({
  children,
  asChild,
}: {
  children: ReactNode
  asChild?: boolean
}) {
  const { onOpenChange } = useDialogCtx("DialogClose")
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        onOpenChange(false)
      },
    } as Record<string, unknown>)
  }
  return (
    <button type="button" onClick={() => onOpenChange(false)}>
      {children}
    </button>
  )
}

export function DialogContent({
  children,
  className,
  showClose = true,
}: {
  children: ReactNode
  className?: string
  showClose?: boolean
}) {
  const ctx = useDialogCtx("DialogContent")
  const reduced = useReducedMotion()
  const { target, titleId, overlayProps, panelProps } = useModal({
    open: ctx.open,
    onClose: () => ctx.onOpenChange(false),
  })

  // wire the modal's titleId into context so DialogTitle can adopt it
  useEffect(() => {
    ctx.setTitleId(titleId)
  }, [titleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const variants = reduced
    ? {
        backdrop: { closed: { opacity: 0 }, open: { opacity: 1, transition: { duration: 0 } }, gone: { opacity: 0, transition: { duration: 0 } } },
        panel: { closed: { opacity: 0 }, open: { opacity: 1, transition: { duration: 0 } }, gone: { opacity: 0, transition: { duration: 0 } } },
      }
    : {
        backdrop: {
          closed: { opacity: 0 },
          open: { opacity: 1, transition: { duration: 0.2, ease: EASE } },
          gone: { opacity: 0, transition: { duration: 0.15, ease: LEAVE } },
        },
        panel: {
          closed: { opacity: 0, scale: 0.96, y: 12 },
          open: { opacity: 1, scale: 1, y: 0, transition: { ...SURFACE, opacity: { duration: 0.16, ease: EASE } } },
          gone: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.15, ease: LEAVE } },
        },
      }

  if (!target) return null

  return createPortal(
    <AnimatePresence>
      {ctx.open ? (
        <motion.div
          key="dialog"
          {...overlayProps}
          initial="closed"
          animate="open"
          exit="gone"
          variants={{ closed: {}, open: {}, gone: {} }}
          className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6"
        >
          <motion.div
            aria-hidden="true"
            variants={variants.backdrop}
            style={{ touchAction: "none" }}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            {...panelProps}
            variants={variants.panel}
            className={cn(
              "relative flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[14px] border border-border bg-card text-card-foreground shadow-xl outline-none",
              className
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              {children}
            </div>
            {showClose ? (
              <button
                type="button"
                onClick={() => ctx.onOpenChange(false)}
                aria-label="Close"
                className="absolute right-4 top-4 grid size-7 place-items-center rounded-[7px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    target
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col space-y-1.5 text-left", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogCtx("DialogTitle")
  return (
    <h2
      id={titleId || undefined}
      className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

// Compatibility no-op wrappers for the few call-sites that referenced these.
export function DialogPortal({ children }: { children: ReactNode }) {
  return <>{children}</>
}
export function DialogOverlay() {
  return null
}
