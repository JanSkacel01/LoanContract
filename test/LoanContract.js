const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  
  describe("LoanContract", function () {
    async function deploy() {
    
        // Contracts are deployed using the first signer/account by default
        const [borrower, guarantor,lender] = await ethers.getSigners();
        const owner = await ethers.getSigners("0x7Db9C84846809362E37cBBfb61f4c9e63fD0c992");
        const LoanContract = await ethers.getContractFactory("LoanContract");
        const loanContract = await LoanContract.deploy();
    
        return { loanContract, owner, borrower, guarantor, lender };
      }

    //const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

    describe("addMoney", function () {

      it("Should allow adding money", async function () {
          const { loanContract, owner, guarantor } = await loadFixture(deploy);

          await expect(
            loanContract.connect(owner).addMoney(guarantor.address,10000)
          ).to.not.be.reverted;
        });

        it("Should not allow adding money because not owner", async function () {
          const { loanContract, owner, guarantor } = await loadFixture(deploy);

          await expect(
            loanContract.connect(guarantor).addMoney(guarantor.address,10000)
          ).to.be.reverted;
        });

        });

        

    describe("LoanRequest", function () {

    it("Should allow borrower to request a loan", async function () {
        const { loanContract, owner, borrower } = await loadFixture(deploy);
        const amount = 1000;
        const dueDate = 1713015426; // Due date 1 hour from now
        const interest = 100;
        
        await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
        const loan = await loanContract.loans(0);
    
        expect(loan.borrower).to.equal(borrower.address);
        expect(loan.amount).to.equal(amount);
        expect(loan.dueDate).to.equal(dueDate);
        expect(loan.interest).to.equal(interest);
        expect(loan.requestActive).to.be.true;
        expect(loan.guarantor).to.equal("0x0000000000000000000000000000000000000000");
        expect(loan.lender).to.equal("0x0000000000000000000000000000000000000000");//
        expect(loan.guarantorInterest).to.equal(0);
        expect(loan.lenderInterest).to.equal(0);
        expect(loan.guarantorFound).to.be.false;
        expect(loan.guarantorAccepted).to.be.false;
        expect(loan.lenderFound).to.be.false;
      });
    
  
    it("Should revert if amount is not greater than 0", async function () {
    const { loanContract, owner, borrower } = await loadFixture(deploy);
    const amount = 0;
    const dueDate = Math.floor(Date.now() / 1000) + 3600; 
    const interest = 100;
    
    await expect(
      loanContract.connect(borrower).requestLoan(amount, dueDate, interest)
    ).to.be.revertedWith("Amount must be greater than 0");
  });

  it("Should revert if interest is not greater than 0", async function () {
    const { loanContract, owner, borrower } = await loadFixture(deploy);
    const amount = 1000;
    const dueDate = Math.floor(Date.now() / 1000) + 3600; 
    const interest = 0;
    
    await expect(
      loanContract.connect(borrower).requestLoan(amount, dueDate, interest)
    ).to.be.revertedWith("Interest must be greater than 0");
  });

  it("Should revert if due date is not in the future", async function () {
    const { loanContract, owner, borrower } = await loadFixture(deploy);
    const amount = 1000;
    const dueDate = Math.floor(Date.now() / 1000) - 3600; 
    const interest = 100;
    
    await expect(
      loanContract.connect(borrower).requestLoan(amount, dueDate, interest)
    ).to.be.revertedWith("Due date must be in the future");
  });
});

describe("PlaceGuarantee", function () {

  it("Should allow a guarantor to place a guarantee", async function () {

    const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
    // Request a loan first
    const amount = 1000;
    const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
    const interest = 100;
    await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);

    await loanContract.connect(owner).addMoney(guarantor.address,1000000);
    
    // Place guarantee
    const loanId = 0; // Assuming only one loan has been requested
    const guarantorInterest = 50;
    await loanContract.connect(guarantor).placeGuarantee(loanId, guarantorInterest);

    const loan = await loanContract.loans(loanId);

    expect(loan.guarantor).to.equal(guarantor.address);
    expect(loan.guarantorInterest).to.equal(guarantorInterest);
    expect(loan.lenderInterest).to.equal(interest - guarantorInterest);
    expect(loan.guarantorFound).to.be.true;
    expect(await loanContract.balanceOf(guarantor.address)).to.equal(0); // Guarantor should have transferred the amount to the contract
  });

    
    it("should revert if the loan request is not active", async function () {
        const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
        await expect(
          loanContract.connect(guarantor).placeGuarantee(0, 50)
        ).to.be.revertedWith("Loan request not found or not active");
      });

});

describe("AcceptGuarantee", function () {

  it("Should allow to accept guarantee", async function () {
    const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
    const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await loanContract.connect(owner).addMoney(guarantor.address,1000000);
      await loanContract.connect(guarantor).placeGuarantee(0,50);

    await expect(
      loanContract.connect(guarantor).acceptGuarantee(0)
    ).to.not.be.reverted;
  });

  it("should revert if the loan request is not active", async function () {
      const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
      await expect(
        loanContract.connect(guarantor).acceptGuarantee(0)
      ).to.be.revertedWith("Loan request not found or not active");
    });

    it("should revert if the Guarantee still not found", async function () {
      const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
      const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await expect(
        loanContract.connect(guarantor).acceptGuarantee(0)
      ).to.be.revertedWith("Guarantee still not found");
    });

});

describe("RejectGuarantee", function () {

  
  it("Should allow to reject guarantee", async function () {
    const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
    const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await loanContract.connect(owner).addMoney(guarantor.address,1000000);
      await loanContract.connect(guarantor).placeGuarantee(0,50);

    await expect(
      loanContract.connect(guarantor).rejectGuarantee(0)
    ).to.not.be.reverted;
  });
    
  it("should revert if the loan request is not active", async function () {
      const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
      await expect(
        loanContract.connect(guarantor).rejectGuarantee(0)
      ).to.be.revertedWith("Loan request not found or not active");
    });

    it("should revert if the Guarantee still not found", async function () {
      const { loanContract, owner, borrower,guarantor } = await loadFixture(deploy);
      const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await expect(
        loanContract.connect(guarantor).rejectGuarantee(0)
      ).to.be.revertedWith("Guarantee still not found");
    });

});

describe("loanMoney", function () {

  it("Should allow to loan money", async function () {
    const { loanContract, owner, borrower,guarantor, lender } = await loadFixture(deploy);
    const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await loanContract.connect(owner).addMoney(guarantor.address,1000000);
      await loanContract.connect(guarantor).placeGuarantee(0,50);
      await loanContract.connect(borrower).acceptGuarantee(0);

    await expect(
      loanContract.connect(lender).loanMoney(0)
    ).to.not.be.reverted;
  });

    
  it("should revert if the loan request is not active", async function () {
      const { loanContract, owner, borrower,guarantor,lender } = await loadFixture(deploy);
      await expect(
        loanContract.connect(lender).loanMoney(0)
      ).to.be.revertedWith("Loan request not found or not active");
    });

    it("should revert if Guarantee still not found", async function () {
      const { loanContract, owner, borrower,guarantor,lender } = await loadFixture(deploy);
      const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await expect(
        loanContract.connect(lender).loanMoney(0)
      ).to.be.revertedWith("Guarantee still not found");
    });

});

describe("withdrawFromGuarantor", function () {

  it("Should allow to Withdraw From Guarantor", async function () {
    const { loanContract, owner, borrower,guarantor, lender } = await loadFixture(deploy);
    const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await loanContract.connect(owner).addMoney(guarantor.address,1000000);
      await loanContract.connect(guarantor).placeGuarantee(0,50);
      await loanContract.connect(borrower).acceptGuarantee(0);
      await loanContract.connect(lender).loanMoney(0);

      const _dueDate = loanContract.loans[0].dueDate;
      await time.increaseTo(_dueDate+2);
    await expect(
      loanContract.connect(lender).withdrawFromGuarantor(0)
    ).to.not.be.reverted;
  });

    
  it("should revert if the loan request is not active", async function () {
      const { loanContract, owner, borrower,guarantor,lender } = await loadFixture(deploy);
      await expect(
        loanContract.connect(lender).withdrawFromGuarantor(0)
      ).to.be.revertedWith("Loan request not found or not active");
    });

    it("should revert if Guarantee still not found", async function () {
      const { loanContract, owner, borrower,guarantor,lender } = await loadFixture(deploy);
      const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await expect(
        loanContract.connect(lender).withdrawFromGuarantor(0)
      ).to.be.revertedWith("Guarantee still not found");
    });

});


describe("payLoan", function () {

  it("Should allow to Withdraw From Guarantor", async function () {
    const { loanContract, owner, borrower,guarantor, lender } = await loadFixture(deploy);
    const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await loanContract.connect(owner).addMoney(guarantor.address,1000000);
      await loanContract.connect(guarantor).placeGuarantee(0,50);
      await loanContract.connect(borrower).acceptGuarantee(0);
      await loanContract.connect(lender).loanMoney(0);

    await expect(
      loanContract.connect(lender).payLoan(0)
    ).to.not.be.reverted;
  });

    
  it("should revert if the loan request is not active", async function () {
      const { loanContract, owner, borrower,guarantor,lender } = await loadFixture(deploy);
      await expect(
        loanContract.connect(lender).payLoan(0)
      ).to.be.revertedWith("Loan request not found or not active");
    });

    it("should revert if Guarantee not accepted", async function () {
      const { loanContract, owner, borrower,guarantor,lender } = await loadFixture(deploy);
      const amount = 1000;
      const dueDate = Math.floor(Date.now() / 1000) + 3600; // Due date 1 hour from now
      const interest = 100;
      await loanContract.connect(borrower).requestLoan(amount, dueDate, interest);
      await expect(
        loanContract.connect(lender).payLoan(0)
      ).to.be.revertedWith("Guarantee not accepted");
    });

});


  });