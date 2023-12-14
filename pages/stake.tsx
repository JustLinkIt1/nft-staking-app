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

interface StakedToken {
  staker: string;
  tokenId: BigNumber;
}

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
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [unstakeProgress, setUnstakeProgress] = useState(0);

  useEffect(() => {
    if (!stakingContract || !address) return;
  
    const loadStakedNfts = async () => {
      if (!nftDropContract) {
        console.error("NFT Drop Contract is not loaded");
        return;
      }
    
      try {
        const stakedTokensResponse: StakedToken[] = await stakingContract.call("getStakedTokens", [address]);
        const stakedNftsData = await Promise.all(
          stakedTokensResponse.map(async (stakedToken: StakedToken) => {
            const nftData = await nftDropContract.get(stakedToken.tokenId.toString());
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
        const rewards = await stakingContract.call("availableRewards", [address]);
        setClaimableRewards(BigNumber.from(rewards));
      } catch (error) {
        console.error("Error loading claimable rewards:", error);
      }
    };
  
    loadStakedNfts();
    loadClaimableRewards();
  }, [address, stakingContract, nftDropContract]);
  

  const stakeNft = async (id: string) => {
    if (!address || !nftDropContract || !stakingContract) return;

    const isApproved = await nftDropContract.isApproved(address, stakingContractAddress);
    if (!isApproved) {
      await nftDropContract.setApprovalForAll(stakingContractAddress, true);
    }

    await stakingContract.call("stake", [id]);

  };

  const withdraw = async (id: string) => {
    if (!stakingContract) return;

    await stakingContract.call("withdraw", [id]);
  };

  const claimRewards = async () => {
    if (!stakingContract) return;

    await stakingContract.call("claimRewards");
  };
  
  const unstakeAll = async () => {
    if (!stakingContract || stakedNfts.length === 0) return;

    setIsUnstaking(true);
    setUnstakeProgress(0);

    try {
      for (let i = 0; i < stakedNfts.length; i++) {
        await stakingContract.call("withdraw", [stakedNfts[i].metadata.id.toString()]);
        setUnstakeProgress((prevProgress) => prevProgress + (1 / stakedNfts.length) * 100);
      }
      // Refresh the staked NFTs list here if needed
    } catch (error) {
      console.error("Error during unstaking all NFTs:", error);
    } finally {
      setIsUnstaking(false);
      setUnstakeProgress(0);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Connect Wallet Button */}
      {!address ? (
        <button className={styles.mainButton} onClick={(e) => connectWithMetamask()}>
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

          {/* Unstake All Button */}
          <button
            className={`${styles.mainButton} ${styles.spacerTop}`}
            onClick={unstakeAll}
            disabled={isUnstaking}
          >
            {isUnstaking ? `Unstaking... (${unstakeProgress.toFixed(0)}%)` : 'Unstake All'}
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
