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
  const { contract: stakingContract, isLoading } = useContract(stakingContractAddress);

  const { data: ownedNfts } = useOwnedNFTs(nftDropContract, address);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);

  const [stakedNfts, setStakedNfts] = useState<any[]>([]);
  const [claimableRewards, setClaimableRewards] = useState<BigNumber>();

  useEffect(() => {
    if (!stakingContract || !address) return;
  
    const loadStakedNfts = async () => {
      try {
        const stakedTokensResponse = await stakingContract.call("getStakedTokens", address);
        const stakedNftsData = await Promise.all(
          stakedTokensResponse.map(async (stakedToken) => {
            const nftData = await nftDropContract.get(stakedToken.tokenId);
            return nftData;
          })
        );
        setStakedNfts(stakedNftsData);
      } catch (error) {
        console.error("Error loading staked NFTs:", error);
      }
    };
  
    const loadClaimableRewards = async () => {
      try {
        const rewards = await stakingContract.call("availableRewards", address);
        setClaimableRewards(BigNumber.from(rewards));
      } catch (error) {
        console.error("Error loading claimable rewards:", error);
      }
    };
  
    loadStakedNfts();
    loadClaimableRewards();
  }, [address, stakingContract, nftDropContract]);
  

  const stakeNft = async (id) => {
    if (!address || !nftDropContract || !stakingContract) return;

    const isApproved = await nftDropContract.isApproved(address, stakingContractAddress);
    if (!isApproved) {
      await nftDropContract.setApprovalForAll(stakingContractAddress, true);
    }

    await stakingContract.call("stake", id);
  };

  const withdraw = async (id) => {
    if (!stakingContract) return;

    await stakingContract.call("withdraw", id);
  };

  const claimRewards = async () => {
    if (!stakingContract) return;

    await stakingContract.call("claimRewards");
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Connect Wallet Button */}
      {!address ? (
        <button className={styles.mainButton} onClick={connectWithMetamask}>
          Connect Wallet
        </button>
      ) : (
        <>
          {/* Display Token Balance and Claimable Rewards */}
          <div className={styles.tokenGrid}>
            {/* Claimable Rewards */}
            <div className={styles.tokenItem}>
              <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
              <p className={styles.tokenValue}>
                <b>{claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "Loading..."}</b>
                {' '}{tokenBalance?.symbol}
              </p>
            </div>
            {/* Current Balance */}
            <div className={styles.tokenItem}>
              <h3 className={styles.tokenLabel}>Current Balance</h3>
              <p className={styles.tokenValue}>
                <b>{tokenBalance?.displayValue}</b>
                {' '}{tokenBalance?.symbol}
              </p>
            </div>
          </div>

          {/* Claim Rewards Button */}
          <button
            className={`${styles.mainButton} ${styles.spacerTop}`}
            onClick={() => claimRewards()}
          >
            Claim Rewards
          </button>

          {/* Display Staked NFTs */}
          <h2>Your Staked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {stakedNfts?.map((nft) => (
              <div className={styles.nftBox} key={nft.metadata.id.toString()}>
                <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
                <h3>{nft.metadata.name}</h3>
                <button className={`${styles.mainButton} ${styles.spacerBottom}`} onClick={() => withdraw(nft.metadata.id)}>
                  Withdraw
                </button>
              </div>
            ))}
          </div>

          {/* Display Owned (Unstaked) NFTs */}
          <h2>Your Unstaked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {ownedNfts?.map((nft) => (
              <div className={styles.nftBox} key={nft.metadata.id.toString()}>
                <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
                <h3>{nft.metadata.name}</h3>
                <button className={`${styles.mainButton} ${styles.spacerBottom}`} onClick={() => stakeNft(nft.metadata.id)}>
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
