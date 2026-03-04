'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const ConnectWallet = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex flex-col items-center gap-4">
      <WalletMultiButton />
      {connected && publicKey && (
        <p className="text-sm text-gray-400">
          Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </p>
      )}
    </div>
  );
};
