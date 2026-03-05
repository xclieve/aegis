import { Connection, PublicKey, Commitment } from "@solana/web3.js";
import { AnchorProvider, Program, Idl, BN } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";

// Network configuration - TESTNET
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "testnet";
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.testnet.solana.com";

// ========================================
// DEPLOYED PROGRAM IDs (Testnet)
// ========================================

// Core AEGIS token program
export const AEGIS_PROGRAM_ID = new PublicKey(
  "F2dTW59to7C3zqFuTVa2LZWSnhJfixBse2ytimQeU4Kd"
);

// Fee distribution program (25% burn, 50% stakers, 25% bounty)
export const FEE_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "BrjsCzt26mJEmSXaQmQxud3r1EfRcs5neJ3JH75U2Tzx"
);

// Staking program - DEPLOYED TO TESTNET
export const STAKING_PROGRAM_ID = new PublicKey(
  "AgAQSxNVkSCFzmtkk5iZ5Wn16Sfj1sY4XqX5nnRxZqad"
);

// Token mint - will be created after initialization
export const AEGIS_MINT = new PublicKey(
  "BUdnYqg7ReN3YPMysGGz6i6qLYftj5YAKnnJMsRNB9do" // Testnet AEGIS Token (Token-2022 with 2% fee)
);

// Fee authority wallet
export const FEE_AUTHORITY = new PublicKey(
  "Am4TsCvVZTRAXjgzoLEE5YtbVtdy4qkGv69Xm8rBande"
);

// Deployment status (for UI display)
export const DEPLOYMENT_STATUS = {
  aegis: { deployed: true, programId: "F2dTW59to7C3zqFuTVa2LZWSnhJfixBse2ytimQeU4Kd" },
  feeDistributor: { deployed: true, programId: "BrjsCzt26mJEmSXaQmQxud3r1EfRcs5neJ3JH75U2Tzx" },
  staking: { deployed: true, programId: "AgAQSxNVkSCFzmtkk5iZ5Wn16Sfj1sY4XqX5nnRxZqad" },
};

// ========================================
// PDA DERIVATION HELPERS
// ========================================

export const findStakingPoolPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool"), mint.toBuffer()],
    STAKING_PROGRAM_ID
  );
};

export const findStakeAccountPDA = (
  pool: PublicKey,
  user: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake_account"), pool.toBuffer(), user.toBuffer()],
    STAKING_PROGRAM_ID
  );
};

export const findDistributorPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("distributor"), mint.toBuffer()],
    FEE_DISTRIBUTOR_PROGRAM_ID
  );
};

// ========================================
// PROVIDER & CONNECTION
// ========================================

export const getProvider = (
  connection: Connection,
  wallet: AnchorWallet,
  opts?: { commitment?: Commitment }
): AnchorProvider => {
  const commitment = opts?.commitment || "confirmed";
  return new AnchorProvider(connection, wallet, { commitment });
};

export const getConnection = (): Connection => {
  return new Connection(RPC_URL, "confirmed");
};

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface StakingPool {
  authority: PublicKey;
  mint: PublicKey;
  stakeVault: PublicKey;
  rewardsVault: PublicKey;
  totalStaked: BN;
  rewardPerTokenStored: BN;
  bump: number;
}

export interface StakeAccount {
  owner: PublicKey;
  pool: PublicKey;
  stakedAmount: BN;
  rewardPerTokenPaid: BN;
  rewardsOwed: BN;
  bump: number;
}

export interface DistributorState {
  authority: PublicKey;
  mint: PublicKey;
  feeVault: PublicKey;
  burnVault: PublicKey;
  stakingRewardsVault: PublicKey;
  bountyTreasury: PublicKey;
  totalHarvested: BN;
  totalBurned: BN;
  totalToStakers: BN;
  totalToBounty: BN;
  bump: number;
}

// ========================================
// FORMATTING UTILITIES
// ========================================

// AEGIS has 9 decimals
export const AEGIS_DECIMALS = 9;

export const formatTokenAmount = (amount: BN | number): string => {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  return (value / 10 ** AEGIS_DECIMALS).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
};

export const parseTokenAmount = (amount: string): BN => {
  const value = parseFloat(amount);
  return new BN(Math.floor(value * 10 ** AEGIS_DECIMALS));
};

// Shorten pubkey for display: ABC...XYZ
export const shortenPubkey = (pubkey: PublicKey | string): string => {
  const key = typeof pubkey === "string" ? pubkey : pubkey.toBase58();
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};
