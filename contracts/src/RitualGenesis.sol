// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title  RitualGenesis
 * @notice ERC-721 NFT collection — 99 unique genesis artifacts on Ritual Chain (ID 1979).
 * @dev    Sequential minting, 1 per wallet, no randomness.
 *
 * Changes vs original:
 *   - Added `hasMinted` public mapping so the frontend can read mint status.
 *   - Added `AlreadyMinted` custom error + enforced 1-per-wallet in mint().
 *   - Deploy script no longer validates non-empty baseURI so you can deploy
 *     before IPFS metadata is ready and set it later with setBaseURI().
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

    /// @notice Base URI for token metadata (IPFS or HTTP)
    string private _baseTokenURI;

    /// @notice Tracks whether a wallet has already minted
    /// @dev    Public so the frontend can read it directly without an event index.
    mapping(address => bool) public hasMinted;

    // ============================================================
    // Events
    // ============================================================

    event Minted(address indexed to, uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);

    // ============================================================
    // Errors
    // ============================================================

    error SoldOut();
    error AlreadyMinted();
    error InsufficientPayment(uint256 sent, uint256 required);
    error InvalidBaseURI();
    error WithdrawFailed();

    // ============================================================
    // Constructor
    // ============================================================

    /**
     * @param baseURI IPFS or HTTP base URI ending with "/".
     *                Pass an empty string "" to deploy first and set later.
     */
    constructor(string memory baseURI)
        ERC721("Ritual Genesis", "RGEN")
        Ownable(msg.sender)
    {
        // Allow empty baseURI at deploy time; owner can set it later.
        if (bytes(baseURI).length > 0) {
            _validateBaseURI(baseURI);
            _baseTokenURI = baseURI;
        }
    }

    // ============================================================
    // Minting
    // ============================================================

    /**
     * @notice Mint one NFT to the caller.
     * @dev    Sequential IDs starting at 1. Reverts if sold out,
     *         underpaid, or the wallet already minted.
     */
    function mint() external payable {
        if (_totalSupply >= MAX_SUPPLY) revert SoldOut();
        if (hasMinted[msg.sender])      revert AlreadyMinted();
        if (msg.value < MINT_PRICE) {
            revert InsufficientPayment(msg.value, MINT_PRICE);
        }

        hasMinted[msg.sender] = true;
        _totalSupply++;
        uint256 tokenId = _totalSupply;

        _safeMint(msg.sender, tokenId);

        emit Minted(msg.sender, tokenId);
    }

    // ============================================================
    // View Functions
    // ============================================================

    /// @notice Returns the total number of NFTs minted.
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /// @notice Returns true if the collection is fully minted.
    function soldOut() external view returns (bool) {
        return _totalSupply >= MAX_SUPPLY;
    }

    // ============================================================
    // Metadata
    // ============================================================

    /**
     * @notice Update the base URI for token metadata. Owner only.
     * @param newBaseURI New IPFS or HTTP base URI ending with "/" (e.g. "ipfs://Qm.../")
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
     * @notice Returns the URI for a given token ID, appending .json
     *         to support IPFS folder structures.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // Reverts with ERC721NonexistentToken if not minted

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string.concat(baseURI, Strings.toString(tokenId), ".json")
            : "";
    }

    // ============================================================
    // Owner Withdrawal
    // ============================================================

    /// @notice Withdraw all accumulated RITUAL from mint proceeds. Owner only.
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        if (!success) revert WithdrawFailed();
    }

    /// @notice Accept RITUAL sent directly to the contract
    receive() external payable {}

    // ============================================================
    // Internal helpers
    // ============================================================

    function _validateBaseURI(string memory baseURI) internal pure {
        bytes memory b = bytes(baseURI);
        if (b.length == 0 || b[b.length - 1] != "/") revert InvalidBaseURI();
    }
}
