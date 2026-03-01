#!/bin/bash
set -e

echo "🔧 Setting up Solana development environment..."

# Install Solana CLI
echo "📦 Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Add to bashrc for future sessions
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

# Verify Solana installation
solana --version

# Configure for devnet
solana config set --url devnet
solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json --force

# Install Anchor CLI
echo "⚓ Installing Anchor CLI..."
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.0 anchor-cli

# Verify Anchor installation
anchor --version

# Install Node dependencies if package.json exists
if [ -f "package.json" ]; then
  echo "📦 Installing Node dependencies..."
  npm install
fi

echo "✅ Setup complete!"
echo "   Solana: $(solana --version)"
echo "   Anchor: $(anchor --version)"
echo ""
echo "🚀 Ready for development!"
