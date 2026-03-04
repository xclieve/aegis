import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';

// Program IDs - update these after devnet deployment
export const STAKING_PROGRAM_ID = new PublicKey('StakeProgram11111111111111111111111111111111');
export const FEE_DISTRIBUTOR_PROGRAM_ID = new PublicKey('FeeDist11111111111111111111111111111111111111');
export const AEGIS_MINT = new PublicKey('81uLJNUkmSw64MJjdUX2TWY9RHcbBDNWCc2V14dkmQHW');

// PDA derivation helpers
export const findStakingPoolPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), mint.toBuffer()],
    STAKING_PROGRAM_ID
  );
};

export const findStakeAccountPDA = (pool: PublicKey, user: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('stake_account'), pool.toBuffer(), user.toBuffer()],
    STAKING_PROGRAM_ID
  );
};

export const findDistributorPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('distributor'), mint.toBuffer()],
    FEE_DISTRIBUTOR_PROGRAM_ID
  );
};

// Provider factory
export const getProvider = (
  connection: Connection,
  wallet: AnchorWallet,
  opts?: { commitment?: Commitment }
): AnchorProvider => {
  const commitment = opts?.commitment || 'confirmed';
  return new AnchorProvider(connection, wallet, { commitment });
};

// Placeholder IDL types - these will be generated after anchor build
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

// Helper to format token amounts (9 decimals)
export const formatTokenAmount = (amount: BN | number): string => {
  const value = typeof amount === 'number' ? amount : amount.toNumber();
  return (value / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export const parseTokenAmount = (amount: string): BN => {
  const value = parseFloat(amount);
  return new BN(Math.floor(value * 1e9));
};
