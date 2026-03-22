"use client";

import { useState } from "react";
import { Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { getActiveTrip, getTripNotes } from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionLead, StatusPill } from "@/components/shared/ui-helpers";

export function NotesView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const tripId = activeTrip?.id ?? "";
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const notes = getTripNotes(state, tripId);
  const addNote = useTripStore((s) => s.addNote);
  const removeNote = useTripStore((s) => s.removeNote);
  const toggleNotePin = useTripStore((s) => s.toggleNotePin);
  const updateNote = useTripStore((s) => s.updateNote);

  if (!activeTrip) return null;

  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags)));
  const filteredNotes = filterTag ? notes.filter((note) => note.tags.includes(filterTag)) : notes;
  const pinnedNotes = notes.filter((note) => note.pinned);

  const handleAddNote = () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    addNote({
      tripId: activeTrip.id,
      title: newTitle,
      body: newBody,
      tags: commitTagInput(newTagInput, newTags),
      pinned: false,
    });
    setNewTitle("");
    setNewBody("");
    setNewTagInput("");
    setNewTags([]);
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <SectionLead
          eyebrow="Capture"
          title="Quick notes"
          description="Capture a note, tag it, and keep it with the trip."
        />

        <div className="mt-5 space-y-4">
          <Input placeholder="Note title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Textarea
            placeholder="Write your note..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            className="min-h-28 bg-slate-50/70"
          />

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Tags</label>
                <Input
                  placeholder="Add comma-separated tags..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onBlur={() => {
                    setNewTags((current) => commitTagInput(newTagInput, current));
                    setNewTagInput("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setNewTags((current) => commitTagInput(newTagInput, current));
                      setNewTagInput("");
                    }
                  }}
                />
              </div>
              <Button className="shrink-0" onClick={handleAddNote} disabled={!newTitle.trim() || !newBody.trim()}>
                <Plus className="mr-1.5 size-4" /> Save note
              </Button>
            </div>

            {newTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newTags.map((tag) => (
                  <TagPill key={tag} tag={tag} onRemove={() => setNewTags((current) => current.filter((entry) => entry !== tag))} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionLead eyebrow="Pinned" title="Pinned notes" description={`${pinnedNotes.length} pinned note${pinnedNotes.length !== 1 ? "s" : ""}`} />

          {pinnedNotes.length > 0 ? (
            <div className="space-y-3">
              {pinnedNotes.map((note) => (
                <Card key={note.id} className="interactive-lift border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{note.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-4">{note.body}</p>
                    </div>
                    <Pin className="size-4 fill-amber-400 text-amber-500" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No pinned notes yet" description="Pin important notes to keep them easy to reach." />
          )}
        </div>

        <div className="space-y-4">
          <SectionLead eyebrow="Notes" title="All notes" description={`${filteredNotes.length} note${filteredNotes.length !== 1 ? "s" : ""} ready to review, sort, or pin.`} />

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant={filterTag === null ? "default" : "outline"} size="xs" onClick={() => setFilterTag(null)}>
                All
              </Button>
              {allTags.map((tag) => (
                <Button key={tag} variant={filterTag === tag ? "default" : "outline"} size="xs" onClick={() => setFilterTag(tag)}>
                  {tag}
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <EmptyState
                title="No notes yet"
                description="Capture route ideas, booking details, and reminders here."
              />
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
  const [editTags, setEditTags] = useState<string[]>(note.tags);
  const [editTagInput, setEditTagInput] = useState("");

  const handleSaveEdit = () => {
    onUpdate({ title: editTitle, body: editBody, tags: commitTagInput(editTagInput, editTags) });
    setEditTagInput("");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="interactive-lift border-slate-200 bg-white p-4 space-y-3">
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm font-semibold" />
        <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-20 text-sm bg-slate-50/70" />
        <div className="space-y-2">
          <Input
            placeholder="Add comma-separated tags..."
            value={editTagInput}
            onChange={(e) => setEditTagInput(e.target.value)}
            onBlur={() => {
              setEditTags((current) => commitTagInput(editTagInput, current));
              setEditTagInput("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEditTags((current) => commitTagInput(editTagInput, current));
                setEditTagInput("");
              }
            }}
          />
          {editTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editTags.map((tag) => (
                <TagPill key={tag} tag={tag} onRemove={() => setEditTags((current) => current.filter((entry) => entry !== tag))} />
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="xs" onClick={handleSaveEdit} className="flex-1">
            Save
          </Button>
          <Button size="xs" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="interactive-lift border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-950">{note.title}</h4>
            {note.pinned && <StatusPill label="Pinned" tone="warning" />}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{note.body}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-xs" onClick={onPin} title={note.pinned ? "Unpin" : "Pin"}>
            <Pin className={`size-3.5 ${note.pinned ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditTitle(note.title);
              setEditBody(note.body);
              setEditTags(note.tags);
              setEditTagInput("");
              setIsEditing(true);
            }}
          >
            <Pencil className="size-3.5 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onRemove}>
            <Trash2 className="size-3.5 text-rose-600" />
          </Button>
        </div>
      </div>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <StatusPill key={tag} label={tag} tone="muted" />
          ))}
        </div>
      )}
    </Card>
  );
}

function TagPill({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {tag}
      <button type="button" onClick={onRemove} className="rounded-full text-slate-400 transition-colors hover:text-slate-700">
        <X className="size-3" />
      </button>
    </span>
  );
}

function commitTagInput(input: string, existing: string[]) {
  const parsed = input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set([...existing, ...parsed]));
}
