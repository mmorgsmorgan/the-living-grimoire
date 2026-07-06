// =============================================
// The Living Grimoire — Core Types
// =============================================

/** Genre categories for NFT story worlds */
export type Genre = "fantasy" | "scifi" | "mythology" | "cyberpunk" | "horror" | "adventure";

/** Tone of the generated narrative */
export type StoryTone = "epic" | "dark" | "whimsical" | "mysterious" | "heroic" | "tragic";

/** Status of AI story generation */
export type GenerationStatus = "idle" | "analyzing" | "generating" | "complete" | "error";

/** A character in the NFT's living world */
export interface Character {
  id: string;
  name: string;
  role: string;           // e.g. "Protagonist", "Guardian", "Trickster"
  traits: string[];       // e.g. ["brave", "cunning", "loyal"]
  backstory: string;
  appearance: string;
  faction?: string;
  connections: string[];  // IDs of connected characters
  imageHue: number;       // For generated avatar color
}

/** A location in the NFT's living world */
export interface Location {
  id: string;
  name: string;
  description: string;
  type: string;           // e.g. "City", "Dungeon", "Forest", "Temple"
  atmosphere: string;
  secrets: string;
  connectedCharacterIds: string[];
  imageHue: number;
}

/** A chapter in the collection's story */
export interface StoryChapter {
  id: string;
  number: number;
  title: string;
  content: string;        // The story text
  characterIds: string[]; // Characters featured in this chapter
  locationId?: string;    // Primary location
}

/** The lore / world mythology */
export interface WorldLore {
  origin: string;         // How the world began
  history: string;        // Key historical events
  mythology: string;      // Myths and legends
  factions: {
    name: string;
    description: string;
    values: string;
  }[];
  prophecy?: string;      // An ominous prophecy
}

/** A complete living world attached to an NFT collection */
export interface LivingWorld {
  lore: WorldLore;
  characters: Character[];
  locations: Location[];
  chapters: StoryChapter[];
  generatedAt: number;    // timestamp
}

/** An NFT collection on the platform */
export interface Collection {
  id: string;
  name: string;
  description: string;
  contractAddress?: string;
  chainId?: number;
  genre: Genre;
  tone: StoryTone;
  coverHue: number;       // For generated cover gradient
  nftCount: number;
  world?: LivingWorld;
  createdAt: number;
  creatorAddress?: string;
  status: "draft" | "generating" | "published";
}

/** Simplified NFT data for display */
export interface NFTItem {
  tokenId: number;
  name?: string;
  description?: string;
  image?: string;
  attributes: { trait_type: string; value: string }[];
}

/** Create wizard step */
export type CreateStep = "choose-path" | "details" | "generating" | "preview" | "published";

/** Wizard state */
export interface CreateWizardState {
  step: CreateStep;
  path: "import" | "new" | null;
  contractAddress: string;
  name: string;
  description: string;
  genre: Genre;
  tone: StoryTone;
  nftCount: number;
  generationStatus: GenerationStatus;
  generatedWorld: LivingWorld | null;
}
