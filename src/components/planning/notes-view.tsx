"use client";

import { Plus, Trash2, Pin, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripNotes,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionLead, StatusPill } from "@/components/shared/ui-helpers";

export function NotesView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  if (!activeTrip) return null;

  const notes = getTripNotes(state, activeTrip.id);
  const addNote = useTripStore((s) => s.addNote);
  const removeNote = useTripStore((s) => s.removeNote);
  const toggleNotePin = useTripStore((s) => s.toggleNotePin);
  const updateNote = useTripStore((s) => s.updateNote);

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));
  const filteredNotes = filterTag
    ? notes.filter((n) => n.tags.includes(filterTag))
    : notes;

  const handleAddNote = () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    addNote({
      tripId: activeTrip.id,
      title: newTitle,
      body: newBody,
      tags: [],
      pinned: false,
    });
    setNewTitle("");
    setNewBody("");
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Quick capture */}
      <div className="space-y-4">
        <SectionLead eyebrow="Capture" title="Quick notes" />

        <Card className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
              Title
            </label>
            <Input
              placeholder="Note title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
              Body
            </label>
            <Textarea
              placeholder="Write your note..."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className="min-h-24"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleAddNote}
            disabled={!newTitle.trim() || !newBody.trim()}
          >
            <Plus className="mr-1.5 size-4" /> Save note
          </Button>
        </Card>

        {/* Recent pinned */}
        {notes.filter((n) => n.pinned).length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pinned
            </p>
            {notes
              .filter((n) => n.pinned)
              .slice(0, 3)
              .map((note) => (
                <Card key={note.id} className="p-3 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{note.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {note.body}
                  </p>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Right: All notes with filters */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <SectionLead eyebrow="Notes" title="All notes" description={`${filteredNotes.length} note${filteredNotes.length !== 1 ? "s" : ""}`} />
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterTag === null ? "default" : "outline"}
              size="xs"
              onClick={() => setFilterTag(null)}
            >
              All
            </Button>
            {allTags.map((tag) => (
              <Button
                key={tag}
                variant={filterTag === tag ? "default" : "outline"}
                size="xs"
                onClick={() => setFilterTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}

        {/* Notes list */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p>No notes yet</p>
            </Card>
          ) : (
            filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPin={() => toggleNotePin(note.id)}
                onRemove={() => removeNote(note.id)}
                onUpdate={(patch) => updateNote(note.id, patch)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onPin,
  onRemove,
  onUpdate,
}: {
  note: ReturnType<typeof getTripNotes>[0];
  onPin: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<typeof note>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editBody, setEditBody] = useState(note.body);

  const handleSaveEdit = () => {
    onUpdate({ title: editTitle, body: editBody });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="p-3 space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="text-sm font-semibold"
        />
        <Textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          className="min-h-16 text-sm"
        />
        <div className="flex gap-2">
          <Button size="xs" onClick={handleSaveEdit} className="flex-1">
            Save
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-foreground">{note.title}</h4>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={onPin}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin
              className={`size-3.5 ${
                note.pinned ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5 text-red-500" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{note.body}</p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <StatusPill key={tag} label={tag} tone="muted" />
          ))}
        </div>
      )}
    </Card>
  );
}
