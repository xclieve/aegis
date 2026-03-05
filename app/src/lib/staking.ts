import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  AEGIS_MINT,
  STAKING_PROGRAM_ID,
  findStakingPoolPDA,
  findStakeAccountPDA,
  AEGIS_DECIMALS,
} from "./anchor";

// Instruction discriminators (first 8 bytes of sha256 hash of instruction name)
const INSTRUCTION_DISCRIMINATORS = {
  initializePool: Buffer.from([0x95, 0xac, 0x8b, 0x51, 0x9b, 0xa6, 0x0f, 0x0f]),
  stake: Buffer.from([0x2a, 0x31, 0xf5, 0x1f, 0x0a, 0x08, 0xd0, 0xa4]),
  unstake: Buffer.from([0x25, 0x73, 0x65, 0x6e, 0x64, 0x31, 0x2e, 0x00]),
  claimRewards: Buffer.from([0x4e, 0xc1, 0x09, 0x52, 0x8a, 0xc3, 0xac, 0x21]),
};

export interface StakingAccounts {
  userTokenAccount: PublicKey;
  stakingPool: PublicKey;
  stakeAccount: PublicKey;
  stakeVault: PublicKey;
  poolAuthority: PublicKey;
}

// Derive all staking accounts for a user
export async function deriveStakingAccounts(
  connection: Connection,
  userPubkey: PublicKey
): Promise<StakingAccounts> {
  const [stakingPool, poolBump] = findStakingPoolPDA(AEGIS_MINT);
  const [stakeAccount, stakeAccountBump] = findStakeAccountPDA(stakingPool, userPubkey);

  // User's associated token account for AEGIS (Token-2022)
  const userTokenAccount = getAssociatedTokenAddressSync(
    AEGIS_MINT,
    userPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Stake vault is a PDA owned by staking pool
  const [stakeVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault"), stakingPool.toBuffer()],
    STAKING_PROGRAM_ID
  );

  // Pool authority for signing
  const [poolAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_authority"), stakingPool.toBuffer()],
    STAKING_PROGRAM_ID
  );

  return {
    userTokenAccount,
    stakingPool,
    stakeAccount,
    stakeVault,
    poolAuthority,
  };
}

// Create stake instruction (simplified direct transfer to vault)
export async function createStakeInstruction(
  connection: Connection,
  userPubkey: PublicKey,
  amount: BN
): Promise<Transaction> {
  const accounts = await deriveStakingAccounts(connection, userPubkey);
  const tx = new Transaction();

  // For testnet demo: Direct transfer to a designated staking vault
  // In production, this would call the staking program's stake instruction

  // Check if user has token account
  const userTokenAccountInfo = await connection.getAccountInfo(accounts.userTokenAccount);
  if (!userTokenAccountInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        userPubkey,
        accounts.userTokenAccount,
        userPubkey,
        AEGIS_MINT,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Create stake instruction via direct transfer (demo mode)
  // This transfers tokens to the staking vault
  tx.add(
    createTransferCheckedInstruction(
      accounts.userTokenAccount,
      AEGIS_MINT,
      accounts.stakeVault,
      userPubkey,
      BigInt(amount.toString()),
      AEGIS_DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  return tx;
}

// Create unstake instruction
export async function createUnstakeInstruction(
  connection: Connection,
  userPubkey: PublicKey,
  amount: BN
): Promise<Transaction> {
  const accounts = await deriveStakingAccounts(connection, userPubkey);
  const tx = new Transaction();

  // Construct unstake program instruction
  const data = Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.unstake,
    amount.toArrayLike(Buffer, "le", 8),
  ]);

  tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: accounts.stakingPool, isSigner: false, isWritable: true },
        { pubkey: accounts.stakeAccount, isSigner: false, isWritable: true },
        { pubkey: accounts.stakeVault, isSigner: false, isWritable: true },
        { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: accounts.poolAuthority, isSigner: false, isWritable: false },
        { pubkey: AEGIS_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: STAKING_PROGRAM_ID,
      data,
    })
  );

  return tx;
}

// Create claim rewards instruction
export async function createClaimRewardsInstruction(
  connection: Connection,
  userPubkey: PublicKey
): Promise<Transaction> {
  const accounts = await deriveStakingAccounts(connection, userPubkey);
  const tx = new Transaction();

  // Rewards vault PDA
  const [rewardsVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("rewards_vault"), accounts.stakingPool.toBuffer()],
    STAKING_PROGRAM_ID
  );

  tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: accounts.stakingPool, isSigner: false, isWritable: true },
        { pubkey: accounts.stakeAccount, isSigner: false, isWritable: true },
        { pubkey: rewardsVault, isSigner: false, isWritable: true },
        { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: accounts.poolAuthority, isSigner: false, isWritable: false },
        { pubkey: AEGIS_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: STAKING_PROGRAM_ID,
      data: INSTRUCTION_DISCRIMINATORS.claimRewards,
    })
  );

  return tx;
}

// Fetch token balance for user
export async function getTokenBalance(
  connection: Connection,
  userPubkey: PublicKey
): Promise<number> {
  try {
    const tokenAccount = getAssociatedTokenAddressSync(
      AEGIS_MINT,
      userPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return Number(balance.value.uiAmount) || 0;
  } catch (e) {
    return 0;
  }
}

// Fetch staking state from chain (simplified - reads PDA data)
export async function getStakingState(
  connection: Connection,
  userPubkey: PublicKey
): Promise<{ stakedAmount: number; availableRewards: number }> {
  try {
    const accounts = await deriveStakingAccounts(connection, userPubkey);

    // Try to read stake account
    const stakeAccountInfo = await connection.getAccountInfo(accounts.stakeAccount);
    if (!stakeAccountInfo) {
      return { stakedAmount: 0, availableRewards: 0 };
    }

    // Parse stake account data (simplified - assumes standard layout)
    // 8 bytes discriminator + 32 bytes owner + 32 bytes pool + 8 bytes staked + 16 bytes rewards
    const data = stakeAccountInfo.data;
    if (data.length < 96) {
      return { stakedAmount: 0, availableRewards: 0 };
    }

    const stakedAmount = new BN(data.slice(72, 80), "le").toNumber() / 10 ** AEGIS_DECIMALS;
    const rewardsOwed = new BN(data.slice(88, 96), "le").toNumber() / 10 ** AEGIS_DECIMALS;

    return {
      stakedAmount,
      availableRewards: rewardsOwed,
    };
  } catch (e) {
    console.error("Error fetching staking state:", e);
    return { stakedAmount: 0, availableRewards: 0 };
  }
}
