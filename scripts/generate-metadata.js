const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
// After uploading your images folder to IPFS (e.g. via Pinata), 
// paste the IPFS CID of the images folder here:
const IMAGES_BASE_URI = "ipfs://YOUR_IMAGES_CID_HERE";

// The name of your NFT collection
const COLLECTION_NAME = "Ritual Genesis";
// The description of your NFT collection
const COLLECTION_DESCRIPTION = "The official Ritual Genesis NFT Collection.";

// Number of NFTs
const TOTAL_SUPPLY = 99;

// ==========================================

const metadataDir = path.join(__dirname, '..', 'nft-assets', 'metadata');

// Ensure metadata directory exists
if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir, { recursive: true });
}

console.log(`Generating metadata for ${TOTAL_SUPPLY} NFTs...`);

for (let i = 1; i <= TOTAL_SUPPLY; i++) {
  const metadata = {
    name: `${COLLECTION_NAME} #${i}`,
    description: COLLECTION_DESCRIPTION,
    image: `${IMAGES_BASE_URI}/${i}.png`, // Make sure your images are named 1.png, 2.png, etc.
    attributes: [
      {
        trait_type: "Edition",
        value: i.toString()
      }
      // You can add more randomized or specific attributes here if you have them
    ]
  };

  // Write to JSON file (e.g., 1.json)
  // Some smart contracts prefer no extension (just '1'), but typical standard uses '.json' 
  // or depends on how your contract appends the tokenURI.
  // We'll write it without extension because ERC721 standard typically queries `baseURL + tokenID`
  const filePath = path.join(metadataDir, i.toString());
  
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
}

console.log("✅ Metadata generation complete!");
console.log(`Check the /nft-assets/metadata folder.`);
console.log(`\nNEXT STEPS:`);
console.log(`1. Upload the /nft-assets/metadata folder to IPFS.`);
console.log(`2. Copy the CID of the uploaded metadata folder.`);
console.log(`3. Update your smart contract's Base URI to: ipfs://YOUR_METADATA_CID/`);
