import { deployments, ethers, network } from "hardhat";
import { expect, use } from "chai";
import { solidity } from "ethereum-waffle";
import { Signer } from "ethers";
import { FeeManagerFacet } from "../dist/src/types/FeeManagerFacet";
import { FeeManagerFacet__factory } from "../dist/src/types/factories/FeeManagerFacet__factory";
import { DebugFacet } from "../dist/src/types/DebugFacet";
import { DebugFacet__factory } from "../dist/src/types/factories/DebugFacet__factory";
import { SimpleToken } from "../dist/src/types/SimpleToken";
import { SimpleToken__factory } from "../dist/src/types/factories/SimpleToken__factory";
import { RollupsInitFacet } from "../dist/src/types/RollupsInitFacet";
import { RollupsInitFacet__factory } from "../dist/src/types/factories/RollupsInitFacet__factory";
import { getState } from "./getState";

use(solidity);

describe("FeeManager Facet", () => {
    let enableDelegate = process.env["DELEGATE_TEST"];

    let signers: Signer[];
    let token: SimpleToken;
    let feeManagerFacet: FeeManagerFacet;
    let rollupsInitFacet: RollupsInitFacet;
    let debugFacet: DebugFacet;
    let tokenSupply = 1000000; // assume FeeManagerImpl contract owner has 1 million tokens (ignore decimals)
    let initialFeePerClaim = 10; // set initial fees per claim as 10 token

    beforeEach(async () => {
        // get signers
        signers = await ethers.getSigners();

        await deployments.fixture(["DebugDiamond"]);
        
        const diamondAddress = (await deployments.get("CartesiRollupsDebug")).address;
        debugFacet = DebugFacet__factory.connect(diamondAddress, signers[0]);
        feeManagerFacet = FeeManagerFacet__factory.connect(diamondAddress, signers[0]);
        rollupsInitFacet = RollupsInitFacet__factory.connect(diamondAddress, signers[0]);
        const tokenAddress = (await deployments.get("SimpleToken")).address;
        token = SimpleToken__factory.connect(tokenAddress, signers[0]);
    });

    it("test initial feePerClaim", async () => {
        expect(await debugFacet._getFeePerClaim(), "initial feePerClaim").to.equal(
            initialFeePerClaim
        );

        // test delegate
        if (enableDelegate) {
            let initialState = JSON.stringify({
                fee_manager_address: feeManagerFacet.address,
            });

            let state = JSON.parse(await getState(initialState));

            // console.log(state);
        }
    });

    it("test constructor event FeeManagerCreated", async () => {
        let eventFilter = rollupsInitFacet.filters.FeeManagerInitialized(
            null,
            null
        );
        let event = await rollupsInitFacet.queryFilter(eventFilter);
        let eventArgs = event[0]["args"];

        expect(eventArgs["_erc20ForFee"], "ERC20 token address").to.equal(
            token.address
        );
        expect(eventArgs["_feePerClaim"], "feePerClaim").to.equal(
            initialFeePerClaim
        );
    });

//    it("fund the FeeManager contract and emit event", async () => {
//        expect(
//            await token.balanceOf(feeManagerFacet.address),
//            "initially the contract has no erc20 tokens"
//        ).to.equal(0);
//
//        // fund 10000 tokens
//        let amount = 10000;
//        expect(await token.transfer(feeManagerFacet.address, amount))
//            .to.emit(token, "Transfer")
//            .withArgs(
//                await signers[0].getAddress(),
//                feeManagerFacet.address,
//                amount
//            );
//
//        expect(
//            await token.balanceOf(feeManagerFacet.address),
//            "feeManager now has 10k erc20 tokens"
//        ).to.equal(amount);
//        expect(
//            await token.balanceOf(await signers[0].getAddress()),
//            "owner has 10k less tokens"
//        ).to.equal(tokenSupply - amount);
//
//        // again, fund 10000 tokens
//        expect(await token.transfer(feeManagerFacet.address, amount))
//            .to.emit(token, "Transfer")
//            .withArgs(
//                await signers[0].getAddress(),
//                feeManagerFacet.address,
//                amount
//            );
//
//        expect(
//            await token.balanceOf(feeManagerFacet.address),
//            "feeManager now has 20k erc20 tokens"
//        ).to.equal(amount * 2);
//        expect(
//            await token.balanceOf(await signers[0].getAddress()),
//            "owner has 20k less tokens"
//        ).to.equal(tokenSupply - amount * 2);
//    });
//
//    // test numClaimsRedeemable
//    it("test numClaimsRedeemable()", async () => {
//        // revert on address 0
//        let address_zero = "0x0000000000000000000000000000000000000000";
//        await expect(
//            feeManagerFacet.numClaimsRedeemable(address_zero),
//            "should revert on address 0"
//        ).to.be.revertedWith("address should not be 0");
//
//        // assume signers[1] is a validator with 0 redeemable claims
//        await mockValidatorManager.mock.getValidatorIndex.returns(0);
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(0);
//        expect(
//            await feeManagerFacet.callStatic.numClaimsRedeemable(
//                await signers[1].getAddress()
//            ),
//            "initially, no redeemable claims"
//        ).to.equal(0);
//
//        // assume signers[1] makes 10 claims
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(10);
//        expect(
//            await feeManagerFacet.callStatic.numClaimsRedeemable(
//                await signers[1].getAddress()
//            ),
//            "now there are 10 claims redeemable"
//        ).to.equal(10);
//
//        // if signers[1] has claimed fees, then there's no redeemable claims again
//        // first, owner should fund the FeeManager
//        let amount = 10000;
//        await token.transfer(feeManagerFacet.address, amount);
//        await feeManagerFacet.redeemFee(await signers[1].getAddress());
//
//        expect(
//            await feeManagerFacet.callStatic.numClaimsRedeemable(
//                await signers[1].getAddress()
//            ),
//            "redeemable claims are all redeemed"
//        ).to.equal(0);
//
//        // test default "underflow check" by sol0.8
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(0);
//        await expect(
//            feeManagerFacet.numClaimsRedeemable(await signers[1].getAddress()),
//            "0 - 10"
//        ).to.be.reverted;
//    });
//
//    // test getNumClaimsRedeemed
//    it("test getNumClaimsRedeemed()", async () => {
//        // revert on address 0
//        let address_zero = "0x0000000000000000000000000000000000000000";
//        await expect(
//            feeManagerFacet.getNumClaimsRedeemed(address_zero),
//            "getNumClaimsRedeemed() should revert on address 0"
//        ).to.be.revertedWith("address should not be 0");
//
//        // assume signers[1] is a validator with 0 redeemed claims
//        await mockValidatorManager.mock.getValidatorIndex.returns(0);
//        expect(
//            await feeManagerFacet.callStatic.getNumClaimsRedeemed(
//                await signers[1].getAddress()
//            ),
//            "initially, no redeemed claims"
//        ).to.equal(0);
//
//        // assume signers[1] redeems 10 claims
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(10);
//        let amount = 10000;
//        await token.transfer(feeManagerFacet.address, amount);
//        await feeManagerFacet.redeemFee(await signers[1].getAddress());
//
//        expect(
//            await feeManagerFacet.callStatic.getNumClaimsRedeemed(
//                await signers[1].getAddress()
//            ),
//            "now #redeemed should be 10"
//        ).to.equal(10);
//    });
//
//    // redeem fees
//    it("test redeemFee() when no claims have been made", async () => {
//        // assume signers[1] is a validator
//        await mockValidatorManager.mock.getValidatorIndex.returns(0);
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(0);
//
//        await expect(
//            feeManagerFacet.redeemFee(await signers[1].getAddress()),
//            "no claims made"
//        ).to.be.revertedWith("nothing to redeem yet");
//    });
//
//    it("redeemFee on his/her own", async () => {
//        //owner fund FeeManager
//        let amount = 10000;
//        await token.transfer(feeManagerFacet.address, amount);
//
//        // assume signers[1] is a validator
//        await mockValidatorManager.mock.getValidatorIndex.returns(0);
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(10);
//
//        await expect(
//            feeManagerFacet
//                .connect(signers[1])
//                .redeemFee(await signers[1].getAddress()),
//            "redeem fee for 10 claims"
//        )
//            .to.emit(feeManagerFacet, "FeeRedeemed")
//            .withArgs(await signers[1].getAddress(), 10 * initialFeePerClaim);
//
//        // check balances
//        expect(
//            await token.balanceOf(feeManagerFacet.address),
//            "feeManager now has 10*initialFeePerClaim less tokens"
//        ).to.equal(amount - 10 * initialFeePerClaim);
//        expect(
//            await token.balanceOf(await signers[1].getAddress()),
//            "validator now has 10*initialFeePerClaim tokens"
//        ).to.equal(10 * initialFeePerClaim);
//
//        // redeemFee again
//        await expect(
//            feeManagerFacet
//                .connect(signers[1])
//                .redeemFee(await signers[1].getAddress()),
//            "no additional claims made"
//        ).to.be.revertedWith("nothing to redeem yet");
//
//        // make more claims and then redeemFee
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(30);
//        await expect(
//            feeManagerFacet
//                .connect(signers[1])
//                .redeemFee(await signers[1].getAddress()),
//            "redeem fee for 20 more claims"
//        )
//            .to.emit(feeManagerFacet, "FeeRedeemed")
//            .withArgs(await signers[1].getAddress(), 20 * initialFeePerClaim);
//        // check balances
//        expect(
//            await token.balanceOf(feeManagerFacet.address),
//            "feeManager now has totally 30*initialFeePerClaim less tokens"
//        ).to.equal(amount - 30 * initialFeePerClaim);
//        expect(
//            await token.balanceOf(await signers[1].getAddress()),
//            "validator now has totally 30*initialFeePerClaim tokens"
//        ).to.equal(30 * initialFeePerClaim);
//    });
//
//    it("redeemFee on other's behalf", async () => {
//        //owner fund FeeManager
//        let amount = 10000;
//        await token.transfer(feeManagerFacet.address, amount);
//
//        // assume signers[1] is a validator
//        await mockValidatorManager.mock.getValidatorIndex.returns(0);
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex.returns(10);
//
//        // let signers[0] help signers[1] redeemFee
//        await expect(
//            feeManagerFacet.redeemFee(await signers[1].getAddress()),
//            "signers[0] helps signers[1] redeemFee"
//        )
//            .to.emit(feeManagerFacet, "FeeRedeemed")
//            .withArgs(await signers[1].getAddress(), 10 * initialFeePerClaim);
//
//        // check balances
//        expect(
//            await token.balanceOf(feeManagerFacet.address),
//            "signers[0] helped signers[1]: feeManager now has 10*initialFeePerClaim less tokens"
//        ).to.equal(amount - 10 * initialFeePerClaim);
//        expect(
//            await token.balanceOf(await signers[1].getAddress()),
//            "signers[0] helped signers[1]: signers[1] now has 10*initialFeePerClaim tokens"
//        ).to.equal(10 * initialFeePerClaim);
//        expect(
//            await token.balanceOf(await signers[0].getAddress()),
//            "signers[0] helped signers[1]: signers[0] balance doesn't change"
//        ).to.equal(tokenSupply - amount);
//    });
//
//    // only owner can call resetFeePerClaim
//    it("only owner can call resetFeePerClaim", async () => {
//        await expect(
//            feeManagerFacet.connect(signers[1]).resetFeePerClaim(30),
//            "only owner"
//        ).to.be.reverted;
//    });
//
//    // reset fee per claim
//    it("reset feePerClaim", async () => {
//        //owner fund FeeManager
//        let amount = 10000;
//        await token.transfer(feeManagerFacet.address, amount);
//
//        // assume signers[1], signers[2], signers[3] are the validator set
//        await mockValidatorManager.mock.maxNumValidators.returns(3);
//        await mockValidatorManager.mock.validators
//            .withArgs(0)
//            .returns(await signers[1].getAddress());
//        await mockValidatorManager.mock.validators
//            .withArgs(1)
//            .returns(await signers[2].getAddress());
//        await mockValidatorManager.mock.validators
//            .withArgs(2)
//            .returns(await signers[3].getAddress());
//        await mockValidatorManager.mock.getValidatorIndex
//            .withArgs(await signers[1].getAddress())
//            .returns(0);
//        await mockValidatorManager.mock.getValidatorIndex
//            .withArgs(await signers[2].getAddress())
//            .returns(1);
//        await mockValidatorManager.mock.getValidatorIndex
//            .withArgs(await signers[3].getAddress())
//            .returns(2);
//
//        // the number of claims they have made
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex
//            .withArgs(0)
//            .returns(10);
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex
//            .withArgs(1)
//            .returns(20);
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex
//            .withArgs(2)
//            .returns(0);
//
//        // assume the signers[1] has already claimed
//        await feeManagerFacet
//            .connect(signers[1])
//            .redeemFee(await signers[1].getAddress());
//
//        // get validators' balances before resetting fees
//        let balance0_before = await token.balanceOf(
//            await signers[1].getAddress()
//        );
//        let balance1_before = await token.balanceOf(
//            await signers[2].getAddress()
//        );
//        let balance2_before = await token.balanceOf(
//            await signers[3].getAddress()
//        );
//
//        let newFeePerClaim = 30;
//        // reset fee from 10 -> 30
//        expect(await feeManagerFacet.resetFeePerClaim(newFeePerClaim))
//            .to.emit(feeManagerFacet, "FeePerClaimReset")
//            .withArgs(newFeePerClaim);
//
//        // get new balances
//        let balance0_after = await token.balanceOf(
//            await signers[1].getAddress()
//        );
//        let balance1_after = await token.balanceOf(
//            await signers[2].getAddress()
//        );
//        let balance2_after = await token.balanceOf(
//            await signers[3].getAddress()
//        );
//
//        // check new balances
//        expect(balance0_after, "balance of signers[1] stays the same").to.equal(
//            balance0_before
//        );
//        expect(
//            balance1_after.toNumber(),
//            "signers[2] gets fees for 20 claims"
//        ).to.equal(balance1_before.toNumber() + 20 * initialFeePerClaim);
//        expect(balance2_after, "balance of signers[3] stays the same").to.equal(
//            balance2_before
//        );
//
//        // feePerClaim is updated
//        expect(
//            await feeManagerFacet.feePerClaim(),
//            "check updated feeManager"
//        ).to.equal(newFeePerClaim);
//
//        // now onwards, validators can claim based on new rates
//        // assume signers[3] makes 10 claims now and claims fees on its own
//        await mockValidatorManager.mock.getNumberOfClaimsByIndex
//            .withArgs(2)
//            .returns(10);
//        await feeManagerFacet
//            .connect(signers[3])
//            .redeemFee(await signers[3].getAddress());
//        expect(
//            await token.balanceOf(await signers[3].getAddress()),
//            "balance of signers[3] after resetting fees and making claims"
//        ).to.equal(10 * newFeePerClaim);
//    });
});
