import {
  ThirdwebNftMedia,
  useAddress,
  useMetamask,
  useTokenBalance,
  useOwnedNFTs,
  useContract,
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";

const nftDropContractAddress = "0x91fAaA600658052078Bc9622e0c1700A14579ce9";
const tokenContractAddress = "0xc94F5C4a091418D03Ff1989B48Db3139D1Af0D25";
const stakingContractAddress = "0x78919BAda94AF2703cbD29bfec663b3EaCA3F875";

const Stake: NextPage = () => {
  const address = useAddress();
  const connectWithMetamask = useMetamask();

  const { contract: nftDropContract } = useContract(nftDropContractAddress, "nft-drop");
  const { contract: tokenContract } = useContract(tokenContractAddress, "token");
  const { contract, isLoading } = useContract(stakingContractAddress);

  const { data: ownedNfts } = useOwnedNFTs(nftDropContract, address);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);

  const [stakedNfts, setStakedNfts] = useState<any[]>([]);
  const [claimableRewards, setClaimableRewards] = useState<BigNumber>();

  useEffect(() => {
    if (!contract || !address) return;

    async function loadStakedNfts() {
      const stakedTokens = await contract?.call("getStakedTokens", [address]);

      const stakedNfts = await Promise.all(
        stakedTokens?.map(async (stakedToken: { staker: string; tokenId: BigNumber }) => {
          const nft = await nftDropContract?.get(stakedToken.tokenId);
          return nft;
        })
      );

      setStakedNfts(stakedNfts);
    }

    loadStakedNfts();
  }, [address, contract, nftDropContract]);

  useEffect(() => {
    if (!contract || !address) return;

    async function loadClaimableRewards() {
      const cr = await contract?.call("availableRewards", [address]);
      setClaimableRewards(cr);
    }

    loadClaimableRewards();
  }, [address, contract]);

  async function stakeNft(id: string) {
    if (!address || !nftDropContract) return;

    const isApproved = await nftDropContract.isApproved(address, stakingContractAddress);
    if (!isApproved) {
      await nftDropContract.setApprovalForAll(stakingContractAddress, true);
    }
    await contract?.call("stake", id);
  }

  async function withdraw(id: BigNumber) {
    await contract?.call("withdraw", id);
  }

  async function claimRewards() {
    await contract?.call("claimRewards");
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Stake Your NFTs</h1>

      <hr className={`${styles.divider} ${styles.spacerTop}`} />

      {!address ? (
        <button className={styles.mainButton} onClick={connectWithMetamask}>
          Connect Wallet
        </button>
      ) : (
        <>
          <h2>Your Tokens</h2>

          <div className={styles.tokenGrid}>
            <div className={styles.tokenItem}>
              <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
              <p className={styles.tokenValue}>
                <b>
                  {!claimableRewards
                    ? "Loading..."
                    : ethers.utils.formatUnits(claimableRewards, 18)}
                </b>{" "}
                {tokenBalance?.symbol}
              </p>
            </div>
            <div className={styles.tokenItem}>
              <h3 className={styles.tokenLabel}>Current Balance</h3>
              <p className={styles.tokenValue}>
                <b>{tokenBalance?.displayValue}</b> {tokenBalance?.symbol}
              </p>
            </div>
          </div>

          <button
            className={`${styles.mainButton} ${styles.spacerTop}`}
            onClick={() => claimRewards()}
          >
            Claim Rewards
          </button>

          <hr className={`${styles.divider} ${styles.spacerTop}`} />

          <h2>Your Staked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {stakedNfts?.map((nft) => (
              <div className={styles.nftBox} key={nft.metadata.id.toString()}>
                <ThirdwebNftMedia
                  metadata={nft.metadata}
                  className={styles.nftMedia}
                />
                <h3>{nft.metadata.name}</h3>
                <button
                  className={`${styles.mainButton} ${styles.spacerBottom}`}
                  onClick={() => withdraw(nft.metadata.id)}
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>

          <hr className={`${styles.divider} ${styles.spacerTop}`} />

          <h2>Your Unstaked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {ownedNfts?.map((nft) => (
              <div className={styles.nftBox} key={nft.metadata.id.toString()}>
                <ThirdwebNftMedia
                  metadata={nft.metadata}
                  className={styles.nftMedia}
                />
                <h3>{nft.metadata.name}</h3>
                <button
                  className={`${styles.mainButton} ${styles.spacerBottom}`}
                  onClick={() => stakeNft(nft.metadata.id)}
                >
                  Stake
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Stake;
