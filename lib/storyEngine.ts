// =============================================
// The Living Grimoire — Story Engine (Real AI)
// =============================================
// Bridges the frontend to the /api/generate-world backend.
// Also includes the original simulated fallback for offline/demo use.

import type { Genre, StoryTone, LivingWorld } from "./types";

/** Result returned from the generation process */
export interface GenerationResult {
  world: LivingWorld;
  collectionName: string;
  worldId: string;
  cached: boolean;
}

/**
 * Generate a Living World by calling the real AI backend.
 * This hits /api/generate-world which:
 *   1. Checks if the world already exists in the global DB
 *   2. If not, fetches on-chain NFT metadata from Ritual Chain
 *   3. Calls OpenAI to generate the structured world
 *   4. Saves it globally so all users see the same lore
 */
export async function generateLivingWorld(
  contractAddress: string,
  collectionName: string,
  genre: Genre,
  tone: StoryTone
): Promise<GenerationResult> {
  const response = await fetch("/api/generate-world", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contractAddress,
      collectionName,
      genre,
      tone,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ??
        `Generation failed with status ${response.status}`
    );
  }

  const data = await response.json();

  return {
    world: data.world as LivingWorld,
    collectionName: data.collectionName as string,
    worldId: data.worldId as string,
    cached: data.cached as boolean,
  };
}

// ── Simulated fallback (for offline/demo use) ──────────────────

/**
 * Generate a simulated Living World without hitting any API.
 * Useful for demos, testing, or when no OpenAI key is configured.
 */
export async function generateSimulatedWorld(
  collectionName: string,
  genre: Genre,
  tone: StoryTone
): Promise<LivingWorld> {
  // Simulate processing time
  await new Promise((r) => setTimeout(r, 2000));

  const uid = () => Math.random().toString(36).slice(2, 10);

  const genreThemes: Record<Genre, { factions: string[]; locNames: string[]; charNames: string[] }> = {
    fantasy: {
      factions: ["The Silver Covenant", "The Ember Sworn", "Order of the Twilight Veil"],
      locNames: ["The Obsidian Spire", "Thornwood Hollow", "Crystalmere Lake"],
      charNames: ["Aelindra", "Theron", "Maelys", "Corvath", "Seraphine"],
    },
    scifi: {
      factions: ["Stellar Accord", "The Synth Collective", "Freeport Alliance"],
      locNames: ["Station Omega-9", "The Neon Undercity", "Quantum Spire"],
      charNames: ["Commander Vex", "Dr. Lyra Solis", "Unit-77", "Nova Zheng", "Echo"],
    },
    mythology: {
      factions: ["The Olympians", "The Titans", "The Fates"],
      locNames: ["Mount Olympus", "The River Styx", "The Labyrinth"],
      charNames: ["Prometheus", "Asteria", "Typhon", "Selene", "Orpheus"],
    },
    cyberpunk: {
      factions: ["NetRunners Guild", "CorpSec Elite", "The Underground"],
      locNames: ["The Undernet", "Chrome District", "Neural Hub"],
      charNames: ["Neon", "Cipher", "Glitch", "Raven Black", "Zero Cool"],
    },
    horror: {
      factions: ["The Awakened", "Order of the Black Flame", "The Forgotten"],
      locNames: ["Ravensworth Manor", "The Drowning Chapel", "Blackmoor Forest"],
      charNames: ["Dr. Morwen", "The Hollow Man", "Sister Agatha", "Vincent Crale"],
    },
    adventure: {
      factions: ["The Pathfinders", "Storm Chasers", "The Cartographers Guild"],
      locNames: ["The Lost Temple", "Serpent's Cove", "Thunder Peak"],
      charNames: ["Captain Flint", "Maya Storm", "Rook", "Isabella Cruz"],
    },
  };

  const theme = genreThemes[genre];

  const characters = theme.charNames.map((name, i) => ({
    id: uid(),
    name,
    role: ["Protagonist", "Guardian", "Trickster", "Sage", "Warrior"][i % 5],
    traits: ["brave", "cunning", "loyal"].slice(0, 3),
    backstory: `${name} emerged from the heart of the ${collectionName} world, shaped by forces beyond mortal understanding. Their journey has only just begun.`,
    appearance: `${name} carries the unmistakable mark of their origin — a presence that commands attention and respect.`,
    faction: theme.factions[i % theme.factions.length],
    connections: [],
    imageHue: (i * 47 + 120) % 360,
  }));

  const locations = theme.locNames.map((name, i) => ({
    id: uid(),
    name,
    description: `${name} stands as a testament to the power and mystery of the ${collectionName} world. Few who enter leave unchanged.`,
    type: ["City", "Wilderness", "Ruins"][i % 3],
    atmosphere: ["Ancient and mystical", "Eerily serene", "Charged with energy"][i % 3],
    secrets: `Beneath ${name} lies a truth that could reshape the entire world.`,
    connectedCharacterIds: [characters[i % characters.length].id],
    imageHue: (i * 67 + 200) % 360,
  }));

  const chapters = [
    "The Awakening", "Into the Unknown", "The Gathering Storm", "The Final Stand"
  ].map((title, i) => ({
    id: uid(),
    number: i + 1,
    title,
    content: `Chapter ${i + 1} of the ${collectionName} saga begins in ${locations[i % locations.length].name}. ${characters[0].name} faces a challenge that will test everything they believe. The world holds its breath as destiny unfolds.`,
    characterIds: [characters[i % characters.length].id],
    locationId: locations[i % locations.length].id,
  }));

  return {
    lore: {
      origin: `The world of ${collectionName} was born from the convergence of ancient powers. In the beginning, there was only void — and then, a spark of creation that would echo through the ages.`,
      history: `Three great ages have shaped ${collectionName}. Each age brought new heroes, new conflicts, and new truths that built upon the foundations of the past.`,
      mythology: `The legends of ${collectionName} speak of a force that binds all living things — a thread of destiny that connects every soul to the greater tapestry of existence.`,
      factions: theme.factions.map((name) => ({
        name,
        description: `${name} has shaped the course of history through their unwavering commitment to their ideals.`,
        values: "Honor and purpose above all",
      })),
      prophecy: `"When the stars align and the old barriers fall, a champion shall rise from ${collectionName} to reshape the world — for better or worse."`,
    },
    characters,
    locations,
    chapters,
    generatedAt: Date.now(),
  };
}
