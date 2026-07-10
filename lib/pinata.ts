// =============================================
// The Living Grimoire — Pinata IPFS Integration
// =============================================
// Upload files and metadata to IPFS via Pinata.
// Ported from The-Cauldron frontend/lib/pinata.ts

const PINATA_KEYS = [
  process.env.NEXT_PUBLIC_PINATA_JWT_1,
  process.env.NEXT_PUBLIC_PINATA_JWT_2,
  process.env.NEXT_PUBLIC_PINATA_JWT_3,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getNextKey(): string {
  if (!PINATA_KEYS.length) throw new Error("No Pinata keys configured");
  const key = PINATA_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % PINATA_KEYS.length;
  return key;
}

// Pinata's new v3 upload API. Legacy `api.pinata.cloud/pinning/*` endpoints
// reject modern scoped keys with NO_SCOPES_FOUND, so we use v3 everywhere.
const PINATA_V3_UPLOAD = "https://uploads.pinata.cloud/v3/files";

/** POST a FormData (already containing file[s] + network) to v3, return the CID. */
async function v3Upload(buildForm: () => FormData): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < PINATA_KEYS.length; i++) {
    const jwt = getNextKey();
    try {
      const res = await fetch(PINATA_V3_UPLOAD, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: buildForm(),
      });

      if (!res.ok) {
        const text = await res.text();
        if (text.includes("NO_SCOPES_FOUND") || res.status === 401 || res.status === 403) {
          throw new Error(
            "Your Pinata API key can't upload files (missing scopes). Create a key in Pinata " +
            "with the Admin toggle (or Files: Write) enabled and set NEXT_PUBLIC_PINATA_JWT_1."
          );
        }
        lastError = new Error(`Pinata error: ${res.status} - ${text}`);
        continue;
      }

      const json = await res.json();
      const cid = json?.data?.cid;
      if (!cid) {
        lastError = new Error("Pinata v3 response had no CID");
        continue;
      }
      return `ipfs://${cid}`;
    } catch (err) {
      // A clear scopes error should bubble up immediately, not silently retry.
      if ((err as Error).message?.includes("missing scopes")) throw err;
      lastError = err as Error;
      continue;
    }
  }

  throw lastError || new Error("No Pinata keys configured");
}

export async function uploadToPinata(file: File): Promise<string> {
  return v3Upload(() => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("network", "public");
    fd.append("name", file.name);
    return fd;
  });
}

export async function uploadJSONToPinata(json: object, name: string): Promise<string> {
  return v3Upload(() => {
    const fd = new FormData();
    const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
    fd.append("file", blob, `${name}.json`);
    fd.append("network", "public");
    fd.append("name", name);
    return fd;
  });
}

// ── IPFS Gateway Resolution ──────────────────────────────────

const IPFS_GATEWAYS = [
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://w3s.link/ipfs/",
];

const IPFS_GATEWAY = IPFS_GATEWAYS[0];

export function resolveIPFSGateway(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}${uri.slice(7)}`;
  }
  return uri;
}

function resolveAllGateways(uri: string): string[] {
  if (!uri) return [];
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice(7);
    return IPFS_GATEWAYS.map(gw => `${gw}${path}`);
  }
  return [uri];
}

const ipfsJsonCache = new Map<string, any>();

function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejections = 0;
    const errors: any[] = [];
    for (const p of promises) {
      p.then(resolve).catch((err) => {
        errors.push(err);
        rejections++;
        if (rejections === promises.length) reject(new Error("All promises rejected"));
      });
    }
  });
}

export async function raceIPFSFetchJSON(ipfsUri: string): Promise<any | null> {
  if (!ipfsUri) return null;
  if (ipfsJsonCache.has(ipfsUri)) return ipfsJsonCache.get(ipfsUri);

  const urls = resolveAllGateways(ipfsUri);
  if (urls.length === 0) return null;

  try {
    const result = await promiseAny(
      urls.map(async (url) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      })
    );
    ipfsJsonCache.set(ipfsUri, result);
    return result;
  } catch {
    return null;
  }
}

export async function raceIPFSImageURL(ipfsUri: string): Promise<string> {
  if (!ipfsUri) return "";
  if (!ipfsUri.startsWith("ipfs://")) return ipfsUri;

  const urls = resolveAllGateways(ipfsUri);
  try {
    return await promiseAny(
      urls.map(async (url) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(url, { method: "HEAD", signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`${res.status}`);
          return url;
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      })
    );
  } catch {
    return resolveIPFSGateway(ipfsUri);
  }
}

// ── Multi-Image Metadata Folder Upload ────────────────────────

export async function uploadMetadataFolderToPinata(
  items: { tokenId: number; name: string; description: string; imageCID: string }[],
  coverImageCID?: string
): Promise<string> {
  // v3 preserves relative paths from file names, so appending files named
  // "metadata/<id>" yields a directory whose CID we return as the base URI.
  const cidUri = await v3Upload(() => {
    const fd = new FormData();

    // Cover metadata as tokenId 0
    const coverCID = coverImageCID || items[0]?.imageCID || "";
    const coverMeta = { name: "Collection Cover", description: items[0]?.description || "", image: coverCID };
    fd.append("file", new Blob([JSON.stringify(coverMeta)], { type: "application/json" }), "metadata/0");

    for (const item of items) {
      const metadata = { name: item.name, description: item.description, image: item.imageCID };
      fd.append("file", new Blob([JSON.stringify(metadata)], { type: "application/json" }), `metadata/${item.tokenId}`);
    }

    fd.append("network", "public");
    fd.append("name", `collection-metadata`);
    return fd;
  });

  // cidUri is "ipfs://<dirCid>" — tokens live under /metadata/<id>
  return `${cidUri}/metadata/`;
}
