const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              //const accounts = await ethers.getSigners()
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", function () {
              it("Sets the Aggregator address correctly", async function () {
                  response = await fundMe.s_priceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              it("Fails if you dont send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Minimum value not met!!"
                  )
              })

              it("Updates the amount funded Data Structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.s_addressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Adds s_funders to s_funders array", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.s_funders(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("Withdraw", function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("Withdraw ETH from a single Founder", async function () {
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingdeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  const response = startingFundMeBalance
                      .add(startingDeployerBalance)
                      .toString()

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingdeployerBalance.add(gasCost).toString()
                  )
              })

              it("Withdraw ETH from multiple s_funders", async function () {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < accounts.length; ++i) {
                      const fundMeConnectedContracts = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContracts.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingdeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  const response = startingFundMeBalance
                      .add(startingDeployerBalance)
                      .toString()

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingdeployerBalance.add(gasCost).toString()
                  )

                  await expect(fundMe.s_funders(0)).to.be.reverted

                  for (i = 0; i < 6; i++) {
                      assert.equal(
                          await fundMe.s_addressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("Only Allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  fundMe = await fundMe.connect(accounts[1])
                  await expect(fundMe.withdraw()).to.be.revertedWithCustomError(
                      fundMe,
                      "FundMe__NotOwner"
                  )
              })
          })
      })
