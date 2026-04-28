// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RitualGenesis
 * @notice ERC-721 NFT collection with a fixed supply of 99. Deployed on Ritual Chain (Chain ID 1979).
 * @dev Sequential minting — no randomness. Each mint gives the next token ID.
 *
 * Deployer address: 0x0e45dCb124102f8BE17f11234F69609C734D2Bee
 *
 * To deploy with Foundry:
 *   forge create src/RitualGenesis.sol:RitualGenesis \
 *     --rpc-url https://rpc.ritualfoundation.org \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 *
 * Then update NEXT_PUBLIC_NFT_CONTRACT in .env.local with the deployed address.
 */
contract RitualGenesis is ERC721, Ownable {
    // ============================================================
    // Constants
    // ============================================================

    /// @notice Maximum number of NFTs in this collection
    uint256 public constant MAX_SUPPLY = 99;

    /// @notice Mint price in RITUAL (native currency), 18 decimals
    uint256 public constant MINT_PRICE = 0.01 ether;

    // ============================================================
    // State
    // ============================================================

    /// @notice Total number of NFTs minted so far
    uint256 private _totalSupply;

    /// @notice Base URI for token metadata (IPFS or placeholder)
    string private _baseTokenURI;

    // ============================================================
    // Events
    // ============================================================

    event Minted(address indexed to, uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);

    // ============================================================
    // Errors
    // ============================================================

    error SoldOut();
    error InsufficientPayment(uint256 sent, uint256 required);
    error InvalidBaseURI();
    error WithdrawFailed();

    // ============================================================
    // Constructor
    // ============================================================

    constructor(string memory baseURI)
        ERC721("Ritual Genesis", "RGEN")
        Ownable(msg.sender)
    {
        _validateBaseURI(baseURI);
        _baseTokenURI = baseURI;
    }

    // ============================================================
    // Minting
    // ============================================================

    /**
     * @notice Mint one NFT to the caller.
     * @dev Sequential token IDs starting at 1. Reverts if sold out or underpaid.
     */
    function mint() external payable {
        if (_totalSupply >= MAX_SUPPLY) revert SoldOut();
        if (msg.value < MINT_PRICE) {
            revert InsufficientPayment(msg.value, MINT_PRICE);
        }

        _totalSupply++;
        uint256 tokenId = _totalSupply;

        _safeMint(msg.sender, tokenId);

        emit Minted(msg.sender, tokenId);
    }

    // ============================================================
    // View Functions
    // ============================================================

    /**
     * @notice Returns the total number of NFTs minted.
     * @dev Compatible with ERC-721 totalSupply convention.
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice Returns true if the collection is fully minted.
     */
    function soldOut() external view returns (bool) {
        return _totalSupply >= MAX_SUPPLY;
    }

    // ============================================================
    // Metadata
    // ============================================================

    /**
     * @notice Update the base URI for token metadata. Owner only.
     * @param newBaseURI New IPFS or HTTP base URI (e.g., "ipfs://QmXxx/")
     */
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _validateBaseURI(newBaseURI);
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Returns the URI for a given token ID, appending .json to support IPFS folder structures.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // Reverts if token does not exist

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string.concat(baseURI, Strings.toString(tokenId), ".json")
            : "";
    }

    // ============================================================
    // Owner Withdrawal
    // ============================================================

    /**
     * @notice Withdraw all accumulated RITUAL from mint proceeds. Owner only.
     */
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        if (!success) revert WithdrawFailed();
    }

    /// @notice Accept RITUAL sent directly to the contract
    receive() external payable {}

    function _validateBaseURI(string memory baseURI) internal pure {
        bytes memory b = bytes(baseURI);
        if (b.length == 0 || b[b.length - 1] != "/") revert InvalidBaseURI();
    }
}
