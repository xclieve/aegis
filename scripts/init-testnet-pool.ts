/**
 * Initialize Staking Pool on Testnet
 * 
 * Run from codespace:
 * cd /workspaces/aegis
 * export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
 * npx ts-node scripts/init-testnet-pool.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration
// ============================================================================

const NETWORK = "testnet";
const RPC_URL = "https://api.testnet.solana.com";

// Deployed program IDs
const STAKING_PROGRAM_ID = new PublicKey("AgAQSxNVkSCFzmtkk5iZ5Wn16Sfj1sY4XqX5nnRxZqad");
const AEGIS_MINT = new PublicKey("BUdnYqg7ReN3YPMysGGz6i6qLYftj5YAKnnJMsRNB9do");

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("AEGIS Staking Pool Initialization");
  console.log(`Network: ${NETWORK}`);
  console.log("=".repeat(60));

  // Load wallet from default Solana config
  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    console.error("Wallet not found at", walletPath);
    console.log("Run: solana config set --url testnet");
    console.log("And ensure you have a wallet configured");
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log("Wallet:", wallet.publicKey.toBase58());

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");

  if (balance < 0.1 * 1e9) {
    console.error("Insufficient balance. Need at least 0.1 SOL for initialization.");
    console.log("Request airdrop: solana airdrop 1");
    process.exit(1);
  }

  // Derive pool PDA
  const [poolPDA, poolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool"), AEGIS_MINT.toBuffer()],
    STAKING_PROGRAM_ID
  );
  console.log("\nPool PDA:", poolPDA.toBase58());
  console.log("Pool Bump:", poolBump);

  // Check if pool already exists
  const poolAccount = await connection.getAccountInfo(poolPDA);
  if (poolAccount) {
    console.log("\n✅ Pool already initialized!");
    console.log("Data length:", poolAccount.data.length);
    console.log("Owner:", poolAccount.owner.toBase58());
    return;
  }

  console.log("\n⚠️  Pool not initialized. Creating...\n");

  // Create vault token accounts
  // For simplicity, we'll create associated token accounts with the pool PDA as owner
  // In production, you'd want dedicated PDAs

  const stakeVault = getAssociatedTokenAddressSync(
    AEGIS_MINT,
    poolPDA,
    true, // allowOwnerOffCurve = true for PDA owner
    TOKEN_2022_PROGRAM_ID
  );
  console.log("Stake Vault:", stakeVault.toBase58());

  const rewardsVault = PublicKey.findProgramAddressSync(
    [Buffer.from("rewards_vault"), poolPDA.toBuffer()],
    STAKING_PROGRAM_ID
  )[0];
  console.log("Rewards Vault PDA:", rewardsVault.toBase58());

  // Actually, looking at the program code, the vaults need to be token accounts
  // Let's create them as ATAs where the authority can be the pool PDA
  // But ATAs require the owner to be a signer... 
  
  // For this demo, we need to create the vaults separately first
  // Then call initialize with their addresses

  console.log("\n📝 To complete initialization:");
  console.log("1. Create stake_vault token account (authority = pool PDA)");
  console.log("2. Create rewards_vault token account (authority = pool PDA)");
  console.log("3. Call initialize instruction with these accounts");
  console.log("\nThis requires more complex setup. See /tests/aegis.ts for reference.");

  // For now, just log what would be needed
  console.log("\n📦 Initialize instruction data:");
  console.log("  - bump:", poolBump);
  console.log("  - accounts:");
  console.log("    - authority:", wallet.publicKey.toBase58());
  console.log("    - mint:", AEGIS_MINT.toBase58());
  console.log("    - pool:", poolPDA.toBase58());
  console.log("    - stake_vault: <needs creation>");
  console.log("    - rewards_vault: <needs creation>");
  console.log("    - system_program:", SystemProgram.programId.toBase58());
}

main().catch(console.error);
