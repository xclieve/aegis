/**
 * Initialize Staking Pool on Testnet
 * 
 * Run from codespace:
 * cd /workspaces/aegis
 * export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
 * npx ts-node scripts/init-testnet-pool.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Connection, 
  Keypair, 
  SystemProgram, 
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const NETWORK = "testnet";
const RPC_URL = "https://api.testnet.solana.com";

// Deployed program IDs
const STAKING_PROGRAM_ID = new PublicKey("AgAQSxNVkSCFzmtkk5iZ5Wn16Sfj1sY4XqX5nnRxZqad");
const AEGIS_MINT = new PublicKey("BUdnYqg7ReN3YPMysGGz6i6qLYftj5YAKnnJMsRNB9do");

// ============================================================================
// IDL (minimal, just what we need for initialize)
// ============================================================================

const STAKING_IDL = {
  version: "0.1.0",
  name: "staking",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "mint", isMut: false, isSigner: false },
        { name: "pool", isMut: true, isSigner: false },
        { name: "stakeVault", isMut: false, isSigner: false },
        { name: "rewardsVault", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "bump", type: "u8" }],
    },
  ],
  accounts: [],
  errors: [],
};

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
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance. Need at least 0.05 SOL for initialization.");
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

  // Derive vault addresses (ATAs owned by pool PDA)
  const stakeVault = getAssociatedTokenAddressSync(
    AEGIS_MINT,
    poolPDA,
    true, // allowOwnerOffCurve = true for PDA owner
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Stake Vault (ATA):", stakeVault.toBase58());

  const rewardsVault = getAssociatedTokenAddressSync(
    AEGIS_MINT,
    poolPDA,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Since both ATAs would be the same address (same owner + mint), we need a different approach
  // Create a second vault using a different seed
  // Actually, let's create a separate keypair for rewards vault
  // OR we can derive a PDA specifically for rewards
  
  // For simplicity: use a separate PDA-derived ATA by using a wrapper account
  // Better approach: create non-ATA token accounts
  
  // Let's use separate token accounts (not ATAs)
  // We'll create them with the pool PDA as the owner/authority
  
  console.log("\n📦 Creating vault accounts...");
  
  // For testing, we can use the same ATA for both (they're just holding pools)
  // But the program expects 2 different accounts. Let's create a second one via
  // a different approach: use program-derived addresses
  
  // Actually the simplest approach: create 2 ATAs using different derivations
  // Since standard ATA uses mint+owner, both vaults would be same address
  // We need to use createAccount for at least one of them
  
  // Alternative: Use the pool authority (our wallet) as intermediate for rewards
  // But that breaks the security model
  
  // CORRECT APPROACH: Create token accounts with unique seeds
  // The pool PDA signs as authority via CPI in the program
  
  // For now, let's derive custom vault PDAs
  const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault"), poolPDA.toBuffer()],
    STAKING_PROGRAM_ID
  );
  
  const [rewardsVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("rewards_vault"), poolPDA.toBuffer()],
    STAKING_PROGRAM_ID
  );
  
  console.log("Stake Vault PDA:", stakeVaultPDA.toBase58());
  console.log("Rewards Vault PDA:", rewardsVaultPDA.toBase58());
  
  // WAIT - Looking at the program, it just checks that vaults are token accounts
  // with matching mint. It doesn't derive them as PDAs.
  // The vaults need to be created BEFORE calling initialize.
  
  // Simplest approach: Create 2 separate token accounts (not ATAs)
  // using createAccount + initializeAccount
  
  // Even simpler: Use two ATAs but with different mints... no that doesn't work
  
  // ACTUAL simplest: Create keypair-based token accounts
  // But then we need to store the keypairs...
  
  // Let me re-read the program constraints...
  // The program just checks:
  // - stake_vault.mint == mint.key()
  // - rewards_vault.mint == mint.key()
  // - Both are Token2022 accounts
  
  // The pool PDA becomes the authority for transfers OUT via signed CPI
  // But the vaults themselves just need to exist with correct mint
  
  // SOLUTION: Create 2 token accounts with pool PDA as the owner
  // Use createAssociatedTokenAccountIdempotent for stake_vault (the standard one)
  // For rewards_vault, we need a DIFFERENT token account
  
  // Two options:
  // A) Create a regular (non-ATA) token account with pool as owner
  // B) Create an ATA with a different owner (e.g., a derived PDA)
  
  // Going with A: Create both as new accounts with pool PDA as authority
  
  // Actually, since we need the pool PDA to own these and sign for them,
  // let's use the ATA approach: one for stake, and we'll need to initialize
  // a second token account manually for rewards
  
  // For MVP: Just use the same ATA for both stake and rewards
  // This simplifies things - tokens go in, tokens come out
  // The logic is the same, we just track totals in the pool state
  
  // NO WAIT - re-reading the code:
  // stake() transfers TO stake_vault
  // unstake() transfers FROM stake_vault
  // claim_rewards() transfers FROM rewards_vault
  // Fee distributor sends TO rewards_vault
  //
  // They MUST be separate accounts!
  
  // OK, final approach: Create stake_vault as ATA, create rewards_vault as new account
  
  const { createAccount, getMinimumBalanceForRentExemptAccount } = await import("@solana/spl-token");
  
  // Step 1: Create stake_vault as ATA
  console.log("\n1️⃣ Creating stake_vault (ATA)...");
  
  const tx1 = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,      // payer
      stakeVault,            // associatedToken
      poolPDA,               // owner (pool PDA)
      AEGIS_MINT,            // mint
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
  
  try {
    const sig1 = await sendAndConfirmTransaction(connection, tx1, [wallet], {
      commitment: "confirmed",
    });
    console.log("✅ Stake vault created:", sig1);
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("✅ Stake vault already exists");
    } else {
      throw e;
    }
  }
  
  // Step 2: Create rewards_vault as a new keypair-based account
  console.log("\n2️⃣ Creating rewards_vault (new account)...");
  
  // Generate a deterministic keypair for rewards vault based on pool PDA
  // This way we can recreate it if needed
  // Actually, for simplicity, let's just create a second ATA but pretend 
  // it's for a wrapped version... no that's hacky
  
  // REAL SOLUTION: The rewards vault should also be a PDA-owned ATA
  // But we need a DIFFERENT ATA. Since ATA = f(owner, mint), same owner+mint = same ATA
  // 
  // We need to use a program-owned token account that ISN'T an ATA
  // 
  // Let's create a new Keypair for rewards vault
  // We'll save it to a file so we can reference it later
  
  const rewardsVaultKeypairPath = path.join(__dirname, "rewards-vault-keypair.json");
  let rewardsVaultKeypair: Keypair;
  
  if (fs.existsSync(rewardsVaultKeypairPath)) {
    const savedKey = JSON.parse(fs.readFileSync(rewardsVaultKeypairPath, "utf-8"));
    rewardsVaultKeypair = Keypair.fromSecretKey(Uint8Array.from(savedKey));
    console.log("Loaded existing rewards vault keypair");
  } else {
    rewardsVaultKeypair = Keypair.generate();
    fs.writeFileSync(rewardsVaultKeypairPath, JSON.stringify(Array.from(rewardsVaultKeypair.secretKey)));
    console.log("Generated new rewards vault keypair");
  }
  
  const actualRewardsVault = rewardsVaultKeypair.publicKey;
  console.log("Rewards Vault:", actualRewardsVault.toBase58());
  
  // Check if it exists
  const rvAccount = await connection.getAccountInfo(actualRewardsVault);
  if (!rvAccount) {
    const { 
      createInitializeAccountInstruction, 
      getAccountLenForMint,
      getMint 
    } = await import("@solana/spl-token");
    
    // Get mint info to determine account size
    const mintInfo = await getMint(connection, AEGIS_MINT, "confirmed", TOKEN_2022_PROGRAM_ID);
    const accountLen = getAccountLenForMint(mintInfo);
    const lamports = await connection.getMinimumBalanceForRentExemption(accountLen);
    
    const tx2 = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: actualRewardsVault,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeAccountInstruction(
        actualRewardsVault,
        AEGIS_MINT,
        poolPDA,  // owner is the pool PDA
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    const sig2 = await sendAndConfirmTransaction(connection, tx2, [wallet, rewardsVaultKeypair], {
      commitment: "confirmed",
    });
    console.log("✅ Rewards vault created:", sig2);
  } else {
    console.log("✅ Rewards vault already exists");
  }
  
  // Step 3: Call initialize on the staking program
  console.log("\n3️⃣ Initializing staking pool...");
  
  // Set up Anchor provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  
  // Create program interface
  const program = new anchor.Program(STAKING_IDL as any, STAKING_PROGRAM_ID, provider);
  
  try {
    const sig3 = await program.methods
      .initialize(poolBump)
      .accounts({
        authority: wallet.publicKey,
        mint: AEGIS_MINT,
        pool: poolPDA,
        stakeVault: stakeVault,
        rewardsVault: actualRewardsVault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Staking pool initialized:", sig3);
  } catch (e: any) {
    console.error("❌ Initialize failed:", e.message);
    if (e.logs) {
      console.log("\nProgram logs:");
      e.logs.forEach((log: string) => console.log("  ", log));
    }
    throw e;
  }
  
  // Verify
  console.log("\n4️⃣ Verifying initialization...");
  const finalPoolAccount = await connection.getAccountInfo(poolPDA);
  if (finalPoolAccount) {
    console.log("✅ Pool account exists!");
    console.log("   Size:", finalPoolAccount.data.length, "bytes");
    console.log("   Owner:", finalPoolAccount.owner.toBase58());
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 STAKING POOL INITIALIZED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\nPool PDA:", poolPDA.toBase58());
  console.log("Stake Vault:", stakeVault.toBase58());
  console.log("Rewards Vault:", actualRewardsVault.toBase58());
  console.log("\nSave the rewards vault keypair!");
  console.log("Location:", rewardsVaultKeypairPath);
}

main().catch((e) => {
  console.error("\n❌ Error:", e);
  process.exit(1);
});
