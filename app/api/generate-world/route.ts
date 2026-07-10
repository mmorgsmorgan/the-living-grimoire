// =============================================
// The Living Grimoire — AI World Generation API Route
// =============================================
// POST /api/generate-world
// Receives collection context + genre/tone, calls OpenAI,
// returns a structured LivingWorld JSON.

import { NextRequest, NextResponse } from "next/server";
import { fetchCollectionMetadata } from "@/lib/blockchain/metadata";
import type { LivingWorld, Genre, StoryTone } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function generateWorldId(contractAddress: string, chainId: number): string {
  return `${chainId}-${contractAddress.toLowerCase()}`;
}

// ── System prompt for the AI storyteller ───────────────────────

function buildSystemPrompt(genre: Genre, tone: StoryTone): string {
  return `AI storyteller. Genre:${genre}. Tone:${tone}. Return ONLY JSON:
{"lore":{"origin":"short","history":"short","mythology":"short","factions":[{"name":"","description":"","values":""}],"prophecy":"1 sentence"},"characters":[{"id":"abcd1234","name":"","role":"Protagonist","traits":["a","b"],"backstory":"short","appearance":"short","faction":null,"connections":[],"imageHue":0}],"locations":[{"id":"abcd1234","name":"","description":"short","type":"City","atmosphere":"","secrets":"","connectedCharacterIds":[],"imageHue":0}],"chapters":[{"id":"abcd1234","number":1,"title":"","content":"short story","characterIds":[],"locationId":null}],"generatedAt":0}
Create 2 characters, 1 location, 1 faction, 1 chapter. Be concise.`;
}

function buildUserPrompt(
  collectionName: string,
  totalSupply: number,
  nftSamples: { name?: string; description?: string; attributes: { trait_type: string; value: string }[] }[],
  traitSummary: Record<string, string[]>
): string {
  let prompt = `Collection:"${collectionName}" Supply:${totalSupply}`;

  // Add up to 3 NFT names for inspiration (keep it short)
  const names = nftSamples.slice(0, 3).map(n => n.name).filter(Boolean);
  if (names.length > 0) {
    prompt += ` NFTs:${names.join(",")}`;
  }

  prompt += " Generate world JSON.";
  return prompt;
}

// ── OpenRouter API call ───────────────────────────────────────

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  const model = process.env.AI_MODEL ?? "google/gemini-2.5-flash";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://the-living-grimoire.app",
      "X-Title": "The Living Grimoire",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // OpenRouter may wrap JSON in markdown code fences — strip them
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

// ── Validation ─────────────────────────────────────────────────

function validateLivingWorld(raw: unknown): LivingWorld {
  const obj = raw as Record<string, unknown>;

  if (!obj.lore || !obj.characters || !obj.locations || !obj.chapters) {
    throw new Error("AI response missing required fields: lore, characters, locations, or chapters");
  }

  const world = obj as unknown as LivingWorld;

  // Set timestamp
  world.generatedAt = Date.now();

  // Ensure arrays
  if (!Array.isArray(world.characters)) world.characters = [];
  if (!Array.isArray(world.locations)) world.locations = [];
  if (!Array.isArray(world.chapters)) world.chapters = [];

  // Ensure lore fields
  if (!world.lore.factions) world.lore.factions = [];

  return world;
}

// ── Route handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contractAddress,
      collectionName: overrideName,
      genre = "fantasy",
      tone = "epic",
    } = body as {
      contractAddress?: string;
      collectionName?: string;
      genre?: Genre;
      tone?: StoryTone;
    };

    if (!contractAddress) {
      return NextResponse.json(
        { error: "contractAddress is required" },
        { status: 400 }
      );
    }

    // 1. Check if world already exists in the backend database
    const chainId = 1979; // Ritual Chain
    try {
      const existingRes = await fetch(`${BACKEND_URL}/lore/${contractAddress}`);
      if (existingRes.ok) {
        const existing = await existingRes.json();
        return NextResponse.json({
          world: existing.lore,
          collectionName: existing.name,
          worldId: existing.id,
          cached: true,
        });
      }
    } catch { /* not found — continue to generate */ }

    // 2. Fetch live NFT metadata from Ritual Chain (best-effort)
    let collectionContext: { collectionName: string; totalSupply: number; sampledNFTs: any[]; traitSummary: Record<string, string[]> } | null = null;
    try {
      collectionContext = await fetchCollectionMetadata(contractAddress, 15);
    } catch (err) {
      console.warn("On-chain metadata fetch failed (will generate from name only):", (err as Error).message);
    }

    const finalName = overrideName || collectionContext?.collectionName || "Unknown Collection";
    const totalSupply = collectionContext?.totalSupply ?? 0;
    const sampledNFTs = collectionContext?.sampledNFTs ?? [];
    const traitSummary = collectionContext?.traitSummary ?? {};

    // 3. Build prompts and call AI (with retry)
    const systemPrompt = buildSystemPrompt(genre, tone);
    const userPrompt = buildUserPrompt(finalName, totalSupply, sampledNFTs, traitSummary);

    let aiResponse: string | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        aiResponse = await callAI(systemPrompt, userPrompt);
        break;
      } catch (err) {
        lastError = err;
        console.error(`AI call attempt ${attempt + 1} failed:`, err);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!aiResponse) {
      console.error("All AI attempts failed:", lastError);
      return NextResponse.json(
        { error: "AI generation failed after 3 attempts. Please try again." },
        { status: 502 }
      );
    }

    // 4. Parse and validate AI response
    let world: LivingWorld;
    try {
      const parsed = JSON.parse(aiResponse);
      world = validateLivingWorld(parsed);
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      console.error("Raw response:", aiResponse.slice(0, 500));
      return NextResponse.json(
        { error: "AI returned invalid data. Please try again." },
        { status: 500 }
      );
    }

    // 5. Save to backend Postgres database
    const worldId = generateWorldId(contractAddress, chainId);
    try {
      await fetch(`${BACKEND_URL}/lore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: worldId,
          contract: contractAddress,
          chainId,
          name: finalName,
          lore: world,
          genre,
          tone,
        }),
      });
    } catch (err) {
      console.error("Failed to save world to backend (non-fatal):", err);
    }

    // 6. Return the world
    return NextResponse.json({
      world,
      collectionName: finalName,
      worldId,
      cached: false,
    });
  } catch (err) {
    console.error("Unhandled error in generate-world:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
