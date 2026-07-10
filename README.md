# The Mini Cauldron — NFT Mint by Oluwasegun

> 99 unique genesis artifacts forged on **Ritual Chain** (Chain ID 1979) — the first L1 with enshrined AI precompiles.

*seen by mmorgs*

## ✨ Features

- **Wallet Connection** — MetaMask (injected) + WalletConnect support
- **Mint Button** — calls `mint()` on the ERC-721 contract, handles approval, loading, and result
- **Progress Bar** — live `minted / 99` with smooth fill animation, auto-refreshes on each block
- **Gallery** — preview grid of minted NFTs with generative placeholder art
- **Toast Notifications** — success / error / loading toasts with Ritual dark theme
- **Chain Guard** — detects wrong network and prompts switch to Ritual Chain (visible on all screen sizes)
- **Dark-mode UI** — Ritual design system (Archivo Black + Barlow + JetBrains Mono)
- **Error Handling** — user rejection, insufficient funds, already minted, sold-out, wrong network
- **1-per-wallet** — on-chain `hasMinted` mapping enforces one mint per address

## 🏗 Project Structure

```
ritual-nft-mint/
├── app/
│   ├── layout.tsx          # Root layout — fonts + metadata
│   ├── page.tsx            # Home page composition
│   ├── globals.css         # Ritual design tokens + animations + Tailwind v4 @config
│   └── providers.tsx       # wagmi + react-query + toast providers
├── components/
│   ├── Header.tsx          # Logo + wallet connect / disconnect + chain guard banner
│   ├── HeroSection.tsx     # Collection name + stats
│   ├── MintSection.tsx     # Mint button + progress bar + contract info + post-mint modal
│   └── GallerySection.tsx  # NFT preview grid with empty state
├── hooks/
│   ├── useMint.ts          # Mint transaction lifecycle + error parsing
│   └── useMintProgress.ts  # totalSupply() polling (block-based + 30s fallback)
├── lib/
│   ├── chain.ts            # Ritual Chain viem definition
│   ├── wagmi.ts            # wagmi config (injected + WalletConnect)
│   ├── contract.ts         # ABI + address + collection constants
│   └── nftMetadata.ts      # IPFS metadata + image resolution
├── contracts/
│   ├── src/RitualGenesis.sol   # ERC-721 smart contract (hasMinted + 1-per-wallet)
│   ├── script/Deploy.s.sol     # Foundry deploy script
│   └── foundry.toml            # Foundry config for Ritual Chain
├── .env.example            # Environment variable template
└── tailwind.config.ts      # Ritual color tokens + fonts
```

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Your deployed NFT contract address
NEXT_PUBLIC_NFT_CONTRACT=0xYourContractAddress

# Ritual Chain RPC (public endpoint works out of the box)
NEXT_PUBLIC_RPC_URL=https://rpc.ritualfoundation.org

# Optional: WalletConnect project ID
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id
```

### 3. Start the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Smart Contract

### Key Features
- **ERC-721** with sequential token IDs (1 → 99)
- **1-per-wallet**: `hasMinted` mapping prevents double-minting
- **Custom errors**: `SoldOut`, `AlreadyMinted`, `InsufficientPayment`
- **Owner functions**: `setBaseURI()`, `withdraw()`
- **Flexible deploy**: baseURI is optional at construction time

### Deploy (not deployed yet)

```bash
cd contracts

# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# Create .env with your private key
echo "PRIVATE_KEY=0xYourPrivateKey" > .env
source .env

# Deploy to Ritual Chain (with known IPFS CID)
export BASE_URI="ipfs://YourCID/"
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.ritualfoundation.org \
  --broadcast -vvvv

# Or deploy without baseURI (set it later with setBaseURI)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.ritualfoundation.org \
  --broadcast -vvvv
```

### Verify on Explorer

```bash
forge verify-contract \
  --chain 1979 \
  --watch \
  --verifier custom \
  --verifier-url "https://rpc.ritualfoundation.org/api/verify" \
  --verifier-api-key unused \
  0xYourContractAddress \
  src/RitualGenesis.sol:RitualGenesis
```

---

## ⛓ Chain Reference

| Property | Value |
|----------|-------|
| Chain ID | `1979` |
| Currency | `RITUAL` (18 decimals, testnet) |
| RPC HTTP | `https://rpc.ritualfoundation.org` |
| RPC WS | `wss://rpc.ritualfoundation.org/ws` |
| Explorer | `https://explorer.ritualfoundation.org` |
| Faucet | `https://faucet.ritualfoundation.org` |

---

## 🧑‍💻 Key Technical Decisions

### Why `useSendTransaction` instead of `useWriteContract`?

Ritual Chain uses precompile-based execution. `useWriteContract` internally calls `eth_call` (simulation) before sending, which fails on precompile addresses. Using `useSendTransaction` with `encodeFunctionData` skips simulation entirely — this is the **Ritual-safe** pattern for all contract writes.

### Tailwind v4 + `@config`

This project uses Tailwind CSS v4 with the `@tailwindcss/postcss` plugin. The custom design tokens (colors, fonts, shadows, animations) are defined in `tailwind.config.ts` and loaded via `@config "../tailwind.config.ts"` in `globals.css`.

### Auto-refresh

`useMintProgress` uses `useWatchBlockNumber` for near-real-time updates plus a 30-second `setInterval` fallback. Post-mint, the hook is called multiple times with staggered delays to account for RPC indexing lag.

### Error parsing

`useMint` parses common wallet errors (user rejection, insufficient funds, sold-out, already minted, wrong chain) into human-readable messages. Raw hex errors are never shown to users.

---

*The Mini Cauldron by Oluwasegun · seen by mmorgs*
