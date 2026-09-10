"use client"

import { useMemo, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  SortableTable,
  type SortableColumn,
  type SortState,
} from "@/components/ui/sortable-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"

export type { SortableColumn, SortState } from "@/components/ui/sortable-table"

export type DataTableProps<T> = {
  /** Accessible label for the grid. */
  label: string
  data: T[]
  columns: SortableColumn<T>[]
  getRowId: (row: T) => string
  /** Controlled sort (server-side). Omit for client-side sorting. */
  sort?: SortState | null
  defaultSort?: SortState | null
  onSortChange?: (next: SortState | null) => void
  /** Show shimmer rows instead of data. */
  loading?: boolean
  skeletonRows?: number
  /** Rendered when there are no rows and not loading. */
  emptyState?: ReactNode
  /** Client-side search: predicate is run per row against the query. */
  search?: { query: string; matches: (row: T, q: string) => boolean }
  /** Client-side pagination. Omit when the caller paginates server-side. */
  pagination?: { pageSize: number }
  /** Server-side pagination footer (rendered as-is under the table). */
  footer?: ReactNode
  rowHeight?: number
  maxHeight?: number
  className?: string
  variant?: "default" | "sheet"
}

/**
 * App-facing table built on interior.dev's SortableTable. Adds client search,
 * client pagination, a loading skeleton, and an empty state. Row actions live
 * in a trailing column's `cell` (see `rowActionsColumn` helper).
 */
export function DataTable<T>({
  label,
  data,
  columns,
  getRowId,
  sort,
  defaultSort,
  onSortChange,
  loading = false,
  skeletonRows = 6,
  emptyState,
  search,
  pagination,
  footer,
  rowHeight,
  maxHeight,
  className,
  variant = "default",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!search || !search.query.trim()) return data
    const q = search.query.trim().toLowerCase()
    return data.filter((row) => search.matches(row, q))
  }, [data, search])

  const total = filtered.length
  const pageSize = pagination?.pageSize ?? 0
  const pageCount = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const current = Math.min(page, pageCount)

  const visible = useMemo(() => {
    if (!pageSize) return filtered
    const start = (current - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, pageSize, current])

  if (loading) {
    return (
      <div
        className={cn(
          variant === "sheet"
            ? "overflow-hidden"
            : "overflow-hidden rounded-[14px] border border-border bg-card shadow-sm",
          className
        )}
      >
        <div className={cn("grid items-center px-5", variant === "sheet" ? "h-12 bg-[#F3F4F6]" : "h-9 border-b border-border px-3")}>
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: skeletonRows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-3.5 w-6" />
              <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${70 - (i % 3) * 8}%` }} />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className={cn(
            "flex min-h-40 items-center justify-center p-8 text-center text-sm text-muted-foreground",
            variant !== "sheet" && "rounded-[14px] border border-border bg-card shadow-sm"
          )}
        >
          {emptyState ?? "No records found."}
        </div>
        {footer}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <SortableTable
        rows={visible}
        columns={columns}
        getRowId={getRowId}
        label={label}
        sort={sort}
        defaultSort={defaultSort}
        onSortChange={onSortChange}
        rowHeight={rowHeight}
        maxHeight={maxHeight}
        variant={variant}
      />
      {footer}
      {pagination && pageCount > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} of {total}
          </span>
          <Pagination
            label="Table pages"
            count={pageCount}
            page={current}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Build a non-sortable trailing column that renders per-row actions (e.g. a
 * dropdown menu). Keeps a consistent width and right alignment.
 */
export function rowActionsColumn<T>(
  render: (row: T) => ReactNode,
  opts?: { header?: string; width?: string }
): SortableColumn<T> {
  return {
    id: "__actions",
    header: opts?.header ?? "",
    width: opts?.width ?? "64px",
    align: "end",
    sortable: false,
    cell: render,
  }
}
