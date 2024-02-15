// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFTLoanCoin.sol";

//10000000000000000000
//5000000000000000000
//2500000000000000000

//1713015426


contract LoanContract is ERC20 {
    address public owner;
    address public contractAddress;
    NFTLoanCoin public nftLoanCoin;

    constructor() ERC20("LoanToken", "LT"){
        owner = 0x7Db9C84846809362E37cBBfb61f4c9e63fD0c992;
        contractAddress = address(this);
        _mint(owner, 1000000 * 10 ** decimals());
        nftLoanCoin = new NFTLoanCoin(); 
    }

    struct Loan{
        address borrower;
        address guarantor;
        address lender;
        uint256 amount;
        uint256 dueDate;
        uint256 interest;
        uint256 guarantorInterest;
        uint256 lenderInterest;
        bool requestActive; 
        bool guarantorFound; 
        bool guarantorAccepted; 
        bool lenderFound; 
    }

    struct OfferedNFT{
        uint256 loanId;
        uint256 tokenId;
        uint256 price;
        bool offerActive;
    }

    mapping(uint256 => Loan) public loans;
    mapping(uint256 => OfferedNFT) public nfts;
    uint256 public loanCounter = 0;
    uint256 public nftCounter = 0;

    function addMoney(address toAddress, uint amount) external {
        require(msg.sender == owner);
        require(amount <= balanceOf(msg.sender));
        transfer(toAddress, amount);
    }

    function requestLoan(uint256 amount, uint256 dueDate, uint256 interest) external {
        require(amount > 0, "Amount must be greater than 0");
        require(interest > 0, "Interest must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");

        loans[loanCounter++] = Loan({
            borrower: msg.sender,
            amount: amount,
            dueDate: dueDate,
            interest: interest,
            requestActive: true,

            guarantor: address(0),
            lender: address(0),
            guarantorInterest: 0,
            lenderInterest: 0,
            guarantorFound: false,
            guarantorAccepted: false,
            lenderFound:false
        });
    }

    function placeGuarantee(uint256 loanId, uint256 guarantorInterest) external{
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(!loans[loanId].guarantorFound, "Guarantor already found");
        require(!loans[loanId].guarantorAccepted, "Guarantor already found and accepted");
        require(!loans[loanId].lenderFound, "Loan is already done");
        require(msg.sender != loans[loanId].borrower, "Borrower cannot be the guarantor");
        require(balanceOf(msg.sender) >= loans[loanId].amount, "You dont have enough money");
        require(loans[loanId].interest > guarantorInterest, "Your interest can not exceed borrowers interest amount");
        require(guarantorInterest > 0, "You can not add negative interest");


        loans[loanId].guarantor = msg.sender;
        loans[loanId].guarantorInterest = guarantorInterest;
        loans[loanId].lenderInterest = loans[loanId].interest - guarantorInterest;
        loans[loanId].guarantorFound = true;


        transfer(contractAddress, loans[loanId].amount);
    }

    function acceptGuarantee(uint256 loanId) external {
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(!loans[loanId].guarantorAccepted, "Guarantee already accepted");
        require(!loans[loanId].lenderFound, "Loan is already done");
        require(msg.sender == loans[loanId].borrower, "You are not the borrower");

       loans[loanId].guarantorAccepted = true;

    }

    function rejectGuarantee(uint256 loanId) external {
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(!loans[loanId].guarantorAccepted, "Guarantee already accepted");
        require(!loans[loanId].lenderFound, "Loan is already done");
        require(msg.sender == loans[loanId].borrower, "You are not the borrower");

        loans[loanId].guarantorFound = false;
        loans[loanId].guarantorInterest = 0;
        loans[loanId].lenderInterest = 0;

        
        ERC20(contractAddress).transfer(loans[loanId].guarantor, loans[loanId].amount);

        // Remove the guarantee
        loans[loanId].guarantor = address(0);
    }

      function getAllLoans() external view returns (Loan[] memory) {
        Loan[] memory allLoans = new Loan[](loanCounter);

        for (uint256 i = 0; i < loanCounter; i++) {
            allLoans[i] = loans[i];
        }

        return allLoans;
    }

    function loanMoney(uint256 loanId) external {
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(loans[loanId].guarantorAccepted, "Guarantee not accepted");
        require(!loans[loanId].lenderFound, "Lending is already done");
        require(msg.sender != loans[loanId].borrower, "You cannot loan money to yourself");
        require(msg.sender != loans[loanId].guarantor, "You are guarantor already");
        require(balanceOf(msg.sender) >= loans[loanId].amount, "You dont have enough money for this loan");

        loans[loanId].lender = msg.sender;
        loans[loanId].lenderFound = true;

        transfer(loans[loanId].borrower, loans[loanId].amount);

    }

    function  withdrawFromGuarantor(uint256 loanId) external {
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(loans[loanId].guarantorAccepted, "Guarantee not accepted");
        require(loans[loanId].lenderFound, "Lender still not found");
        require(msg.sender == loans[loanId].lender, "You are not lender");
        require(loans[loanId].dueDate < block.timestamp, "Due date must be in the past");

        loans[loanId].requestActive= false;

        ERC20(contractAddress).transfer(loans[loanId].lender, loans[loanId].amount);
       
    }

     function  payLoan(uint256 loanId) external {
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorAccepted, "Guarantee not accepted");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(loans[loanId].lenderFound, "Lender still not found");
        require(msg.sender == loans[loanId].borrower, "You are not borrower");
        require(balanceOf(msg.sender) >= loans[loanId].amount + loans[loanId].interest, "You dont have enough money to pay amount + interest value");

        loans[loanId].requestActive= false;

        transfer(contractAddress, loans[loanId].amount + loans[loanId].interest);
        ERC20(contractAddress).transfer(loans[loanId].guarantor, loans[loanId].amount + loans[loanId].guarantorInterest);
        ERC20(contractAddress).transfer(loans[loanId].lender, loans[loanId].amount + loans[loanId].lenderInterest);
     }

    function offerNFT(uint256 loanId,uint256 _tokenId, uint256 price) external {
        require(nftLoanCoin.ownerOf(_tokenId) == msg.sender,"You are not the owner of this NFT");
        require(nftLoanCoin.isApprovedForAll(msg.sender,contractAddress),"First you have to gain rights");
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorAccepted, "Guarantee not accepted");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(loans[loanId].lenderFound, "Lender still not found");
        require(loans[loanId].amount >= price, "Price must be smaller or equal to borrowed money");
        require(msg.sender == loans[loanId].borrower, "You are not borrower");

        nfts[nftCounter++] = OfferedNFT({
        loanId: loanId,
        tokenId: _tokenId,
        price: price,
        offerActive: true
        });
    }

       function acceptNFT(uint256 nftOfferId) external {
        uint256 loanId = nfts[nftOfferId].loanId;
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorAccepted, "Guarantee not accepted");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(loans[loanId].lenderFound, "Lender still not found");
        require(nfts[nftOfferId].offerActive, "NFT not offered");
        require(msg.sender == loans[loanId].lender, "You are not lender");

        nftLoanCoin.transferFrom(loans[loanId].borrower, loans[loanId].lender, nfts[nftOfferId].tokenId);

        loans[loanId].amount = loans[loanId].amount - nfts[nftOfferId].price;
        nfts[nftOfferId].loanId = 0;
        nfts[nftOfferId].tokenId = 0;
        nfts[nftOfferId].price = 0;
        nfts[nftOfferId].offerActive = false;
    }

       function rejectNFT(uint256 nftOfferId) external {
        uint256 loanId = nfts[nftOfferId].loanId;
        require(loans[loanId].requestActive, "Loan request not found or not active");
        require(loans[loanId].guarantorAccepted, "Guarantee not accepted");
        require(loans[loanId].guarantorFound, "Guarantee still not found");
        require(loans[loanId].lenderFound, "Lender still not found");
        require(nfts[nftOfferId].offerActive, "NFT not offered");
        require(msg.sender == loans[loanId].lender, "You are not lender");

        nfts[nftOfferId].loanId = 0;
        nfts[nftOfferId].tokenId = 0;
        nfts[nftOfferId].price = 0;
        nfts[nftOfferId].offerActive = false;
    }



}