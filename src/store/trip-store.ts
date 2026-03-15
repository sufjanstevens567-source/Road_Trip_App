"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { TRIP_SEED } from "@/data/trip-seed";
import {
  cloneBookings,
  cloneBudgetItems,
  cloneComplianceCountries,
  cloneDays,
  cloneNotes,
  cloneVehicleChecks,
} from "@/lib/trip-utils";
import type {
  AppView,
  ComplianceStatus,
  NoteCategory,
  RouteVariantId,
  TripDay,
  TripStateData,
  VehicleStatus,
} from "@/types/trip";

function buildInitialState(routeVariant: RouteVariantId = "bohinj"): TripStateData {
  return {
    routeVariant,
    activeView: "today",
    selectedDayId: TRIP_SEED.defaultSelectedDayId,
    executionDayId: TRIP_SEED.defaultExecutionDayId,
    expandedDayIds: [...TRIP_SEED.defaultExpandedDayIds],
    days: cloneDays(TRIP_SEED.routeVariants[routeVariant].days),
    bookings: cloneBookings(TRIP_SEED.bookings),
    complianceCountries: cloneComplianceCountries(TRIP_SEED.complianceCountries),
    budgetItems: cloneBudgetItems(TRIP_SEED.budgetItems),
    vehicleChecks: cloneVehicleChecks(TRIP_SEED.vehicleChecks),
    notes: cloneNotes(TRIP_SEED.notes),
  };
}

type TripStore = TripStateData & {
  setActiveView: (view: AppView) => void;
  setRouteVariant: (variant: RouteVariantId) => void;
  setSelectedDayId: (dayId: string) => void;
  setExecutionDayId: (dayId: string) => void;
  toggleExpandedDay: (dayId: string) => void;
  expandAllDays: () => void;
  collapseAllDays: () => void;
  toggleChecklistItem: (dayId: string, itemId: string) => void;
  updateDayText: (dayId: string, field: "notes" | "parkingStrategy" | "parkingDetails" | "accommodationName" | "accommodationDetails", value: string) => void;
  updateBooking: (bookingId: string, field: "propertyName" | "status" | "parkingIncluded" | "cancellationPolicy" | "checkInWindow" | "notes" | "confirmationCode", value: string | boolean) => void;
  updateComplianceItemStatus: (countryId: string, itemId: string, status: ComplianceStatus) => void;
  updateBudgetItem: (itemId: string, field: "planned" | "actual" | "label", value: number | string) => void;
  updateVehicleCheck: (itemId: string, status: VehicleStatus, note?: string) => void;
  addNote: (payload: { title: string; body: string; category: NoteCategory }) => void;
  updateNote: (noteId: string, field: "title" | "body" | "category" | "pinned", value: string | boolean) => void;
  toggleRiskResolved: (dayId: string, riskId: string) => void;
  resetTrip: () => void;
};

function mergeEditableFields(sourceDay: TripDay, existingDay?: TripDay): TripDay {
  if (!existingDay) return sourceDay;
  return {
    ...sourceDay,
    accommodationName: existingDay.accommodationName,
    accommodationStatus: existingDay.accommodationStatus,
    accommodationDetails: existingDay.accommodationDetails,
    parkingStrategy: existingDay.parkingStrategy,
    parkingDetails: existingDay.parkingDetails,
    notes: existingDay.notes,
    checklist: sourceDay.checklist.map((item) => {
      const match = existingDay.checklist.find((existingItem) => existingItem.id === item.id);
      return match ? { ...item, done: match.done } : item;
    }),
    risks: sourceDay.risks.map((risk) => {
      const match = existingDay.risks.find((existingRisk) => existingRisk.id === risk.id);
      return match ? { ...risk, resolved: match.resolved } : risk;
    }),
  };
}

function normalizeRouteVariant(value: unknown): RouteVariantId {
  if (value === "bled") return "bled";
  return "bohinj";
}

function normalizeActiveView(value: unknown): AppView {
  switch (value) {
    case "today":
    case "journey":
    case "route":
    case "stays":
    case "prep":
    case "notes":
      return value;
    case "overview":
      return "today";
    case "itinerary":
      return "journey";
    case "map":
      return "route";
    case "bookings":
    case "budget":
      return "stays";
    case "compliance":
    case "readiness":
      return "prep";
    default:
      return "today";
  }
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),
      setActiveView: (activeView) => set({ activeView }),
      setRouteVariant: (routeVariant) =>
        set((state) => ({
          routeVariant,
          days: cloneDays(TRIP_SEED.routeVariants[routeVariant].days).map((day) =>
            mergeEditableFields(day, state.days.find((existingDay) => existingDay.id === day.id))
          ),
        })),
      setSelectedDayId: (selectedDayId) => set({ selectedDayId }),
      setExecutionDayId: (executionDayId) => set({ executionDayId }),
      toggleExpandedDay: (dayId) =>
        set((state) => ({
          expandedDayIds: state.expandedDayIds.includes(dayId)
            ? state.expandedDayIds.filter((item) => item !== dayId)
            : [...state.expandedDayIds, dayId],
        })),
      expandAllDays: () => set((state) => ({ expandedDayIds: state.days.map((day) => day.id) })),
      collapseAllDays: () => set({ expandedDayIds: [] }),
      toggleChecklistItem: (dayId, itemId) =>
        set((state) => ({
          days: state.days.map((day) =>
            day.id === dayId
              ? { ...day, checklist: day.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)) }
              : day
          ),
        })),
      updateDayText: (dayId, field, value) =>
        set((state) => ({
          days: state.days.map((day) => (day.id === dayId ? { ...day, [field]: value } : day)),
        })),
      updateBooking: (bookingId, field, value) =>
        set((state) => {
          const updatedBookings = state.bookings.map((booking) => (booking.id === bookingId ? { ...booking, [field]: value } : booking));
          return {
            bookings: updatedBookings,
            days: state.days.map((day) => {
              const booking = updatedBookings.find((entry) => entry.stopId === day.overnightStopId);
              if (!booking) return day;
              return {
                ...day,
                accommodationStatus: booking.status,
                accommodationName: booking.propertyName,
              };
            }),
          };
        }),
      updateComplianceItemStatus: (countryId, itemId, status) =>
        set((state) => ({
          complianceCountries: state.complianceCountries.map((country) =>
            country.id === countryId
              ? { ...country, items: country.items.map((item) => (item.id === itemId ? { ...item, status } : item)) }
              : country
          ),
        })),
      updateBudgetItem: (itemId, field, value) =>
        set((state) => ({
          budgetItems: state.budgetItems.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
        })),
      updateVehicleCheck: (itemId, status, note) =>
        set((state) => ({
          vehicleChecks: state.vehicleChecks.map((item) => (item.id === itemId ? { ...item, status, note: note ?? item.note } : item)),
        })),
      addNote: ({ title, body, category }) =>
        set((state) => ({
          notes: [{ id: `note-${Date.now()}`, title, body, category, pinned: false }, ...state.notes],
        })),
      updateNote: (noteId, field, value) =>
        set((state) => ({
          notes: state.notes.map((note) => (note.id === noteId ? { ...note, [field]: value } : note)),
        })),
      toggleRiskResolved: (dayId, riskId) =>
        set((state) => ({
          days: state.days.map((day) =>
            day.id === dayId ? { ...day, risks: day.risks.map((risk) => (risk.id === riskId ? { ...risk, resolved: !risk.resolved } : risk)) } : day
          ),
        })),
      resetTrip: () => set(buildInitialState(get().routeVariant)),
    }),
    {
      name: "road-trip-os-state",
      version: 2,
      partialize: (state) => ({
        routeVariant: state.routeVariant,
        activeView: state.activeView,
        selectedDayId: state.selectedDayId,
        executionDayId: state.executionDayId,
        expandedDayIds: state.expandedDayIds,
        days: state.days,
        bookings: state.bookings,
        complianceCountries: state.complianceCountries,
        budgetItems: state.budgetItems,
        vehicleChecks: state.vehicleChecks,
        notes: state.notes,
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") return buildInitialState();
        const routeVariant = normalizeRouteVariant((persistedState as Partial<TripStore>).routeVariant);
        const baseState = buildInitialState(routeVariant);
        const selectedDayId = (persistedState as Partial<TripStore>).selectedDayId;
        const executionDayId = (persistedState as Partial<TripStore>).executionDayId;
        const expandedDayIds = (persistedState as Partial<TripStore>).expandedDayIds;
        return {
          ...baseState,
          activeView: normalizeActiveView((persistedState as Partial<TripStore>).activeView),
          selectedDayId: typeof selectedDayId === "string" ? selectedDayId : baseState.selectedDayId,
          executionDayId: typeof executionDayId === "string" ? executionDayId : baseState.executionDayId,
          expandedDayIds: Array.isArray(expandedDayIds) ? expandedDayIds.filter((value): value is string => typeof value === "string") : baseState.expandedDayIds,
        };
      },
    }
  )
);
