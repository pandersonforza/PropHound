"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { DatePicker } from "@/components/ui/date-picker";
import { CalendarDays, MessageSquare, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Assignee {
  id: string;
  name: string;
}

interface CloseoutItem {
  id: string;
  category: string;
  title: string;
  completed: boolean;
  assigneeId: string | null;
  assignee: Assignee | null;
  dueDate: string | null;
  notes: string | null;
  notesUpdatedAt: string | null;
  sortOrder: number;
}

interface ProjectCloseoutProps {
  projectId: string;
}

function NotesPanel({ item, onSave }: { item: CloseoutItem; onSave: (notes: string | null) => void }) {
  const [value, setValue] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== (item.notes ?? "").trim();

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    await onSave(value.trim() || null);
    setSaving(false);
  };

  return (
    <div className="px-4 pb-2.5 pt-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      <div className="flex items-center justify-between mt-1">
        {item.notesUpdatedAt ? (
          <span className="text-xs text-muted-foreground">
            Saved {format(parseISO(item.notesUpdatedAt), "MMM d, yyyy h:mm a")}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function ProjectCloseout({ projectId }: ProjectCloseoutProps) {
  const [items, setItems] = useState<CloseoutItem[]>([]);
  const [users, setUsers] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [estimatedClosingDate, setEstimatedClosingDate] = useState<string | null>(null);
  const [savingDate, setSavingDate] = useState(false);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/closeout?projectId=${projectId}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast({ title: "Error", description: "Failed to load closeout checklist", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchItems();
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((data: Assignee[]) => setUsers(data))
      .catch(() => {});
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { estimatedClosingDate?: string | null } | null) => {
        if (data?.estimatedClosingDate) {
          setEstimatedClosingDate(data.estimatedClosingDate.slice(0, 10));
        }
      })
      .catch(() => {});
  }, [fetchItems, projectId]);

  const updateClosingDate = async (date: string | null) => {
    setEstimatedClosingDate(date);
    setSavingDate(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedClosingDate: date }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast({ title: "Error", description: "Failed to save closing date", variant: "destructive" });
    } finally {
      setSavingDate(false);
    }
  };

  const updateItem = async (id: string, patch: Partial<CloseoutItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    try {
      const res = await fetch(`/api/closeout/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch {
      toast({ title: "Error", description: "Failed to save change", variant: "destructive" });
      fetchItems();
    }
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>;

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Estimated Closing Date */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 border-l-4 border-l-primary">
        <CalendarDays className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-base font-semibold">Estimated Closing Date</p>
          <p className="text-xs text-muted-foreground">Target date for transaction close</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savingDate && <span className="text-xs text-muted-foreground">Saving…</span>}
          <DatePicker
            value={estimatedClosingDate}
            onChange={updateClosingDate}
            size="lg"
            className="w-44"
          />
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 pb-1">
        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {completed} / {total} complete ({pct}%)
        </span>
        <a
          href={`/api/closeout/pdf?projectId=${projectId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FileDown className="h-4 w-4" />
          Print PDF
        </a>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const catItems = items.filter((i) => i.category === category);
        const catDone = catItems.filter((i) => i.completed).length;

        return (
          <div key={category} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
              <h3 className="text-base font-semibold">{category.replace(/^\d+\.\s*/, "")}</h3>
              <span className="text-xs text-muted-foreground">{catDone}/{catItems.length}</span>
            </div>
            <div className="divide-y divide-border">
              {catItems.map((item) => {
                const notesOpen = expandedNotes.has(item.id);
                const hasNotes = !!item.notes?.trim();

                return (
                  <div key={item.id} className={item.completed ? "bg-muted/30" : ""}>
                    <div className="flex items-center gap-3 px-4 py-1.5">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(e) => updateItem(item.id, { completed: e.target.checked })}
                        className="h-4 w-4 shrink-0 accent-emerald-500 cursor-pointer"
                      />
                      <span
                        className={`flex-1 text-sm leading-snug ${
                          item.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.title}
                      </span>
                      <button
                        onClick={() => toggleNotes(item.id)}
                        className={`shrink-0 p-0.5 rounded transition-colors ${
                          hasNotes
                            ? "text-amber-500 hover:text-amber-400"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-label="Toggle notes"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                      <select
                        value={item.assigneeId ?? ""}
                        onChange={(e) => updateItem(item.id, { assigneeId: e.target.value || null })}
                        className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground w-32 shrink-0"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <DatePicker
                        value={item.dueDate ? item.dueDate.slice(0, 10) : null}
                        onChange={(date) => updateItem(item.id, { dueDate: date })}
                        className="w-32 shrink-0"
                      />
                    </div>
                    {notesOpen && (
                      <NotesPanel
                        item={item}
                        onSave={(notes) => updateItem(item.id, { notes })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
