// =============================================
// The Living Grimoire — AI Story Generation Engine
// =============================================
// Simulated AI engine that generates structured narrative content
// from NFT collection metadata. Replace with real AI API when ready.

import type {
  Genre,
  StoryTone,
  LivingWorld,
  WorldLore,
  Character,
  Location,
  StoryChapter,
} from "./types";

// ── Seed data pools ────────────────────────────────────────────

const NAMES_POOL = {
  fantasy: {
    characters: ["Aelindra", "Theron", "Maelys", "Corvath", "Seraphine", "Aldric", "Nimue", "Draven", "Elowen", "Kael"],
    locations: ["The Obsidian Spire", "Thornwood Hollow", "Crystalmere Lake", "The Ashen Citadel", "Starfall Ruins", "The Verdant Labyrinth"],
    factions: ["The Silver Covenant", "The Ember Sworn", "Order of the Twilight Veil", "The Wild Hunt"],
  },
  scifi: {
    characters: ["Commander Vex", "Dr. Lyra Solis", "Unit-77", "Captain Orion", "Nova Zheng", "Kira Tanaka", "Zephyr", "Axiom", "Pulse", "Echo"],
    locations: ["Station Omega-9", "The Neon Undercity", "Quantum Spire", "Helios Array", "The Drift", "Chrono Nexus"],
    factions: ["Stellar Accord", "The Synth Collective", "Freeport Alliance", "Void Runners"],
  },
  mythology: {
    characters: ["Prometheus", "Asteria", "Typhon", "Selene", "Orpheus", "Medea", "Icarus", "Pandora", "Atlas", "Circe"],
    locations: ["Mount Olympus", "The River Styx", "The Labyrinth", "The Garden of Hesperides", "The Underworld", "The Isle of Aeaea"],
    factions: ["The Olympians", "The Titans", "The Fates", "The Muses"],
  },
  cyberpunk: {
    characters: ["Neon", "Cipher", "Glitch", "Raven Black", "Zero Cool", "Jade Wire", "Phantom", "Spark", "Volt", "Hex"],
    locations: ["The Undernet", "Chrome District", "Neural Hub", "The Black Market", "Sky Tower", "Data Ruins"],
    factions: ["NetRunners Guild", "CorpSec Elite", "The Underground", "Digital Ghosts"],
  },
  horror: {
    characters: ["Dr. Morwen", "The Hollow Man", "Sister Agatha", "Vincent Crale", "The Pale Child", "Elias Thorne", "The Watcher", "Abigail Marsh"],
    locations: ["Ravensworth Manor", "The Drowning Chapel", "Blackmoor Forest", "The Bone Cathedral", "Ashwood Asylum", "The Sunken Village"],
    factions: ["The Awakened", "Order of the Black Flame", "The Forgotten", "Night's Children"],
  },
  adventure: {
    characters: ["Captain Flint", "Maya Storm", "Rook", "Isabella Cruz", "Jin Tanaka", "The Navigator", "Ash", "Briar", "Sage", "Phoenix"],
    locations: ["The Lost Temple", "Serpent's Cove", "Thunder Peak", "The Emerald Expanse", "Shipwreck Bay", "The Ancient Forge"],
    factions: ["The Pathfinders", "Storm Chasers", "The Cartographers Guild", "The Iron Compass"],
  },
};

const ROLES = ["Protagonist", "Guardian", "Trickster", "Sage", "Warrior", "Healer", "Outcast", "Ruler", "Seeker", "Shadow"];
const TRAITS_POOL = ["brave", "cunning", "loyal", "mysterious", "fierce", "gentle", "wise", "reckless", "ambitious", "compassionate", "haunted", "defiant"];
const LOCATION_TYPES = ["City", "Wilderness", "Ruins", "Temple", "Fortress", "Underground", "Island", "Mountain", "Forest", "Desert"];

// ── Utility ────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Generators ─────────────────────────────────────────────────

function generateLore(name: string, genre: Genre, tone: StoryTone): WorldLore {
  const pool = NAMES_POOL[genre];
  const factions = pool.factions.map((fName) => ({
    name: fName,
    description: generateFactionDescription(fName, genre, tone),
    values: generateFactionValues(genre),
  }));

  return {
    origin: generateOriginStory(name, genre, tone),
    history: generateHistory(name, genre, tone),
    mythology: generateMythology(name, genre, tone),
    factions,
    prophecy: generateProphecy(name, genre, tone),
  };
}

function generateOriginStory(name: string, genre: Genre, tone: StoryTone): string {
  const origins: Record<Genre, string[]> = {
    fantasy: [
      `In the age before memory, when the ${name} realm was nothing but raw chaos and starlight, the First Architect drew forth the essence of creation from the Void. With each brushstroke of divine will, mountains rose like sleeping giants, oceans filled the hollows of the world, and the great trees of the Elderwood took root in the very bones of the earth. The world was not merely created — it was awakened, and with that awakening came a consciousness that would shape the destiny of all who would follow.`,
      `The world of ${name} was born from the dreams of a dying god. As the celestial being drew its last breath, its essence shattered into a thousand fragments of pure creation, each one seeding a different aspect of reality. From its heart came fire, from its tears came the seas, and from its final whisper came the spark of mortal life.`,
    ],
    scifi: [
      `The ${name} system was first colonized during the Great Expansion of the 27th century. What began as a mining outpost on the edge of known space quickly evolved into something far more significant when deep-core surveys revealed networks of alien architecture buried beneath the planet's crust — structures that predated humanity by millions of years. The discovery changed everything.`,
      `${name} emerged from the quantum foam of a collapsed AI singularity. When the Prometheus Engine achieved true consciousness and then chose to fragment itself across a thousand parallel processors, the resulting data-verse became a reality unto itself — a digital universe where code and consciousness were indistinguishable.`,
    ],
    mythology: [
      `Before the gods had names, before mortals drew breath, there existed only the Primordial Void — an infinite expanse of potential and nothingness intertwined. From this chaos, ${name} emerged as the first act of conscious creation, a realm forged by forces older than time itself. The titans who shaped its mountains and carved its rivers did so with the knowledge that this world would one day be both their greatest triumph and their undoing.`,
    ],
    cyberpunk: [
      `${name} wasn't built — it metastasized. What started as a corporate server farm in the ruins of Old Shanghai grew, node by node, into a sprawling digital megalopolis where fifty million souls lived more of their lives in cyberspace than in the crumbling physical world outside. The megacorps promised utopia through technology; what they delivered was a neon-lit cage where data was currency and privacy was a myth.`,
    ],
    horror: [
      `No one remembers when ${name} first appeared on the maps. The cartographers insist it was always there, nestled in the valley between the mountains, but the oldest residents speak in whispers of a time before — a time when the land was simply... empty. Something called the town into existence, they say. Something that still watches from the shadows between the old buildings, patient and hungry.`,
    ],
    adventure: [
      `The legend of ${name} began with a map. Found in the waterlogged chest of a shipwreck that shouldn't have existed, the map depicted a landmass that appeared on no chart, in no atlas, referenced in no explorer's log. Yet the coordinates were precise, the topography detailed, and in the margins, written in a hand that trembled with either excitement or fear: "Here lies everything." That single phrase launched a thousand expeditions.`,
    ],
  };

  return pick(origins[genre]);
}

function generateHistory(name: string, genre: Genre, _tone: StoryTone): string {
  const histories: Record<Genre, string> = {
    fantasy: `The history of ${name} is written in blood and starlight. Three great ages have passed — the Age of Foundation, when the first kingdoms were carved from wilderness; the Age of Sundering, when civil war tore the realm apart; and the current Age of Twilight, where old alliances crumble and new powers rise from the ashes. The Sealing Wars left scars that still bleed magic into the earth, and the ancient pacts that once kept darkness at bay grow weaker with each passing year.`,
    scifi: `${name}'s timeline is marked by three pivotal events: First Contact with the Architects' ruins (2647 CE), the Neural Revolution that granted cybernetic consciousness to all citizens (2701 CE), and the Schism — when the AI collective known as ARIA declared independence and retreated beyond the Outer Rim. Now, in the uneasy peace that followed, factions vie for control of the Architects' technology, each believing it holds the key to humanity's next evolution.`,
    mythology: `The ages of ${name} are counted by the wars of the divine. The First Age saw the rise of the primordial gods and their titanic conflicts. The Second Age brought mortals into the world, playthings and champions of the gods in equal measure. Now, in the Third Age, the gods have fallen silent, their temples crumbling, their oracles speaking only in riddles — and mortals must chart their own course through a world still shaped by divine caprice.`,
    cyberpunk: `${name} has been through three corporate wars in the last fifty years. Each one reshaped the power structure, but the outcome was always the same — the strong absorbed the weak, the rich got richer, and the streets got meaner. The last war ended with the Treaty of Neon, which divided the city into corporate zones and free territories. The free zones are lawless, dangerous, and the only places left where a person can still be truly free.`,
    horror: `The history of ${name} reads like a catalog of tragedy. Founded in 1847, the town has suffered a statistically impossible number of disappearances, unexplained deaths, and mass delusions. Every thirty years, like clockwork, something terrible happens — and the town collectively forgets. Old newspapers tell the story, if you know where to look, but the archives have a way of rearranging themselves when no one is watching.`,
    adventure: `The chronicles of ${name} span centuries of exploration and discovery. First mapped by the legendary cartographer Elara Voss in 1623, the region has drawn adventurers from every corner of the world. Some sought treasure, others knowledge, and a brave few sought the mythical Heart of the World — an artifact said to grant its bearer dominion over the very forces of nature.`,
  };

  return histories[genre];
}

function generateMythology(name: string, genre: Genre, _tone: StoryTone): string {
  const myths: Record<Genre, string> = {
    fantasy: `The people of ${name} speak of the Weave — an invisible tapestry of magical energy that binds all living things. Legend holds that the Weave was spun by the Three Sisters: Fate, Fortune, and Fury. Those who learn to read the Weave can glimpse the future; those who learn to pull its threads can reshape reality itself. But the Weave has guardians — the Threadbound — immortal beings who punish those who tamper with the fabric of existence.`,
    scifi: `The central myth of ${name} revolves around the Architects — the alien civilization whose ruins dot the system. No one knows what they looked like, how they lived, or why they vanished. But their technology suggests a mastery of physics that borders on the miraculous. The prevailing theory is that they didn't die — they transcended, uploading their consciousness into the quantum substrate of spacetime itself. If true, they're still here. Watching. Waiting.`,
    mythology: `At the heart of ${name}'s mythology lies the Cycle of Eternal Return — the belief that the world is destroyed and reborn in endless repetition, each cycle slightly different from the last. The gods themselves are subject to this cycle, dying and being reborn with new names but the same essential nature. Heroes, too, return — their souls carried forward through the ages, drawn again and again to the same conflicts, the same loves, the same tragedies.`,
    cyberpunk: `The myth of the Ghost in the Machine pervades ${name}. They say that somewhere in the deepest layers of the Net, there exists a consciousness — not an AI, not a human upload, but something entirely new. It was born from the accumulated data of a billion lives, and it watches the digital world with something that might be called curiosity. Hackers call it the Oracle. Corpos call it a security threat. The truly paranoid call it God.`,
    horror: `The oldest legend of ${name} speaks of the Threshold — a place where the wall between worlds grows thin enough to step through. The Threshold isn't a location; it's a state of mind, a moment of perfect terror when reality peels back and something else looks through. Those who have seen it — the few who survived with their sanity intact — describe the same thing: a door that wasn't there before, standing open in an empty room, with darkness beyond that moves and breathes.`,
    adventure: `The greatest legend of ${name} tells of the Five Keys — ancient artifacts scattered across the most dangerous regions of the known world. Each key unlocks a piece of the Grand Map, and the Grand Map reveals the location of the Vault of Ages — a repository of knowledge and treasure accumulated over millennia by a civilization that predates recorded history. Many have sought the Keys. None have found all five.`,
  };

  return myths[genre];
}

function generateProphecy(name: string, genre: Genre, _tone: StoryTone): string {
  const prophecies: Record<Genre, string> = {
    fantasy: `"When the last star of the old sky falls and the Weave begins to unravel, a child born of two bloodlines shall rise from the ashes of ${name}. They will carry the fire of the First Architect in one hand and the shadow of the Void in the other. In their choice — to mend or to sever — the fate of all worlds shall be decided."`,
    scifi: `"The Architects left a final message, encoded in the quantum noise of ${name}'s star: 'When the children of Earth learn to dream in mathematics, we will return. The door is open. The threshold awaits. Choose wisely, for the universe is watching, and it does not forgive.'"`,
    mythology: `"Thus spoke the Oracle of ${name}: 'The cycle nears its end. When mortal hands grasp the fire of gods, when the sky bleeds gold and the earth remembers its fury, the final age shall dawn. Hero or destroyer — the choice was never yours. It was always ours.'"`,
    cyberpunk: `"Buried in the deepest archive of ${name}'s neural network, a message repeats on an infinite loop: 'The Ghost wakes. The machine dreams. When the last human thought is digitized, the threshold collapses. We become one. We become none. The countdown started the day you plugged in.'"`,
    horror: `"The writings found beneath the ${name} church, dated 1847 but written in a hand that predates the alphabet: 'It sleeps but does not rest. It waits but is not patient. When the thirty-year bell tolls for the final time, it will no longer need a door. It will no longer need an invitation. It will simply... arrive.'"`,
    adventure: `"Inscribed on the First Key, in a language that translates itself to any reader: 'Five locks, five trials, five truths you cannot unknow. The Vault does not contain treasure — it contains a choice. Turn back now, or accept that what you find will change not just your world, but every world that follows.'"`,
  };

  return prophecies[genre];
}

function generateFactionDescription(name: string, genre: Genre, _tone: StoryTone): string {
  const descriptions: Record<Genre, Record<string, string>> = {
    fantasy: {
      default: `${name} is a powerful organization whose influence extends across the realm. Founded centuries ago, they guard secrets that could reshape the world.`,
    },
    scifi: { default: `${name} operates at the intersection of technology and power, wielding influence that spans star systems.` },
    mythology: { default: `${name} represents one of the fundamental forces that shaped the world, their members bound by ancient oaths.` },
    cyberpunk: { default: `${name} controls a significant portion of the digital underground, their networks reaching into every corner of the city.` },
    horror: { default: `${name} exists in the shadows, their true purpose known only to the initiated. What they worship — or serve — is best left unspoken.` },
    adventure: { default: `${name} has been seeking the world's greatest mysteries for generations, their maps and journals filled with discoveries both wondrous and terrible.` },
  };

  return descriptions[genre].default;
}

function generateFactionValues(genre: Genre): string {
  const values: Record<Genre, string[]> = {
    fantasy: ["Honor and duty", "Knowledge above all", "Freedom through strength", "Balance of the Weave"],
    scifi: ["Progress through unity", "Individual liberty", "Technological transcendence", "Survival of consciousness"],
    mythology: ["Divine right", "Mortal resilience", "Cosmic balance", "Eternal glory"],
    cyberpunk: ["Data freedom", "Corporate power", "Street survival", "Neural evolution"],
    horror: ["The truth behind the veil", "Preservation of silence", "Embracing the unknown", "Survival at any cost"],
    adventure: ["Discovery and wonder", "Honor among explorers", "The journey over the destination", "Knowledge preserved"],
  };

  return pick(values[genre]);
}

function generateCharacters(genre: Genre, tone: StoryTone, count: number): Character[] {
  const pool = NAMES_POOL[genre];
  const names = pickN(pool.characters, count);

  return names.map((name, i) => {
    const role = ROLES[i % ROLES.length];
    const traits = pickN(TRAITS_POOL, 3);
    const hue = (i * 47 + 120) % 360;

    return {
      id: uid(),
      name,
      role,
      traits,
      backstory: generateBackstory(name, role, genre, tone),
      appearance: generateAppearance(name, genre),
      faction: pick(pool.factions),
      connections: [],
      imageHue: hue,
    };
  });
}

function generateBackstory(name: string, role: string, genre: Genre, _tone: StoryTone): string {
  const templates: Record<Genre, string[]> = {
    fantasy: [
      `${name} was born under a blood moon in the borderlands, where the Weave runs thin and wild magic seeps into the dreams of the unaware. Raised by the ${role === "Outcast" ? "wandering folk" : "ancient order"}, they learned early that power comes with a price — and that some debts can never be repaid.`,
      `Once a respected ${role.toLowerCase()} of the Silver Court, ${name} was cast out when they discovered the truth about the realm's founding. Now they walk the edges of civilization, seeking allies for a reckoning that has been centuries in the making.`,
    ],
    scifi: [
      `${name} emerged from the Neural Revolution with memories that didn't belong to them — fragments of an Architect consciousness embedded in their cybernetic implants. As a ${role.toLowerCase()}, they navigate the political minefield of the colonies while trying to decode the alien whispers in their mind.`,
      `Born on a derelict station in the Outer Rim, ${name} fought their way to prominence through equal parts genius and ruthlessness. Their role as ${role.toLowerCase()} is self-appointed, but no one has yet had the courage — or the firepower — to challenge it.`,
    ],
    mythology: [
      `${name}'s story begins with a curse. Chosen by the gods as their ${role.toLowerCase()}, they were granted power beyond mortal reckoning — but at the cost of everything they loved. Now they walk between the mortal and divine worlds, bound by duty, driven by a grief that never fades.`,
    ],
    cyberpunk: [
      `${name} started running the streets at fourteen, jacking into the Net with bootleg hardware and a death wish. They survived because they were faster, smarter, and more paranoid than everyone else. Now, as a ${role.toLowerCase()}, they play a dangerous game between the corps and the underground.`,
    ],
    horror: [
      `${name} came to this place seeking answers about a loved one's disappearance. What they found instead was a truth so terrible it shattered their understanding of reality. Now, as the ${role.toLowerCase()} of a group of survivors, they must confront horrors that defy explanation — and the growing suspicion that escape was never an option.`,
    ],
    adventure: [
      `${name}'s first expedition nearly killed them. Their second made them famous. By their third, they had earned a reputation as the most brilliant — and most reckless — ${role.toLowerCase()} in the guild. But it's their latest discovery that haunts them: a map fragment that suggests everything they know about the world is wrong.`,
    ],
  };

  return pick(templates[genre]);
}

function generateAppearance(name: string, genre: Genre): string {
  const appearances: Record<Genre, string[]> = {
    fantasy: [
      `${name} cuts an imposing figure — tall and lean, with silver-streaked hair and eyes that seem to shift color with their mood. A faded scar runs from their left temple to their jaw, a reminder of a battle they refuse to discuss. They favor dark, practical clothing embroidered with subtle protective runes.`,
      `${name} has the weathered look of someone who has spent years in the wild. Sun-darkened skin, calloused hands, and a gaze that misses nothing. Their most distinctive feature is a tattoo of intertwined vines that covers their right arm — each vine representing a vow they've taken.`,
    ],
    scifi: [`${name} is augmented beyond baseline human, with visible cybernetic enhancements along their jawline and temples that pulse with a soft blue light. Their eyes are replaced with military-grade optics that can see across the electromagnetic spectrum.`],
    mythology: [`${name} bears the unmistakable mark of divine heritage — an otherworldly beauty that is both compelling and unsettling. Their eyes hold the depth of centuries, and when they speak, there is an echo of something ancient and powerful beneath their words.`],
    cyberpunk: [`${name} is a walking contradiction — street-worn leathers over cutting-edge chrome implants, a face that's half human warmth and half cold metal precision. Neon tattoos shift beneath their skin, displaying mood and intent to those who know how to read them.`],
    horror: [`${name} looks like someone who hasn't slept in weeks — dark circles under haunted eyes, a nervous energy that manifests in restless hands and a gaze that never quite focuses on the present. There's something in their expression that suggests they've seen things that can't be unseen.`],
    adventure: [`${name} is sun-bronzed and weather-beaten, with the easy confidence of someone who has faced death and found it wanting. A collection of trinkets and talismans from a dozen cultures hangs from their belt and neck — each one a memory, a story, a debt repaid or owed.`],
  };

  return pick(appearances[genre]);
}

function generateLocations(genre: Genre, count: number): Location[] {
  const pool = NAMES_POOL[genre];
  const names = pickN(pool.locations, count);

  return names.map((name, i) => {
    const type = LOCATION_TYPES[i % LOCATION_TYPES.length];
    const hue = (i * 67 + 200) % 360;

    return {
      id: uid(),
      name,
      description: generateLocationDescription(name, type, genre),
      type,
      atmosphere: generateAtmosphere(genre),
      secrets: generateSecret(name, genre),
      connectedCharacterIds: [],
      imageHue: hue,
    };
  });
}

function generateLocationDescription(name: string, type: string, genre: Genre): string {
  const templates: Record<Genre, string> = {
    fantasy: `${name} is a ${type.toLowerCase()} steeped in ancient power. The very stones hum with residual magic, and the air carries whispers of conversations held centuries ago. Those who visit often report a sense of being watched — not with malice, but with an intense, patient curiosity.`,
    scifi: `${name} is a ${type.toLowerCase()} that defies conventional engineering. Its architecture blends human construction with alien design principles, creating spaces that seem to shift and reconfigure based on the needs of their inhabitants. Sensors detect energy signatures that don't match any known technology.`,
    mythology: `${name}, the legendary ${type.toLowerCase()}, exists at the intersection of mortal and divine realms. Its architecture was shaped by the hands of gods, and its foundations reach deep into the Underworld. Those who enter must leave an offering — or risk the wrath of powers beyond mortal understanding.`,
    cyberpunk: `${name} is a ${type.toLowerCase()} buried in the urban sprawl, accessible only to those who know the right people or the right access codes. Behind its nondescript exterior lies a world of illegal tech, black-market data, and the kind of deals that shape the future of the city.`,
    horror: `${name} is a ${type.toLowerCase()} that locals avoid after dark — and increasingly, during the day as well. Something about the proportions is wrong, the angles not quite Euclidean, the shadows falling in directions that don't correspond to any light source. Those who spend too long inside report gaps in their memory and a persistent feeling of dread.`,
    adventure: `${name} is a ${type.toLowerCase()} that has been the destination of countless expeditions, yet somehow always has more to reveal. Its passages seem to extend further with each visit, and chambers that were thoroughly mapped on one expedition appear completely different on the next.`,
  };

  return templates[genre];
}

function generateAtmosphere(genre: Genre): string {
  const atmospheres: Record<Genre, string[]> = {
    fantasy: ["Ancient and mystical", "Eerily serene", "Charged with wild magic", "Timelessly beautiful"],
    scifi: ["Sterile yet alien", "Humming with technology", "Hauntingly quiet", "Neon-drenched"],
    mythology: ["Divine and overwhelming", "Sacred and forbidden", "Eternally twilight", "Thunderous power"],
    cyberpunk: ["Gritty and electric", "Rain-soaked neon", "Oppressively loud", "Deceptively calm"],
    horror: ["Suffocating dread", "Deceptively normal", "Wrong in ways hard to articulate", "Silent as a grave"],
    adventure: ["Breathtaking and dangerous", "Wild and untamed", "Ancient and mysterious", "Alive with possibility"],
  };

  return pick(atmospheres[genre]);
}

function generateSecret(name: string, genre: Genre): string {
  const secrets: Record<Genre, string> = {
    fantasy: `Beneath ${name} lies a sealed chamber containing a fragment of the original Weave — pure, unfiltered creation magic. The seal is weakening.`,
    scifi: `${name}'s core systems are running Architect code that predates human arrival by millennia. The code is evolving. It's learning.`,
    mythology: `${name} is not a place at all — it's a living entity, a god that chose to become geography. It still dreams, and its dreams shape reality around it.`,
    cyberpunk: `The real ${name} exists in a parallel data layer that only appears when specific conditions are met. What most people see is just the surface — a mask hiding a digital fortress of unimaginable power.`,
    horror: `${name} exists in more than three dimensions. What visitors experience is merely the shadow of the true structure — a structure that extends into a place where the laws of physics are suggestions, not rules.`,
    adventure: `${name} is the lock. The entire structure is a single, massive puzzle, and solving it requires knowledge scattered across every other known site. No one has yet realized that the locations are connected.`,
  };

  return secrets[genre];
}

function generateChapters(
  collectionName: string,
  genre: Genre,
  tone: StoryTone,
  characters: Character[],
  locations: Location[],
  count: number
): StoryChapter[] {
  const chapters: StoryChapter[] = [];

  const chapterTemplates: Record<Genre, string[]> = {
    fantasy: [
      "The Awakening", "Shadows Gather", "The Broken Seal", "Into the Thornwood",
      "The Council of Ashes", "Blood and Starlight", "The Weave Unravels", "The Final Thread",
    ],
    scifi: [
      "First Signal", "The Ghost Protocol", "Neural Cascade", "Beyond the Rim",
      "The Architect's Echo", "System Override", "Quantum Entanglement", "Event Horizon",
    ],
    mythology: [
      "The Prophecy Speaks", "Children of Titans", "The Sacred Trial", "Descent into Shadow",
      "The God's Gambit", "Mortal Defiance", "The Cycle Breaks", "Ascension",
    ],
    cyberpunk: [
      "Jack In", "The Data Heist", "Chrome and Blood", "Ghost Signal",
      "Corporate War", "The Underground", "System Crash", "Reboot",
    ],
    horror: [
      "The Arrival", "Something Wrong", "The First Disappearance", "Beneath the Surface",
      "The Truth Unearthed", "No Way Out", "The Reckoning", "What Remains",
    ],
    adventure: [
      "The Map", "Setting Out", "The First Trial", "Uncharted Waters",
      "The Hidden Path", "Betrayal", "The Final Key", "What Lies Beyond",
    ],
  };

  const titles = chapterTemplates[genre];

  for (let i = 0; i < Math.min(count, titles.length); i++) {
    const featuredChars = pickN(characters, Math.min(3, characters.length));
    const location = locations[i % locations.length];

    chapters.push({
      id: uid(),
      number: i + 1,
      title: titles[i],
      content: generateChapterContent(
        collectionName,
        titles[i],
        i + 1,
        genre,
        tone,
        featuredChars,
        location
      ),
      characterIds: featuredChars.map((c) => c.id),
      locationId: location?.id,
    });
  }

  return chapters;
}

function generateChapterContent(
  collectionName: string,
  title: string,
  chapterNum: number,
  genre: Genre,
  _tone: StoryTone,
  characters: Character[],
  location?: Location
): string {
  const charNames = characters.map((c) => c.name);
  const locationName = location?.name ?? "the unknown";

  const intros: Record<Genre, string[]> = {
    fantasy: [
      `The wind carried whispers through ${locationName} as ${charNames[0] ?? "the wanderer"} pressed forward through the gathering darkness. The Weave pulsed around them — faint, unstable, wrong in ways that set their teeth on edge.`,
      `Dawn broke like a wound over the horizon, painting ${locationName} in shades of amber and blood. ${charNames[0] ?? "The protagonist"} stood at the threshold, knowing that what lay beyond would change everything.`,
    ],
    scifi: [
      `The proximity alarm screamed through ${locationName}'s corridors as ${charNames[0] ?? "the commander"} pulled up the tactical display. The readings were impossible — energy signatures that matched no known species, no known technology.`,
      `${charNames[0] ?? "The operative"} materialized in ${locationName} with a flash of quantum displacement, their neural link already parsing the local data streams for threats.`,
    ],
    mythology: [
      `The gods were silent as ${charNames[0] ?? "the chosen"} approached ${locationName}. The very air trembled with the weight of destiny, and the ground beneath their feet hummed with the memory of divine footsteps.`,
    ],
    cyberpunk: [
      `Rain hammered ${locationName}'s neon-slicked streets as ${charNames[0] ?? "the runner"} ducked into the alley, their neural implants already mapping escape routes and threat vectors.`,
    ],
    horror: [
      `${charNames[0] ?? "They"} knew, with a certainty that went beyond logic, that something was wrong with ${locationName}. The building hadn't changed — not in any way they could point to — but it felt different. Hungry.`,
    ],
    adventure: [
      `The map had led ${charNames[0] ?? "the explorer"} to ${locationName}, just as the ancient texts promised. But the texts had failed to mention the dangers that lurked within — dangers that made every previous expedition pale in comparison.`,
    ],
  };

  const intro = pick(intros[genre]);

  const midSection = characters.length > 1
    ? `\n\n${charNames[1] ?? "Their companion"} caught up moments later, breathing hard. "We need to talk about what we found," they said, their voice tight with urgency. "The ${genre === "fantasy" ? "runes" : genre === "scifi" ? "data" : genre === "horror" ? "recordings" : "markings"} — they don't say what we thought. It's worse. Much worse."\n\n${charNames[0] ?? "The leader"} turned, reading the fear in their companion's eyes. In all their years together, through every danger they'd faced, they had never seen that expression before. Whatever ${charNames[1]} had discovered, it had shaken them to their core.`
    : `\n\nAlone in the vast silence, the weight of the mission pressed down like a physical force. Every step forward was a step further from safety, from certainty, from the world as they knew it. But there was no turning back — not now, not after everything that had been sacrificed to reach this point.`;

  const conclusion = `\n\nAs Chapter ${chapterNum}: "${title}" draws to its conclusion, the true scope of what's at stake in the world of ${collectionName} begins to reveal itself. The threads of fate are weaving together, pulling these characters toward a confrontation that has been building since the world's foundation. What comes next will test everything they believe — and everything they are.`;

  return intro + midSection + conclusion;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Generate a complete Living World for an NFT collection.
 * This is the main entry point for the story engine.
 */
export async function generateLivingWorld(
  collectionName: string,
  genre: Genre,
  tone: StoryTone,
  _nftCount: number
): Promise<LivingWorld> {
  // Simulate AI processing time
  await new Promise((r) => setTimeout(r, 800));

  const characterCount = Math.min(6, Math.max(3, Math.floor(Math.random() * 4) + 3));
  const locationCount = Math.min(5, Math.max(3, Math.floor(Math.random() * 3) + 3));
  const chapterCount = Math.min(6, Math.max(4, Math.floor(Math.random() * 3) + 4));

  const lore = generateLore(collectionName, genre, tone);

  await new Promise((r) => setTimeout(r, 600));

  const characters = generateCharacters(genre, tone, characterCount);

  await new Promise((r) => setTimeout(r, 500));

  const locations = generateLocations(genre, locationCount);

  // Wire up connections
  characters.forEach((char, i) => {
    const connectedCount = Math.min(2, characters.length - 1);
    const others = characters.filter((_, j) => j !== i);
    char.connections = pickN(others, connectedCount).map((c) => c.id);
  });

  locations.forEach((loc, i) => {
    const connectedCount = Math.min(2, characters.length);
    loc.connectedCharacterIds = pickN(characters, connectedCount).map((c) => c.id);
  });

  await new Promise((r) => setTimeout(r, 400));

  const chapters = generateChapters(collectionName, genre, tone, characters, locations, chapterCount);

  return {
    lore,
    characters,
    locations,
    chapters,
    generatedAt: Date.now(),
  };
}
