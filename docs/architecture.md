# $AEGIS MVP Architecture

## Research Findings

### Token-2022 (Token Extensions)
Solana's Token-2022 program includes a **transfer_fee** extension that handles fee collection automatically. This significantly simplifies our architecture.

**Key Points:**
- Built-in transfer fee support (no custom token program needed)
- Fees collected automatically on every transfer
- Fee authority can withdraw collected fees
- Already audited by multiple firms (Halborn, Zellic, Trail of Bits, etc.)

---

## MVP Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         $AEGIS Token                                 │
│                    (SPL Token 2022 + transfer_fee)                   │
│                                                                      │
│  • 2% fee on every transfer                                          │
│  • Fees accumulate in fee collection account                         │
│  • Fee authority = Fee Distribution Program                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Fee Distribution Program                          │
│                      (Custom Anchor Program)                         │
│                                                                      │
│  • Withdraws collected fees from token                               │
│  • Distributes according to split:                                   │
│    ├── 25% burn (0.5% of 2%)                                         │
│    ├── 50% to stakers (1.0% of 2%)                                   │
│    └── 25% to bounty fund (0.5% of 2%)                               │
│  • Can be called by anyone (permissionless distribution)             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Staking Program                                │
│                      (Custom Anchor Program)                         │
│                                                                      │
│  • Users stake $AEGIS                                                │
│  • Receive pro-rata share of staker fee pool                         │
│  • Track staking positions                                           │
│  • Handle unstaking (with or without lockup)                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend                                     │
│                        (Next.js App)                                 │
│                                                                      │
│  • Wallet connection (Phantom, Solflare, etc.)                       │
│  • Staking interface                                                 │
│  • Dashboard (balances, rewards, stats)                              │
│  • Transaction history                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Details

### 1. Token Configuration (No custom code needed)

Using `spl-token-2022` CLI or SDK:
```bash
# Create mint with transfer fee extension
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --transfer-fee 200 10000 \  # 2% fee (200 basis points)
  --transfer-fee-authority <fee_distribution_program>
```

### 2. Fee Distribution Program

```rust
// programs/aegis-fee-distributor/src/lib.rs

pub mod instructions {
    pub fn distribute(ctx: Context<Distribute>) -> Result<()> {
        // 1. Withdraw fees from token's fee account
        // 2. Calculate splits (25% burn, 50% stakers, 25% bounty)
        // 3. Burn portion (transfer to dead address)
        // 4. Transfer to staking pool
        // 5. Transfer to bounty fund
    }
}
```

### 3. Staking Program

```rust
// programs/aegis-staking/src/lib.rs

pub mod instructions {
    pub fn initialize(ctx: Context<Initialize>) -> Result<()>;
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()>;
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()>;
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()>;
}

pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub rewards_claimed: u64,
    pub stake_timestamp: i64,
}
```

---

## Account Structure

```
AEGIS Token Mint
├── transfer_fee_config
│   ├── transfer_fee_config_authority
│   ├── withdraw_withheld_authority
│   ├── older_transfer_fee (200 basis points)
│   └── newer_transfer_fee (200 basis points)
└── withheld_amount (collected fees)

Staking Pool
├── total_staked
├── rewards_per_token
└── last_distribution_time

User Stake Accounts
├── owner
├── staked_amount
├── rewards_debt
└── stake_time
```

---

## MVP Scope Boundaries

### ✅ In MVP
- Token with 2% transfer fee
- Fee distribution (burn/stake/bounty split)
- Basic staking (stake/unstake/claim)
- Simple frontend
- Devnet deployment

### ❌ NOT in MVP (Phase 2)
- Justice system / juries
- Human tribunals
- Bounty claiming mechanism
- Governance voting
- Mobile app
- Mainnet deployment

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Chain | Solana | High throughput, low fees |
| Token | SPL Token 2022 | Native transfer fee support |
| Contracts | Anchor (Rust) | Standard Solana framework |
| Frontend | Next.js 14 | Modern React, good DX |
| Wallet | @solana/wallet-adapter | Standard wallet connection |
| State | React Query | Data fetching/caching |
| Styling | Tailwind CSS | Fast development |

---

## Development Phases

### Phase A: Token Setup (2-3 hours)
- Create token mint with transfer_fee extension on devnet
- Configure fee parameters
- Test transfers and fee collection

### Phase B: Fee Distributor (4-6 hours)
- Anchor project setup
- Implement distribute instruction
- Test fee withdrawal and splitting

### Phase C: Staking (6-8 hours)
- Implement stake/unstake/claim
- Integrate with fee distributor
- Test full flow

### Phase D: Frontend (6-8 hours)
- Next.js setup
- Wallet connection
- Staking UI
- Dashboard

### Phase E: Integration (4-6 hours)
- End-to-end testing
- Bug fixes
- Documentation

**Total: ~25-35 hours** (less than original 46 estimate due to Token-2022 simplification)

---

## Security Considerations

### MVP Security (Good Enough)
- Use audited SPL Token 2022
- Standard Anchor patterns
- No upgradeable contracts in MVP
- Small devnet test amounts

### Production Security (Phase 2)
- Full audit of custom contracts
- Bug bounty program
- Multisig for authorities
- Rate limiting
- Emergency pause
