// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTLoanCoin is ERC721URIStorage, Ownable {
    constructor()
        ERC721("Loan NFT", "LNFT")
        Ownable(0x7Db9C84846809362E37cBBfb61f4c9e63fD0c992)
    {}

    function mint(address _to, uint256 _tokenId, string calldata _uri)
        external
        onlyOwner
    {
        _mint(_to, _tokenId);
        _setTokenURI(_tokenId, _uri);
    }
}
