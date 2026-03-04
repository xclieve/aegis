# AEGIS Deployment Guide

This guide covers deploying the AEGIS token and programs to Solana devnet and mainnet.

---

## Prerequisites

- Solana CLI installed and configured
- Anchor CLI installed (v0.31+)
- Wallet with sufficient SOL for deployment (~3 SOL devnet, ~5 SOL mainnet)
- Built programs (`anchor build` completed)

---

## Configuration

### 1. Set Network

```bash
# For devnet
solana config set --url devnet

# For mainnet
solana config set --url mainnet-beta
```

### 2. Configure Wallet

```bash
# Check current wallet
solana config get

# Set wallet path
solana config set --keypair /path/to/your/wallet.json

# Check balance
solana balance
```

### 3. Get Devnet SOL (if needed)

```bash
# CLI airdrop (may be rate-limited)
solana airdrop 2

# Or use web faucet
# https://faucet.solana.com
```

---

## Deployment Steps

### Step 1: Update Anchor.toml

```toml
[programs.devnet]
aegis = "YOUR_AEGIS_PROGRAM_ID"
fee_distributor = "YOUR_FEE_DISTRIBUTOR_ID"
staking = "YOUR_STAKING_ID"

[provider]
cluster = "devnet"
wallet = "/path/to/wallet.json"
```

### Step 2: Build Programs

```bash
anchor build
```

### Step 3: Get Program IDs

After building, Anchor generates keypairs in `target/deploy/`:

```bash
# Get the program IDs
solana address -k target/deploy/aegis-keypair.json
solana address -k target/deploy/fee_distributor-keypair.json
solana address -k target/deploy/staking-keypair.json
```

Update these IDs in:
- `Anchor.toml`
- `programs/*/src/lib.rs` (declare_id! macro)

Then rebuild:

```bash
anchor build
```

### Step 4: Deploy Programs

```bash
# Deploy all programs
anchor deploy --provider.cluster devnet

# Or deploy individually
anchor deploy --program-name aegis --provider.cluster devnet
anchor deploy --program-name fee_distributor --provider.cluster devnet
anchor deploy --program-name staking --provider.cluster devnet
```

### Step 5: Verify Deployment

```bash
# Check program accounts exist
solana program show <PROGRAM_ID>
```

---

## Token Creation (if not done)

### Create Token Mint

```bash
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --transfer-fee 200 10000 \
  --decimals 9 \
  --fee-authority <FEE_DISTRIBUTOR_PROGRAM_ID>
```

### Create Associated Token Account

```bash
spl-token create-account <MINT_ADDRESS> \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```

### Mint Initial Supply

```bash
spl-token mint <MINT_ADDRESS> <AMOUNT> \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```

---

## Program Initialization

After deployment, initialize the programs:

### Initialize Fee Distributor

```typescript
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';

const tx = await program.methods
  .initialize(
    new BN(2500),  // burn_rate: 25% (basis points)
    new BN(5000),  // staker_rate: 50%
    new BN(2500)   // bounty_rate: 25%
  )
  .accounts({
    config: configPda,
    tokenMint: AEGIS_MINT,
    rewardsVault: rewardsVaultPda,
    bountyVault: bountyVaultPda,
    authority: wallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  })
  .rpc();
```

### Initialize Staking Pool

```typescript
const tx = await stakingProgram.methods
  .initializePool()
  .accounts({
    pool: poolPda,
    tokenMint: AEGIS_MINT,
    stakingVault: stakingVaultPda,
    rewardsVault: rewardsVaultPda,
    authority: wallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  })
  .rpc();
```

---

## Frontend Configuration

Update `app/.env.local` with deployed addresses:

```env
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_AEGIS_MINT=81uLJNUkmSw64MJjdUX2TWY9RHcbBDNWCc2V14dkmQHW
NEXT_PUBLIC_FEE_DISTRIBUTOR_ID=7mLJQemwoCQztdtRXshEY7poKNKJN98m39foqvK3DnCg
NEXT_PUBLIC_STAKING_ID=Dcrq8mcCkPVSRBc41hx9ZyDmbzbz2uT5rMLuaQrnqCE5
```

---

## Verification

### Check Token Metadata

```bash
spl-token display <MINT_ADDRESS> \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```

### Test Fee Collection

1. Transfer tokens between accounts
2. Verify fee withheld on destination
3. Call `harvest_fees` to collect
4. Verify fees in distribution account

### Test Staking Flow

1. Stake tokens via frontend or CLI
2. Wait for fee distribution
3. Claim rewards
4. Unstake tokens

---

## Mainnet Deployment Checklist

Before mainnet deployment:

- [ ] All devnet tests passing
- [ ] Security audit completed (or acknowledged as unaudited)
- [ ] Multisig configured for admin functions
- [ ] Emergency pause mechanism tested
- [ ] Initial token distribution planned
- [ ] Frontend tested thoroughly
- [ ] Documentation complete
- [ ] Wallet funded with ~5 SOL for deployment

---

## Troubleshooting

### "Insufficient funds"
Get more SOL via faucet or transfer from another wallet.

### "Program failed to complete"
Check program logs: `solana logs <PROGRAM_ID>`

### "Account already exists"
PDAs are already initialized. Skip initialization or use different seeds.

### "Custom program error"
Decode error from program's error enum. Check Anchor error codes.

---

## Current Deployment (Devnet)

| Component | Address |
|-----------|---------|
| Token Mint | `81uLJNUkmSw64MJjdUX2TWY9RHcbBDNWCc2V14dkmQHW` |
| AEGIS Program | `E9eCCUEZ5g41ddKGN9Coju43QzKJuEG4FEm32j1sTwNG` |
| Fee Distributor | `7mLJQemwoCQztdtRXshEY7poKNKJN98m39foqvK3DnCg` |
| Staking | `Dcrq8mcCkPVSRBc41hx9ZyDmbzbz2uT5rMLuaQrnqCE5` |
| Fee Authority | `Am4TsCvVZTRAXjgzoLEE5YtbVtdy4qkGv69Xm8rBande` |

---

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/docs)
- [Solana Cookbook](https://solanacookbook.com)
- [Token-2022 Guide](https://spl.solana.com/token-2022)
- [Solana CLI Reference](https://docs.solana.com/cli)
