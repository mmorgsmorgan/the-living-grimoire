// =============================================
// The Living Grimoire — Zustand Store
// =============================================

import { create } from "zustand";
import type { Collection, CreateWizardState, Genre, StoryTone } from "./types";

// ── Helpers ────────────────────────────────────────────────────

function loadCollections(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("grimoire-collections");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCollections(collections: Collection[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("grimoire-collections", JSON.stringify(collections));
  } catch {
    // Quota exceeded — silent fail
  }
}

// ── Store ──────────────────────────────────────────────────────

interface GrimoireStore {
  // Collections
  collections: Collection[];
  isHydrated: boolean;
  hydrate: () => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
  getCollection: (id: string) => Collection | undefined;

  // Create wizard
  wizard: CreateWizardState;
  setWizardStep: (step: CreateWizardState["step"]) => void;
  setWizardPath: (path: "import" | "new") => void;
  updateWizard: (updates: Partial<CreateWizardState>) => void;
  resetWizard: () => void;

  // Filters
  genreFilter: Genre | "all";
  searchQuery: string;
  setGenreFilter: (genre: Genre | "all") => void;
  setSearchQuery: (query: string) => void;
}

const defaultWizard: CreateWizardState = {
  step: "choose-path",
  path: null,
  contractAddress: "",
  name: "",
  description: "",
  genre: "fantasy",
  tone: "epic",
  nftCount: 0,
  generationStatus: "idle",
  generatedWorld: null,
};

export const useGrimoireStore = create<GrimoireStore>((set, get) => ({
  // Collections
  collections: [],
  isHydrated: false,

  hydrate: () => {
    const collections = loadCollections();
    set({ collections, isHydrated: true });
  },

  addCollection: (collection) => {
    const collections = [...get().collections, collection];
    saveCollections(collections);
    set({ collections });
  },

  updateCollection: (id, updates) => {
    const collections = get().collections.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    saveCollections(collections);
    set({ collections });
  },

  removeCollection: (id) => {
    const collections = get().collections.filter((c) => c.id !== id);
    saveCollections(collections);
    set({ collections });
  },

  getCollection: (id) => {
    return get().collections.find((c) => c.id === id);
  },

  // Wizard
  wizard: { ...defaultWizard },

  setWizardStep: (step) => set((s) => ({ wizard: { ...s.wizard, step } })),

  setWizardPath: (path) =>
    set((s) => ({ wizard: { ...s.wizard, path, step: "details" } })),

  updateWizard: (updates) =>
    set((s) => ({ wizard: { ...s.wizard, ...updates } })),

  resetWizard: () => set({ wizard: { ...defaultWizard } }),

  // Filters
  genreFilter: "all",
  searchQuery: "",

  setGenreFilter: (genre) => set({ genreFilter: genre }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
