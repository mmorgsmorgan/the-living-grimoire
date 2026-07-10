// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RitualGenesis} from "../src/RitualGenesis.sol";

/**
 * @title Deploy
 * @notice Deploys RitualGenesis to Ritual Chain (Chain ID 1979).
 *
 * FIX: baseURI is now optional at deploy time. Pass an empty string "" to
 *      deploy immediately and call setBaseURI() later once your IPFS CID
 *      is known. This avoids blocking deployment on metadata upload.
 *
 * Usage (with known IPFS CID):
 *   export PRIVATE_KEY=0x...
 *   export BASE_URI="ipfs://bafybeid.../\"
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url https://rpc.ritualfoundation.org \
 *     --broadcast -vvvv
 *
 * Usage (deploy first, set URI later):
 *   export PRIVATE_KEY=0x...
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url https://rpc.ritualfoundation.org \
 *     --broadcast -vvvv
 *
 *   # Then once IPFS CID is ready:
 *   cast send <CONTRACT_ADDR> "setBaseURI(string)" "ipfs://bafybeid.../" \
 *     --rpc-url https://rpc.ritualfoundation.org \
 *     --private-key $PRIVATE_KEY
 */
contract Deploy is Script {
    // Known metadata CID — change before mainnet deploy
    string internal constant DEFAULT_BASE_URI =
        "ipfs://bafybeidqgl3nbnizulf52qziqoliitvzzot42qlcgkb6ithrkgsozi63he/";

    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPK);

        // Use BASE_URI env var if set; fall back to default CID.
        // Pass empty string "" to deploy without setting a baseURI.
        string memory baseURI = vm.envOr("BASE_URI", DEFAULT_BASE_URI);

        RitualGenesis nft = new RitualGenesis(baseURI);

        console.log("=== RitualGenesis Deployed ===");
        console.log("Address  :", address(nft));
        console.log("Deployer :", vm.addr(deployerPK));
        console.log("Chain ID :", block.chainid);
        console.log("Base URI :", baseURI);
        console.log("Max Supply:", nft.MAX_SUPPLY());
        console.log("Mint Price:", nft.MINT_PRICE());
        console.log("");
        console.log("Next steps:");
        console.log("  1. Copy address above");
        console.log("  2. Set NEXT_PUBLIC_NFT_CONTRACT in .env.local");
        console.log("  3. If baseURI is empty, call setBaseURI() after IPFS upload");

        vm.stopBroadcast();
    }
}
