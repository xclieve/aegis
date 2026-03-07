/**
 * Initialize AEGIS Staking Pool on Testnet
 * 
 * This script:
 * 1. Derives the staking pool PDA
 * 2. Creates stake_vault and rewards_vault token accounts (Token-2022)
 * 3. Calls the initialize instruction on the staking program
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeAccount3Instruction,
  getAccountLenForMint,
  getMint,
  ExtensionType,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Testnet configuration
const RPC_URL = "https://api.testnet.solana.com";
const STAKING_PROGRAM_ID = new PublicKey("AgAQSxNVkSCFzmtkk5iZ5Wn16Sfj1sY4XqX5nnRxZqad");
const AEGIS_MINT = new PublicKey("BUdnYqg7ReN3YPMysGGz6i6qLYftj5YAKnnJMsRNB9do");

// Initialize instruction discriminator (Anchor)
// Generated from sha256("global:initialize")[:8]
const INITIALIZE_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

async function main() {
  console.log("🔧 AEGIS Staking Pool Initialization");
  console.log("=====================================\n");

  // Load wallet
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const walletData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  console.log("Wallet:", wallet.publicKey.toBase58());

  // Connect to testnet
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Get mint info to calculate account size with extensions
  console.log("Fetching mint info...");
  const mintInfo = await getMint(
    connection,
    AEGIS_MINT,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );
  console.log("Mint decimals:", mintInfo.decimals);
  console.log("Mint supply:", mintInfo.supply.toString());

  // Calculate account length for this mint (includes extension space)
  const accountLen = getAccountLenForMint(mintInfo);
  console.log("Token account size (with extensions):", accountLen, "bytes");

  // Derive staking pool PDA
  const [stakingPool, poolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool"), AEGIS_MINT.toBuffer()],
    STAKING_PROGRAM_ID
  );
  console.log("\nStaking Pool PDA:", stakingPool.toBase58());
  console.log("Pool Bump:", poolBump);

  // Check if pool already exists
  const poolInfo = await connection.getAccountInfo(stakingPool);
  if (poolInfo) {
    console.log("\n✅ Pool already initialized!");
    console.log("Owner:", poolInfo.owner.toBase58());
    console.log("Data length:", poolInfo.data.length, "bytes");
    return;
  }
  console.log("Pool does not exist yet - initializing...\n");

  // Create stake_vault and rewards_vault keypairs
  const stakeVault = Keypair.generate();
  const rewardsVault = Keypair.generate();
  console.log("Stake Vault:", stakeVault.publicKey.toBase58());
  console.log("Rewards Vault:", rewardsVault.publicKey.toBase58());

  // Get rent exemption for token account with extensions
  const rentExemption = await connection.getMinimumBalanceForRentExemption(accountLen);
  console.log("\nRent exemption per account:", rentExemption / 1e9, "SOL");
  console.log("Total rent needed:", (rentExemption * 2) / 1e9, "SOL");

  // Build transaction
  const tx = new Transaction();

  // 1. Create stake_vault account with correct size for extensions
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: stakeVault.publicKey,
      lamports: rentExemption,
      space: accountLen,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Initialize stake_vault as token account with pool PDA as authority
  // Using InitializeAccount3 for Token-2022
  tx.add(
    createInitializeAccount3Instruction(
      stakeVault.publicKey,  // account
      AEGIS_MINT,            // mint
      stakingPool,           // owner (pool PDA)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. Create rewards_vault account with correct size for extensions
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: rewardsVault.publicKey,
      lamports: rentExemption,
      space: accountLen,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 4. Initialize rewards_vault as token account with pool PDA as authority
  tx.add(
    createInitializeAccount3Instruction(
      rewardsVault.publicKey,  // account
      AEGIS_MINT,              // mint
      stakingPool,             // owner (pool PDA)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 5. Create initialize instruction for staking program
  // Encode bump as u8
  const bumpBuffer = Buffer.alloc(1);
  bumpBuffer.writeUInt8(poolBump);

  const initData = Buffer.concat([
    INITIALIZE_DISCRIMINATOR,
    bumpBuffer,
  ]);

  const initKeys = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },        // authority
    { pubkey: AEGIS_MINT, isSigner: false, isWritable: false },            // mint
    { pubkey: stakingPool, isSigner: false, isWritable: true },            // pool (PDA, will be created)
    { pubkey: stakeVault.publicKey, isSigner: false, isWritable: false },  // stake_vault
    { pubkey: rewardsVault.publicKey, isSigner: false, isWritable: false },// rewards_vault
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },// system_program
  ];

  tx.add(
    new TransactionInstruction({
      keys: initKeys,
      programId: STAKING_PROGRAM_ID,
      data: initData,
    })
  );

  console.log("\n📤 Sending transaction...");
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet, stakeVault, rewardsVault],
      { commitment: "confirmed" }
    );
    
    console.log("\n✅ SUCCESS!");
    console.log("Signature:", sig);
    console.log("Explorer: https://explorer.solana.com/tx/" + sig + "?cluster=testnet");
    
    console.log("\n📋 Summary:");
    console.log("  Staking Pool:", stakingPool.toBase58());
    console.log("  Stake Vault:", stakeVault.publicKey.toBase58());
    console.log("  Rewards Vault:", rewardsVault.publicKey.toBase58());
    console.log("  Pool Bump:", poolBump);
    
  } catch (err: any) {
    console.error("\n❌ Transaction failed:");
    console.error(err.message);
    if (err.logs) {
      console.error("\nProgram logs:");
      err.logs.forEach((log: string) => console.error("  ", log));
    }
    process.exit(1);
  }
}

main().catch(console.error);
