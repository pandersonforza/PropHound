"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Pencil, X, Check } from "lucide-react";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
}

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const { toast } = useToast();
  const { user, canEdit } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const fetchNotes = () => {
    fetch(`/api/notes?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content: newNote }),
      });
      if (!res.ok) throw new Error();
      setNewNote("");
      fetchNotes();
    } catch {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      fetchNotes();
    } catch {
      toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchNotes();
    } catch {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="space-y-3">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={loading || !newNote.trim()}>
              {loading ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notes yet.</p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">{note.author.name}</span>
                      <span>&middot;</span>
                      <span>{formatDate(note.createdAt)}</span>
                      {note.updatedAt !== note.createdAt && (
                        <span className="italic">(edited)</span>
                      )}
                    </div>
                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(note.id)} disabled={!editContent.trim()}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                  {canEdit && user?.id === note.author.id && editingId !== note.id && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(note)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
