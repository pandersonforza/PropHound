"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const GROUPS = ["F7B", "H7B", "Forza", "Harman"] as const;
type Group = (typeof GROUPS)[number];

type SaveStatus = "idle" | "saving" | "saved" | "error";

function isBoolLike(val: string): boolean {
  const v = val.trim().toUpperCase();
  return v === "TRUE" || v === "FALSE";
}

// ── Spreadsheet Table ──────────────────────────────────────────────────────────

function SpreadsheetTable({
  headers,
  rows,
  onRowsChange,
  canResize,
}: {
  headers: string[];
  rows: string[][];
  onRowsChange: (rows: string[][]) => void;
  canResize: boolean;
}) {
  const [editing, setEditing] = React.useState<{ row: number; col: number } | null>(null);
  const [draft, setDraft] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Column / row resize state
  const [colWidths, setColWidths] = React.useState<number[]>([]);
  const [rowHeights, setRowHeights] = React.useState<number[]>([]);
  const theadRef = React.useRef<HTMLTableSectionElement>(null);
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);
  const resizingCol = React.useRef<{ ci: number; startX: number; startWidth: number } | null>(null);
  const resizingRow = React.useRef<{ ri: number; startY: number; startHeight: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // Clear editing when rows are replaced (e.g. after sync)
  const rowsRef = React.useRef(rows);
  if (rowsRef.current !== rows) {
    rowsRef.current = rows;
    setEditing(null);
  }

  React.useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  // Reset row heights when row count changes
  React.useEffect(() => {
    setRowHeights((prev) => {
      if (prev.length === rows.length) return prev;
      const next = Array(rows.length).fill(50);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
      return next;
    });
  }, [rows.length]);

  // Column resize handlers
  const startColResize = React.useCallback((e: React.MouseEvent, ci: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Snapshot current widths from DOM if not yet set
    let currentWidths = colWidths;
    if (currentWidths.length === 0 && theadRef.current) {
      const ths = theadRef.current.querySelectorAll("th");
      currentWidths = Array.from(ths).map((th) => th.getBoundingClientRect().width);
      setColWidths(currentWidths);
    }

    resizingCol.current = { ci, startX: e.clientX, startWidth: currentWidths[ci] ?? 100 };
    setIsDragging(true);

    const onMouseMove = (mv: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = mv.clientX - resizingCol.current.startX;
      const newWidth = Math.max(40, resizingCol.current.startWidth + delta);
      setColWidths((prev) => {
        const next = [...prev];
        next[resizingCol.current!.ci] = newWidth;
        return next;
      });
    };

    const onMouseUp = () => {
      resizingCol.current = null;
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [colWidths]);

  // Row resize handlers
  const startRowResize = React.useCallback((e: React.MouseEvent, ri: number) => {
    e.preventDefault();
    e.stopPropagation();

    const currentHeights = rowHeights.length > 0
      ? rowHeights
      : Array(rows.length).fill(50);

    if (rowHeights.length === 0) setRowHeights(currentHeights);

    resizingRow.current = { ri, startY: e.clientY, startHeight: currentHeights[ri] ?? 50 };
    setIsDragging(true);

    const onMouseMove = (mv: MouseEvent) => {
      if (!resizingRow.current) return;
      const delta = mv.clientY - resizingRow.current.startY;
      const newHeight = Math.max(24, resizingRow.current.startHeight + delta);
      setRowHeights((prev) => {
        const next = prev.length > 0 ? [...prev] : Array(rows.length).fill(50);
        next[resizingRow.current!.ri] = newHeight;
        return next;
      });
    };

    const onMouseUp = () => {
      resizingRow.current = null;
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [rowHeights, rows.length]);

  const commitEdit = React.useCallback(
    (ri: number, ci: number, value: string): string[][] => {
      const next = rows.map((r) => [...r]);
      if (next[ri]) next[ri][ci] = value;
      setEditing(null);
      onRowsChange(next);
      return next;
    },
    [rows, onRowsChange]
  );

  const startEdit = (ri: number, ci: number, currentRows: string[][]) => {
    setEditing({ row: ri, col: ci });
    setDraft(currentRows[ri]?.[ci] ?? "");
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    ri: number,
    ci: number
  ) => {
    if (e.key === "Escape") { setEditing(null); return; }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const updated = commitEdit(ri, ci, draft);
      if (ri + 1 < updated.length) startEdit(ri + 1, ci, updated);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const updated = commitEdit(ri, ci, draft);
      if (e.shiftKey) {
        const pc = ci - 1;
        const pr = pc < 0 ? ri - 1 : ri;
        const tc = pc < 0 ? headers.length - 1 : pc;
        if (pr >= 0) startEdit(pr, tc, updated);
      } else {
        const nc = ci + 1;
        const nr = nc >= headers.length ? ri + 1 : ri;
        const tc = nc >= headers.length ? 0 : nc;
        if (nr < updated.length) startEdit(nr, tc, updated);
      }
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground italic">
        No rows found.
      </div>
    );
  }

  const hasColWidths = colWidths.length === headers.length;

  return (
    <div className={`overflow-auto h-full ${isDragging ? "select-none cursor-col-resize" : ""}`}>
      <table
        className="border-collapse text-[11px]"
        style={hasColWidths ? { tableLayout: "fixed", width: `${colWidths.reduce((a, b) => a + b, 0)}px` } : undefined}
      >
        {hasColWidths && (
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>
        )}
        <thead ref={theadRef}>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`sticky top-0 border border-border bg-muted px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap select-none ${
                  i === 0 ? "left-0 z-20" : "z-10"
                }`}
                style={{ position: "relative", ...(hasColWidths ? { width: colWidths[i] } : {}) }}
              >
                {h.trim()}
                {canResize && (
                  <div
                    onMouseDown={(e) => startColResize(e, i)}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/60 active:bg-blue-500"
                    style={{ zIndex: 30 }}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {rows.map((row, ri) => {
            const baseBg = ri % 2 === 0 ? "bg-background" : "bg-muted/20";
            const rowH = rowHeights[ri] ?? 50;
            return (
              <tr key={ri} className={baseBg} style={{ height: `${rowH}px` }}>
                {headers.map((_, ci) => {
                  const isActive = editing?.row === ri && editing?.col === ci;
                  return (
                    <td
                      key={ci}
                      className={`border p-0 align-middle ${
                        isActive
                          ? "border-blue-400 ring-1 ring-inset ring-blue-400 z-10"
                          : "border-border"
                      } ${ci === 0 ? `sticky left-0 font-medium ${baseBg}` : ""}`}
                      style={{ height: `${rowH}px`, maxHeight: `${rowH}px`, position: "relative" }}
                      onClick={() => { if (!isActive && !isBoolLike(row[ci] ?? "")) startEdit(ri, ci, rows); }}
                    >
                      {isActive ? (
                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                          onBlur={() => commitEdit(ri, ci, draft)}
                          className="block w-full h-full bg-blue-50 dark:bg-blue-950/30 outline-none text-[11px] px-2 resize-none overflow-y-auto leading-relaxed"
                          rows={1}
                        />
                      ) : isBoolLike(row[ci] ?? "") ? (
                        <div className="flex items-center justify-center h-full">
                          <input
                            type="checkbox"
                            checked={(row[ci] ?? "").trim().toUpperCase() === "TRUE"}
                            onChange={() => {
                              const next = rows.map((r) => [...r]);
                              next[ri][ci] = (row[ci] ?? "").trim().toUpperCase() === "TRUE" ? "FALSE" : "TRUE";
                              onRowsChange(next);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 cursor-pointer accent-primary"
                          />
                        </div>
                      ) : (
                        <div className="px-2 py-1 h-full cursor-default overflow-y-auto hover:bg-accent/30">
                          <span className={/address/i.test(headers[ci] ?? "") ? "whitespace-nowrap" : "whitespace-pre-wrap break-words"}>
                            {(row[ci] ?? "").replace(/\\n/g, "\n")}
                          </span>
                        </div>
                      )}
                      {/* Row resize handle — only on first column, admin only */}
                      {canResize && ci === 0 && (
                        <div
                          onMouseDown={(e) => startRowResize(e, ri)}
                          className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-blue-400/60 active:bg-blue-500"
                          style={{ zIndex: 30 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Group Tab ──────────────────────────────────────────────────────────────────

function GroupTab({ group }: { group: Group }) {
  const { user } = useAuth();
  const canResize = user?.role === "admin";
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline-report?group=${group}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setHeaders(d.headers);
      setRows(d.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [group]);

  React.useEffect(() => { load(); }, [load]);

  const save = React.useCallback(
    (newRows: string[][]) => {
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/pipeline-report?group=${group}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ headers, rows: newRows }),
          });
          if (!res.ok) throw new Error("Save failed");
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
        } catch {
          setSaveStatus("error");
        }
      }, 800);
    },
    [group, headers]
  );

  const handleRowsChange = React.useCallback(
    (newRows: string[][]) => {
      setRows(newRows);
      save(newRows);
    },
    [save]
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading {group} data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-sm text-destructive">Error: {error}</p>
        <button onClick={load} className="text-xs text-muted-foreground underline hover:text-foreground">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-600">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-destructive">Save failed</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <SpreadsheetTable
          headers={headers}
          rows={rows}
          onRowsChange={handleRowsChange}
          canResize={canResize}
        />
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export function PipelineReport() {
  const [activeGroup, setActiveGroup] = React.useState<Group>("F7B");

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border bg-card shrink-0">
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeGroup === g
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {GROUPS.map((g) => (
          <div key={g} className={`h-full ${activeGroup === g ? "flex flex-col" : "hidden"}`}>
            <GroupTab group={g} />
          </div>
        ))}
      </div>
    </div>
  );
}
