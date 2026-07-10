const fs = require('fs');
const path = require('path');

const METADATA_DIR = path.join(__dirname, '..', 'nft-assets', 'metadata');
const CID = 'bafybeicu64g7c573o6xiso64ohct3s4wmhjzgio6dqt4mnrhqs5ylbc2pe';

console.log(`Updating metadata in ${METADATA_DIR}...`);

fs.readdirSync(METADATA_DIR).forEach(file => {
  if (!file.endsWith('.json')) return;

  const filePath = path.join(METADATA_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // The file name is something like "1.json", so the image name is "1.png"
  const baseName = path.basename(file, '.json');
  const imageUrl = `ipfs://${CID}/${baseName}.png`;

  // Update the image field
  data.image = imageUrl;

  // Also update the properties.files[0].uri if it exists
  if (data.properties && data.properties.files && data.properties.files.length > 0) {
    data.properties.files.forEach(f => {
      // Sometimes they just use "1.png" there too, replace it with the full IPFS url
      f.uri = imageUrl;
    });
  }

  // Write the updated JSON back to the file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

console.log('✅ Successfully updated all metadata files!');
