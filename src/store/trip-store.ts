"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SEED_STATE } from "@/data/trip-seed";
import { genId } from "@/lib/trip-utils";
import type {
  AppMode,
  AppView,
  Attachment,
  AttachmentType,
  BookingStatus,
  BudgetCategory,
  BudgetLine,
  ChecklistItem,
  ChecklistScope,
  ChecklistSource,
  CountryRule,
  Day,
  DayType,
  Leg,
  Note,
  Stay,
  Stop,
  StopType,
  Trip,
  TripState,
  TripStatus,
  TripView,
} from "@/types/trip";

// ─── Initial state ────────────────────────────────────────────────────────────

function buildInitialState(): TripState {
  return {
    trips: [],
    stops: [],
    legs: [],
    days: [],
    stays: [],
    checklistItems: [],
    countryRules: [],
    budgetLines: [],
    notes: [],
    attachments: [],
    activeTripId: null,
    appMode: "planning",
    activeView: "route",
    activeTripView: "today",
    selectedDayId: null,
    executionDayId: null,
    expandedDayIds: [],
    ...SEED_STATE,
  };
}

// ─── Store type ───────────────────────────────────────────────────────────────

type TripStore = TripState & {
  // UI
  setAppMode: (mode: AppMode) => void;
  setActiveView: (view: AppView) => void;
  setActiveTripView: (view: TripView) => void;
  setActiveTripId: (id: string | null) => void;
  setSelectedDayId: (id: string | null) => void;
  setExecutionDayId: (id: string | null) => void;
  toggleExpandedDay: (id: string) => void;
  expandAllDays: (tripId: string) => void;
  collapseAllDays: () => void;

  // Trip CRUD
  createTrip: (data: Omit<Trip, "id" | "createdAt" | "status">) => string;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  duplicateTrip: (id: string) => string;
  setTripStatus: (id: string, status: TripStatus) => void;

  // Stops
  addStop: (data: Omit<Stop, "id">) => string;
  updateStop: (id: string, patch: Partial<Stop>) => void;
  removeStop: (id: string) => void;
  reorderStops: (tripId: string, fromPos: number, toPos: number) => void;

  // Legs
  addLeg: (data: Omit<Leg, "id">) => string;
  updateLeg: (id: string, patch: Partial<Leg>) => void;
  removeLeg: (id: string) => void;

  // Days
  addDay: (data: Omit<Day, "id">) => string;
  updateDay: (id: string, patch: Partial<Day>) => void;
  removeDay: (id: string) => void;

  // Stays
  createStay: (data: Omit<Stay, "id">) => string;
  updateStay: (id: string, patch: Partial<Stay>) => void;
  removeStay: (id: string) => void;

  // Checklist
  addChecklistItem: (data: Omit<ChecklistItem, "id">) => string;
  toggleChecklistItem: (id: string) => void;
  updateChecklistItem: (id: string, patch: Partial<ChecklistItem>) => void;
  removeChecklistItem: (id: string) => void;

  // Country rules
  addCountryRule: (data: Omit<CountryRule, "id">) => string;
  updateCountryRule: (id: string, patch: Partial<CountryRule>) => void;
  updateCountryRuleItemStatus: (
    ruleId: string,
    itemId: string,
    status: import("@/types/trip").ChecklistStatus
  ) => void;
  removeCountryRule: (id: string) => void;

  // Budget
  addBudgetLine: (data: Omit<BudgetLine, "id">) => string;
  updateBudgetLine: (id: string, patch: Partial<BudgetLine>) => void;
  removeBudgetLine: (id: string) => void;

  // Notes
  addNote: (data: Omit<Note, "id" | "createdAt">) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  toggleNotePin: (id: string) => void;

  // Attachments
  addAttachment: (data: Omit<Attachment, "id">) => string;
  removeAttachment: (id: string) => void;

  // Reset
  resetToSeed: () => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      // ── UI ──────────────────────────────────────────────────────────────────
      setAppMode: (appMode) => set({ appMode }),
      setActiveView: (activeView) => set({ activeView }),
      setActiveTripView: (activeTripView) => set({ activeTripView }),
      setActiveTripId: (activeTripId) => set({ activeTripId }),
      setSelectedDayId: (selectedDayId) => set({ selectedDayId }),
      setExecutionDayId: (executionDayId) => set({ executionDayId }),
      toggleExpandedDay: (id) =>
        set((s) => ({
          expandedDayIds: s.expandedDayIds.includes(id)
            ? s.expandedDayIds.filter((x) => x !== id)
            : [...s.expandedDayIds, id],
        })),
      expandAllDays: (tripId) =>
        set((s) => ({
          expandedDayIds: s.days.filter((d) => d.tripId === tripId).map((d) => d.id),
        })),
      collapseAllDays: () => set({ expandedDayIds: [] }),

      // ── Trip CRUD ────────────────────────────────────────────────────────────
      createTrip: (data) => {
        const id = genId("trip");
        set((s) => ({
          trips: [...s.trips, { ...data, id, status: "draft" as TripStatus, createdAt: new Date().toISOString() }],
          activeTripId: id,
        }));
        return id;
      },
      updateTrip: (id, patch) =>
        set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          stops: s.stops.filter((x) => x.tripId !== id),
          legs: s.legs.filter((x) => x.tripId !== id),
          days: s.days.filter((x) => x.tripId !== id),
          stays: s.stays.filter((x) => x.tripId !== id),
          checklistItems: s.checklistItems.filter((x) => x.tripId !== id),
          countryRules: s.countryRules.filter((x) => x.tripId !== id),
          budgetLines: s.budgetLines.filter((x) => x.tripId !== id),
          notes: s.notes.filter((x) => x.tripId !== id),
          attachments: s.attachments.filter((x) => x.tripId !== id),
          activeTripId: s.activeTripId === id ? null : s.activeTripId,
        })),
      duplicateTrip: (sourceId) => {
        const s = get();
        const source = s.trips.find((t) => t.id === sourceId);
        if (!source) return sourceId;

        const newTripId = genId("trip");
        const idMap = new Map<string, string>();
        const remap = (oldId: string, prefix: string) => {
          if (!idMap.has(oldId)) idMap.set(oldId, genId(prefix));
          return idMap.get(oldId)!;
        };

        const newTrip: Trip = {
          ...source,
          id: newTripId,
          name: `${source.name} (copy)`,
          status: "draft",
          createdAt: new Date().toISOString(),
        };

        const newStops = s.stops
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({ ...x, id: remap(x.id, "stop"), tripId: newTripId }));

        const newLegs = s.legs
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({
            ...x,
            id: remap(x.id, "leg"),
            tripId: newTripId,
            fromStopId: remap(x.fromStopId, "stop"),
            toStopId: remap(x.toStopId, "stop"),
          }));

        const newDays = s.days
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({
            ...x,
            id: remap(x.id, "day"),
            tripId: newTripId,
            legIds: x.legIds.map((lid) => remap(lid, "leg")),
            overnightStopId: remap(x.overnightStopId, "stop"),
            notes: "",
          }));

        const newStays = s.stays
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({
            ...x,
            id: remap(x.id, "stay"),
            tripId: newTripId,
            stopId: remap(x.stopId, "stop"),
            propertyName: "",
            address: "",
            bookingUrl: "",
            confirmationCode: "",
            status: "researching" as BookingStatus,
            costActual: 0,
            notes: "",
          }));

        const newChecklist = s.checklistItems
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({
            ...x,
            id: genId("cl"),
            tripId: newTripId,
            done: false,
            scope: x.scope.startsWith("day:")
              ? (`day:${remap(x.scope.slice(4), "day")}` as ChecklistScope)
              : x.scope.startsWith("stop:")
              ? (`stop:${remap(x.scope.slice(5), "stop")}` as ChecklistScope)
              : x.scope,
          }));

        const newRules = s.countryRules
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({
            ...x,
            id: genId("cr"),
            tripId: newTripId,
            items: x.items.map((i) => ({ ...i, status: "todo" as const })),
          }));

        const newBudget = s.budgetLines
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({ ...x, id: genId("bl"), tripId: newTripId, actual: 0 }));

        const newNotes = s.notes
          .filter((x) => x.tripId === sourceId)
          .map((x) => ({
            ...x,
            id: genId("note"),
            tripId: newTripId,
            body: "",
            createdAt: new Date().toISOString(),
          }));

        set((prev) => ({
          trips: [...prev.trips, newTrip],
          stops: [...prev.stops, ...newStops],
          legs: [...prev.legs, ...newLegs],
          days: [...prev.days, ...newDays],
          stays: [...prev.stays, ...newStays],
          checklistItems: [...prev.checklistItems, ...newChecklist],
          countryRules: [...prev.countryRules, ...newRules],
          budgetLines: [...prev.budgetLines, ...newBudget],
          notes: [...prev.notes, ...newNotes],
          activeTripId: newTripId,
        }));

        return newTripId;
      },
      setTripStatus: (id, status) =>
        set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, status } : t)) })),

      // ── Stops ────────────────────────────────────────────────────────────────
      addStop: (data) => {
        const id = genId("stop");
        set((s) => ({ stops: [...s.stops, { ...data, id }] }));
        return id;
      },
      updateStop: (id, patch) =>
        set((s) => ({ stops: s.stops.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeStop: (id) =>
        set((s) => ({
          stops: s.stops.filter((x) => x.id !== id),
          stays: s.stays.filter((x) => x.stopId !== id),
        })),
      reorderStops: (tripId, fromPos, toPos) =>
        set((s) => {
          const tripStops = s.stops
            .filter((x) => x.tripId === tripId)
            .sort((a, b) => a.position - b.position);
          const [moved] = tripStops.splice(fromPos, 1);
          tripStops.splice(toPos, 0, moved);
          const updated = tripStops.map((st, i) => ({ ...st, position: i }));
          return {
            stops: s.stops.map(
              (st) => updated.find((u) => u.id === st.id) ?? st
            ),
          };
        }),

      // ── Legs ─────────────────────────────────────────────────────────────────
      addLeg: (data) => {
        const id = genId("leg");
        set((s) => ({ legs: [...s.legs, { ...data, id }] }));
        return id;
      },
      updateLeg: (id, patch) =>
        set((s) => ({ legs: s.legs.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeLeg: (id) =>
        set((s) => ({
          legs: s.legs.filter((x) => x.id !== id),
          days: s.days.map((d) => ({ ...d, legIds: d.legIds.filter((lid) => lid !== id) })),
        })),

      // ── Days ─────────────────────────────────────────────────────────────────
      addDay: (data) => {
        const id = genId("day");
        set((s) => ({ days: [...s.days, { ...data, id }] }));
        return id;
      },
      updateDay: (id, patch) =>
        set((s) => ({ days: s.days.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeDay: (id) =>
        set((s) => ({
          days: s.days.filter((x) => x.id !== id),
          checklistItems: s.checklistItems.filter((x) => x.scope !== `day:${id}`),
        })),

      // ── Stays ─────────────────────────────────────────────────────────────────
      createStay: (data) => {
        const id = genId("stay");
        set((s) => ({ stays: [...s.stays, { ...data, id }] }));
        return id;
      },
      updateStay: (id, patch) =>
        set((s) => ({ stays: s.stays.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeStay: (id) =>
        set((s) => ({
          stays: s.stays.filter((x) => x.id !== id),
          attachments: s.attachments.filter((x) => x.stayId !== id),
        })),

      // ── Checklist ────────────────────────────────────────────────────────────
      addChecklistItem: (data) => {
        const id = genId("cl");
        set((s) => ({ checklistItems: [...s.checklistItems, { ...data, id }] }));
        return id;
      },
      toggleChecklistItem: (id) =>
        set((s) => ({
          checklistItems: s.checklistItems.map((x) =>
            x.id === id ? { ...x, done: !x.done } : x
          ),
        })),
      updateChecklistItem: (id, patch) =>
        set((s) => ({
          checklistItems: s.checklistItems.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeChecklistItem: (id) =>
        set((s) => ({ checklistItems: s.checklistItems.filter((x) => x.id !== id) })),

      // ── Country rules ─────────────────────────────────────────────────────────
      addCountryRule: (data) => {
        const id = genId("cr");
        set((s) => ({ countryRules: [...s.countryRules, { ...data, id }] }));
        return id;
      },
      updateCountryRule: (id, patch) =>
        set((s) => ({
          countryRules: s.countryRules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      updateCountryRuleItemStatus: (ruleId, itemId, status) =>
        set((s) => ({
          countryRules: s.countryRules.map((r) =>
            r.id === ruleId
              ? {
                  ...r,
                  items: r.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
                }
              : r
          ),
        })),
      removeCountryRule: (id) =>
        set((s) => ({ countryRules: s.countryRules.filter((x) => x.id !== id) })),

      // ── Budget ────────────────────────────────────────────────────────────────
      addBudgetLine: (data) => {
        const id = genId("bl");
        set((s) => ({ budgetLines: [...s.budgetLines, { ...data, id }] }));
        return id;
      },
      updateBudgetLine: (id, patch) =>
        set((s) => ({
          budgetLines: s.budgetLines.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeBudgetLine: (id) =>
        set((s) => ({ budgetLines: s.budgetLines.filter((x) => x.id !== id) })),

      // ── Notes ─────────────────────────────────────────────────────────────────
      addNote: (data) => {
        const id = genId("note");
        set((s) => ({
          notes: [{ ...data, id, createdAt: new Date().toISOString() }, ...s.notes],
        }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({ notes: s.notes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((x) => x.id !== id) })),
      toggleNotePin: (id) =>
        set((s) => ({
          notes: s.notes.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)),
        })),

      // ── Attachments ───────────────────────────────────────────────────────────
      addAttachment: (data) => {
        const id = genId("att");
        set((s) => ({ attachments: [...s.attachments, { ...data, id }] }));
        return id;
      },
      removeAttachment: (id) =>
        set((s) => ({ attachments: s.attachments.filter((x) => x.id !== id) })),

      // ── Reset ─────────────────────────────────────────────────────────────────
      resetToSeed: () => set(buildInitialState()),
    }),
    {
      name: "road-trip-planner-v3",
      version: 3,
      migrate: (persisted) => {
        // If persisted state is unreadable or from old schema, reset to seed
        if (
          !persisted ||
          typeof persisted !== "object" ||
          !("trips" in (persisted as object))
        ) {
          return buildInitialState();
        }
        return persisted as TripState;
      },
    }
  )
);
