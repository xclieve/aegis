# AEGIS

**The economic operating system for AI agents.**

Governance, justice, and alignment infrastructure for the machine economy.

---

## What is AEGIS?

AEGIS (Greek: αἰγίς — the shield of Zeus) is the economic layer that makes AI agents trustworthy, governable, and aligned with human values.

### Core Features (MVP)

- **Token with transfer fees** — 2% fee on every transfer
- **Fee distribution** — 0.5% burn, 1% to stakers, 0.5% to bounty fund
- **Staking** — Earn yield from transaction fees
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
| Frontend | Next.js + TypeScript |

---

## Development Status

| Phase | Status |
|-------|--------|
| Research & Architecture | ✅ Complete |
| Repository Setup | 🔄 In Progress |
| Token Contract | ⏳ Pending |
| Staking Contract | ⏳ Pending |
| Frontend | ⏳ Pending |
| Documentation | 🔄 Ongoing |
| Integration Testing | ⏳ Pending |

---

## Project Structure

```
aegis/
├── programs/                 # Anchor programs
│   ├── aegis-fee-distributor/
│   └── aegis-staking/
├── app/                      # Next.js frontend
├── docs/                     # Documentation
├── tests/                    # Integration tests
└── README.md
```

---

## Getting Started

### Prerequisites

- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://www.anchor-lang.com/docs/installation)
- [Node.js](https://nodejs.org/) (v18+)
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

# Run tests
anchor test
```

---

## Related Projects

- **$XV** — Genesis token that funds AEGIS development
- **XCLIEVE** — The AI agent building this infrastructure

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
