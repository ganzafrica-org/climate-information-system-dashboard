"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const CELL = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 } as const;

const SMALL = { type: "spring", stiffness: 700, damping: 46, mass: 0.5 } as const;

const EASE = [0.23, 1, 0.32, 1] as const;
const LEAVE = [0.4, 0, 1, 1] as const;
const HIDE = { duration: 0.12, ease: LEAVE } as const;
const SHOW = { duration: 0.25, ease: EASE } as const;

const STEP = 0.018;
const STEP_CAP = 8;
const SETTLE_MS = 380;

export type SortDirection = "asc" | "desc";

export type SortState = { columnId: string; direction: SortDirection };

export type SortableColumn<T> = {
  id: string;
  header: string;
  width?: string;
  align?: "start" | "end";
  numeric?: boolean;
  sortable?: boolean;
  value?: (row: T) => string | number | null | undefined;
  cell?: (row: T) => ReactNode;
};

export type OrderedRow<T> = { id: string; row: T; index: number };

export type UseSortableRowsOptions<T> = {
  rows: T[];
  getRowId: (row: T) => string;
  getValue: (row: T, columnId: string) => string | number | null | undefined;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  restoreOriginal?: boolean;
};

export function useSortableRows<T>({
  rows,
  getRowId,
  getValue,
  sort,
  defaultSort = null,
  onSortChange,
  restoreOriginal = true,
}: UseSortableRowsOptions<T>) {
  const [internal, setInternal] = useState<SortState | null>(defaultSort);

  const controlled = sort !== undefined;
  const current = controlled ? sort : internal;

  const collator = useMemo(
    () => new Intl.Collator("en", { numeric: true, sensitivity: "base" }),
    [],
  );

  const ordered = useMemo<OrderedRow<T>[]>(() => {
    const base = rows.map((row, i) => ({ id: getRowId(row), row, i }));

    if (current) {
      const dir = current.direction === "asc" ? 1 : -1;
      base.sort((x, y) => {
        const a = getValue(x.row, current.columnId);
        const b = getValue(y.row, current.columnId);
        const emptyA = a === null || a === undefined || a === "";
        const emptyB = b === null || b === undefined || b === "";
        if (emptyA || emptyB) {
          if (emptyA && emptyB) return x.i - y.i;
          return emptyA ? 1 : -1;
        }
        const d =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : collator.compare(String(a), String(b));
        return d === 0 ? x.i - y.i : d * dir;
      });
    }

    return base.map(({ id, row }, index) => ({ id, row, index }));
  }, [rows, current, getRowId, getValue, collator]);

  const toggle = useCallback(
    (columnId: string) => {
      const next: SortState | null =
        !current || current.columnId !== columnId
          ? { columnId, direction: "asc" }
          : current.direction === "asc"
            ? { columnId, direction: "desc" }
            : restoreOriginal
              ? null
              : { columnId, direction: "asc" };

      if (!controlled) setInternal(next);
      onSortChange?.(next);
    },
    [current, controlled, onSortChange, restoreOriginal],
  );

  const ariaSort = useCallback(
    (columnId: string): "ascending" | "descending" | "none" =>
      current?.columnId === columnId
        ? current.direction === "asc"
          ? "ascending"
          : "descending"
        : "none",
    [current],
  );

  return { sort: current, ordered, toggle, ariaSort };
}

function SheetSortIcon({ direction }: { direction: "ascending" | "descending" | "none" }) {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true" className="shrink-0">
      <path
        d="M4 1.2 7.2 5H.8Z"
        fill={direction === "ascending" ? "#1e293b" : "#9ca3af"}
      />
      <path
        d="M4 10.8.8 7h6.4Z"
        fill={direction === "descending" ? "#1e293b" : "#9ca3af"}
      />
    </svg>
  );
}

export type SortableTableProps<T> = {
  rows: T[];
  columns: SortableColumn<T>[];
  getRowId: (row: T) => string;
  label: string;
  rowHeight?: number;
  maxHeight?: number;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  markable?: boolean;
  onMarkChange?: (id: string | null) => void;
  getRowLabel?: (row: T) => string;
  className?: string;
  variant?: "default" | "sheet";
  /** Multi-select checkbox column. Controlled via selectedIds + onSelectionChange. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Optional row click (ignored when the click originates from an interactive cell). */
  onRowClick?: (row: T) => void;
};

export function SortableTable<T>({
  rows,
  columns,
  getRowId,
  label,
  rowHeight = 44,
  maxHeight,
  sort,
  defaultSort = null,
  onSortChange,
  markable = false,
  onMarkChange,
  getRowLabel,
  className = "",
  variant = "default",
  selectable = false,
  selectedIds,
  onSelectionChange,
  onRowClick,
}: SortableTableProps<T>) {
  const reduced = useReducedMotion();
  const [marked, setMarked] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [moving, setMoving] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const getValue = useCallback(
    (row: T, columnId: string) => {
      const column = columns.find((c) => c.id === columnId);
      return column?.value ? column.value(row) : null;
    },
    [columns],
  );

  const { sort: current, ordered, toggle, ariaSort } = useSortableRows<T>({
    rows,
    getRowId,
    getValue,
    sort,
    defaultSort,
    onSortChange,
  });

  const template = useMemo(
    () =>
      (selectable ? "40px " : "") +
      (markable ? "28px " : "") +
      columns.map((c) => c.width ?? "minmax(0, 1fr)").join(" "),
    [columns, markable, selectable],
  );

  const selected = selectedIds ?? new Set<string>();
  const allIds = useMemo(() => ordered.map((o) => o.id), [ordered]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = allIds.some((id) => selected.has(id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(allIds));
  };
  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const onToggle = (columnId: string) => {
    setTouched(true);
    toggle(columnId);
    if (reduced) return;
    setMoving(true);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setMoving(false), SETTLE_MS);
  };

  const onMark = (id: string) => {
    const next = marked === id ? null : id;
    setMarked(next);
    onMarkChange?.(next);
  };

  const nameOf = (row: T) =>
    getRowLabel?.(row) ?? String(columns[0]?.value?.(row) ?? getRowId(row));

  const activeHeader = columns.find((c) => c.id === current?.columnId)?.header;

  const message = !touched
    ? ""
    : current && activeHeader
      ? `Sorted by ${activeHeader}, ${
          current.direction === "asc" ? "ascending" : "descending"
        }. ${rows.length} rows.`
      : `Original order restored. ${rows.length} rows.`;

  const isSheet = variant === "sheet";

  return (
    <div
      className={
        isSheet
          ? `overflow-hidden ${className}`
          : `overflow-hidden rounded-[14px] border border-border bg-card shadow-sm    ${className}`
      }
    >
      <div
        role="table"
        aria-label={label}
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length + (markable ? 1 : 0)}
      >
        <div role="rowgroup">
          <div
            role="row"
            aria-rowindex={1}
            className={
              isSheet
                ? "grid h-12 items-center gap-x-3 bg-[#F3F4F6] px-5"
                : "grid h-9 items-center gap-x-2 border-b border-border px-2 "
            }
            style={{ gridTemplateColumns: template }}
          >
            {selectable && (
              <div role="columnheader" className="flex min-w-0 items-center justify-center">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                />
              </div>
            )}
            {markable && (
              <div role="columnheader" className="min-w-0">
                <span className="sr-only">Follow</span>
              </div>
            )}

            {columns.map((column) => {
              const state = ariaSort(column.id);
              const active = state !== "none";
              const end = column.align === "end";
              const sheetHeader = `flex w-full items-center gap-1.5 px-1 ${end ? "flex-row-reverse" : ""}`;
              const sheetLabel = "truncate text-sm font-semibold text-slate-800";

              return (
                <div
                  key={column.id}
                  role="columnheader"
                  aria-sort={column.sortable === false ? undefined : state}
                  className="min-w-0"
                >
                  {column.sortable === false ? (
                    isSheet ? (
                      <span className={sheetHeader}>
                        <span className={sheetLabel}>{column.header}</span>
                        <SheetSortIcon direction="none" />
                      </span>
                    ) : (
                      <span
                        className={`block truncate px-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground dark:text-muted-foreground ${
                          end ? "text-right" : ""
                        }`}
                      >
                        {column.header}
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggle(column.id)}
                      className={
                        isSheet
                          ? `group ${sheetHeader} outline-none`
                          : `group flex h-7 w-full items-center gap-1.5 rounded-[6px] px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                              end ? "flex-row-reverse" : ""
                            }`
                      }
                    >
                      <span
                        className={
                          isSheet
                            ? sheetLabel
                            : `truncate text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                active
                                  ? "text-foreground "
                                  : "text-muted-foreground group-hover:text-foreground"
                              }`
                        }
                      >
                        {column.header}
                      </span>
                      {isSheet ? (
                        <SheetSortIcon direction={state} />
                      ) : (
                        <motion.span
                          aria-hidden
                          className="shrink-0 text-foreground "
                          initial={false}
                          animate={{
                            rotate: state === "descending" ? 180 : 0,
                            opacity: active ? 1 : 0,
                            scale: active ? 1 : 0.72,
                          }}
                          transition={reduced ? { duration: 0 } : SMALL}
                        >
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M5 8.6V1.6M5 1.6 2.2 4.4M5 1.6l2.8 2.8"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </motion.span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div
          role="rowgroup"
          className={`relative overflow-y-auto overscroll-contain ${
            maxHeight ? "[scrollbar-gutter:stable]" : ""
          }`}
          style={{
            height: (rows.length || 1) * rowHeight,
            maxHeight,
          }}
        >
          {rows.length === 0 && (
            <div
              role="row"
              className="absolute inset-x-0 top-0 flex items-center px-3.5"
              style={{ height: rowHeight }}
            >
              <span
                role="cell"
                className="text-[12.5px] text-muted-foreground dark:text-muted-foreground"
              >
                No rows
              </span>
            </div>
          )}

          {ordered.map(({ id, row, index }) => {
            const isMarked = markable && marked === id;

            return (
              <motion.div
                key={id}
                role="row"
                aria-rowindex={index + 2}
                aria-current={isMarked ? true : undefined}
                initial={false}
                animate={{ y: index * rowHeight }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { ...CELL, delay: Math.min(index, STEP_CAP) * STEP }
                }
                onClick={onRowClick ? (e) => {
                  // ignore clicks that originate from interactive controls in cells
                  const target = e.target as HTMLElement;
                  if (target.closest('button, a, input, select, textarea, [role="menu"], [role="menuitem"]')) return;
                  onRowClick(row);
                } : undefined}
                className={`absolute inset-x-0 top-0 grid items-center gap-x-2 transition-colors duration-150 ${
                  isSheet ? "px-5" : "px-2"
                } ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} ${
                  isMarked || (selectable && selected.has(id)) ? "bg-muted dark:bg-card/[0.06]" : ""
                }`}
                style={{ height: rowHeight, gridTemplateColumns: template }}
              >
                {selectable && (
                  <div role="cell" className="flex min-w-0 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${nameOf(row)}`}
                      className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                      checked={selected.has(id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleOne(id)}
                    />
                  </div>
                )}
                {markable && (
                  <div role="cell" className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={marked === id}
                      onClick={() => onMark(id)}
                      className={`flex size-[18px] items-center justify-center rounded-[5px] border outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        marked === id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent"
                      }`}
                    >
                      <span className="sr-only">Follow {nameOf(row)}</span>
                      <motion.svg
                        aria-hidden
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                        initial={false}
                        animate={{ scale: marked === id ? 1 : 0.4 }}
                        transition={reduced ? { duration: 0 } : CELL}
                      >
                        <path
                          d="M2.6 6.3 4.9 8.6 9.4 3.4"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    </button>
                  </div>
                )}

                {columns.map((column, c) => {
                  const raw = column.value?.(row);
                  const content = column.cell
                    ? column.cell(row)
                    : raw === null || raw === undefined || raw === ""
                      ? "—"
                      : String(raw);

                  return (
                    <div
                      key={column.id}
                      role="cell"
                      className={`min-w-0 px-1.5 ${
                        column.cell ? "overflow-visible" : "truncate"
                      } ${
                        isSheet ? "text-sm" : "text-[13px]"
                      } ${
                        column.align === "end" ? "text-right" : ""
                      } ${column.numeric ? "tabular-nums" : ""} ${
                        isSheet
                          ? c === 1
                            ? "font-semibold text-slate-900"
                            : "text-slate-600"
                          : c === 0
                            ? "font-medium text-foreground "
                            : "text-muted-foreground dark:text-muted-foreground"
                      }`}
                    >
                      {content}
                    </div>
                  );
                })}
              </motion.div>
            );
          })}

          <motion.div
            aria-hidden
            initial={false}
            animate={{ opacity: moving ? 0 : 1 }}
            transition={moving ? HIDE : SHOW}
            className="pointer-events-none absolute inset-0"
          >
            {Array.from({ length: Math.max(0, rows.length - 1) }, (_, i) => (
              <div
                key={i}
                className={`absolute inset-x-0 ${isSheet ? "border-t border-gray-200" : "border-t border-border "}`}
                style={{ top: (i + 1) * rowHeight }}
              />
            ))}
          </motion.div>
        </div>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </div>
  );
}
