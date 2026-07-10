// =============================================
// The Living Grimoire — Pinata IPFS Integration
// =============================================
// Upload files and metadata to IPFS via Pinata.
// Ported from The-Cauldron frontend/lib/pinata.ts

// Uploads go through our own same-origin API route (`/api/pinata`), which holds
// the Pinata JWT server-side and forwards to Pinata's v3 API. This avoids the
// browser→Pinata CORS problem (Pinata's error responses omit CORS headers, so a
// 401/413 surfaces as an opaque "Failed to fetch") and keeps the JWT off the client.
const PINATA_UPLOAD_PROXY = "/api/pinata";

/** POST a FormData (already containing file[s] + network) via the proxy, return the CID. */
async function v3Upload(buildForm: () => FormData): Promise<string> {
  const res = await fetch(PINATA_UPLOAD_PROXY, {
    method: "POST",
    body: buildForm(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (text.includes("NO_SCOPES_FOUND") || res.status === 401 || res.status === 403) {
      throw new Error(
        "Pinata rejected the upload (auth/scopes). Set a valid PINATA_JWT on the server " +
        "with Files: Write (or Admin) enabled."
      );
    }
    throw new Error(`Pinata upload failed: ${res.status} - ${text}`);
  }

  const json = await res.json();
  const cid = json?.data?.cid;
  if (!cid) throw new Error("Pinata response had no CID");
  return `ipfs://${cid}`;
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
