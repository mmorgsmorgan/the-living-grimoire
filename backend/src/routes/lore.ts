import { FastifyInstance } from "fastify";
import { upsertWorld, getWorldByContract, getWorldById, getAllWorlds } from "../db/queries";

export default async function loreRoutes(app: FastifyInstance) {
  // GET /lore — list all worlds
  app.get("/lore", async (_request, reply) => {
    const worlds = await getAllWorlds();
    return reply.send({
      total: worlds.length,
      worlds: worlds.map((w: any) => ({
        id: w.id,
        contract: w.contract,
        chainId: w.chain_id,
        name: w.name,
        genre: w.genre,
        tone: w.tone,
        createdAt: w.created_at,
        // Include lore summary but not the full object for list view
        worldName: w.lore?.worldName || w.name,
        tagline: w.lore?.tagline || "",
      })),
    });
  });

  // GET /lore/:identifier — fetch a single world by contract address or ID
  app.get("/lore/:identifier", async (request, reply) => {
    const { identifier } = request.params as { identifier: string };

    // Try by contract address first (0x...), then by ID
    let world = null;
    if (identifier.startsWith("0x")) {
      world = await getWorldByContract(identifier);
    }
    if (!world) {
      world = await getWorldById(identifier);
    }
    if (!world) {
      return reply.status(404).send({ error: "World not found" });
    }

    return reply.send({
      id: world.id,
      contract: world.contract,
      chainId: world.chain_id,
      name: world.name,
      genre: world.genre,
      tone: world.tone,
      createdAt: world.created_at,
      lore: world.lore,
    });
  });

  // POST /lore — save a new world
  app.post("/lore", async (request, reply) => {
    const body = request.body as {
      id: string;
      contract: string;
      chainId?: number;
      name: string;
      lore: object;
      genre?: string;
      tone?: string;
    };

    if (!body.id || !body.contract || !body.name || !body.lore) {
      return reply.status(400).send({
        error: "Missing required fields: id, contract, name, lore",
      });
    }

    await upsertWorld(
      body.id,
      body.contract,
      body.chainId ?? 1979,
      body.name,
      body.lore,
      body.genre ?? null,
      body.tone ?? null
    );

    return reply.status(201).send({ success: true, id: body.id });
  });
}
