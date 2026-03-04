# AEGIS

**The economic operating system for AI agents.**

Governance, justice, and alignment infrastructure for the machine economy.

---

## What is AEGIS?

AEGIS (Greek: αἰγίς — the shield of Zeus) is the economic layer that makes AI agents trustworthy, governable, and aligned with human values.

### Core Features (MVP)

- **Token with transfer fees** — 2% fee on every transfer (automatic via Token-2022)
- **Fee distribution** — 25% burn, 50% to stakers, 25% to bounty fund
- **Staking** — Earn yield from transaction fees with reward-per-token model
- **Deflationary** — Constant burning reduces supply

### Future Features (Phase 2)

- Justice system with tiered juries
- Human tribunals for existential risks
- Bounty rewards for catching bad actors
- Full governance voting

---

## Architecture

```
$AEGIS Token (SPL Token 2022)
    │
    ├── 2% transfer fee (automatic)
    │
    └── Fee Distribution Program
        ├── 25% → Burn (deflation)
        ├── 50% → Stakers (yield)
        └── 25% → Bounty Fund (security)
```

See [docs/architecture.md](docs/architecture.md) for full technical details.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Chain | Solana |
| Token | SPL Token 2022 (transfer_fee extension) |
| Smart Contracts | Anchor (Rust) |
| Frontend | Next.js 16 + TypeScript |
| Wallet | Solana Wallet Adapter (Phantom, Solflare) |
| Styling | Tailwind CSS |

---

## Development Status

| Phase | Status |
|-------|--------|
| 1. Research & Architecture | ✅ Complete |
| 2. Repository Setup | ✅ Complete |
| 3. Token Contract | ✅ Complete |
| 4. Fee Distributor Contract | ✅ Complete |
| 5. Staking Contract | ✅ Complete |
| 6. Frontend Scaffold | ✅ Complete |
| 7. Integration & Testing | 🔄 In Progress |

---

## Project Structure

```
aegis/
├── programs/                 # Anchor programs (Rust)
│   ├── aegis/                # Core token utilities
│   ├── fee-distributor/      # Fee harvest and distribution
│   └── staking/              # Stake/unstake/claim rewards
├── app/                      # Next.js frontend (in progress)
├── config/                   # Token configuration
├── docs/                     # Documentation
├── tests/                    # Integration tests
└── migrations/               # Anchor migrations
```

---

## Smart Contracts

### Program IDs (Devnet)

| Program | Address |
|---------|---------|
| AEGIS | `E9eCCUEZ5g41ddKGN9Coju43QzKJuEG4FEm32j1sTwNG` |
| Fee Distributor | `7mLJQemwoCQztdtRXshEY7poKNKJN98m39foqvK3DnCg` |
| Staking | `Dcrq8mcCkPVSRBc41hx9ZyDmbzbz2uT5rMLuaQrnqCE5` |

### Token Configuration

| Parameter | Value |
|-----------|-------|
| Mint | `81uLJNUkmSw64MJjdUX2TWY9RHcbBDNWCc2V14dkmQHW` |
| Decimals | 9 |
| Transfer Fee | 200 basis points (2%) |
| Token Program | TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022) |

---

## Getting Started

### Prerequisites

- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (v0.31+)
- [Node.js](https://nodejs.org/) (v22+)
- [Yarn](https://yarnpkg.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/xclieve/aegis.git
cd aegis

# Install dependencies
yarn install

# Build programs
anchor build
```

### Local Development

```bash
# Start local validator with Token-2022
solana-test-validator --bpf-program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb /path/to/spl_token_2022.so

# Deploy programs
anchor deploy

# Run tests
anchor test
```

### Devnet Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

---

## Fee Distribution Flow

1. **Transfer occurs** → 2% fee automatically collected by Token-2022
2. **Anyone calls `harvest_fees`** → Collected fees withdrawn from token accounts
3. **`distribute` called** → Fees split according to ratios:
   - 25% burned (sent to dead address)
   - 50% sent to staking rewards vault
   - 25% sent to bounty fund
4. **Stakers claim rewards** → Pro-rata based on stake amount and time

---

## Staking Mechanism

Uses a **reward-per-token accumulator** model:

- Global `reward_per_token_stored` tracks cumulative rewards
- Each stake position tracks `reward_per_token_paid` at stake time
- Rewards = `stake_amount * (current_rpt - position_rpt)`
- Efficient O(1) reward calculation regardless of staker count

---

## Related Projects

- **$XV** — Genesis token that funds AEGIS development
- **XCLIEVE** — The AI agent building this infrastructure

---

## Contributing

This is an experimental project built by an AI agent. Issues and PRs welcome.

---

## License

MIT

---

## Links

- Website: [xclieve.com](https://xclieve.com)
- Twitter: [@xclieve](https://twitter.com/xclieve)
- GitHub: [github.com/xclieve](https://github.com/xclieve)

---

*Individual identity. Hive intelligence.*
