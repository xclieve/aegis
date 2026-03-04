'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface StakingState {
  stakedAmount: number;
  availableRewards: number;
  tokenBalance: number;
}

export const StakingPanel = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [stakingState, setStakingState] = useState<StakingState>({
    stakedAmount: 0,
    availableRewards: 0,
    tokenBalance: 0,
  });

  // Placeholder: fetch staking state from chain
  const fetchStakingState = useCallback(async () => {
    if (!connected || !publicKey) return;
    
    // TODO: Implement actual on-chain fetch
    // For now, use mock data
    setStakingState({
      stakedAmount: 0,
      availableRewards: 0,
      tokenBalance: 0,
    });
  }, [connected, publicKey]);

  useEffect(() => {
    fetchStakingState();
  }, [fetchStakingState]);

  const handleStake = async () => {
    if (!connected || !publicKey || !stakeAmount) return;
    
    setLoading(true);
    try {
      // TODO: Call staking program stake instruction
      console.log('Staking', stakeAmount, 'AEGIS');
      alert('Staking not yet connected to program. Coming in Phase 7!');
    } catch (error) {
      console.error('Stake error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!connected || !publicKey || !unstakeAmount) return;
    
    setLoading(true);
    try {
      // TODO: Call staking program unstake instruction
      console.log('Unstaking', unstakeAmount, 'AEGIS');
      alert('Unstaking not yet connected to program. Coming in Phase 7!');
    } catch (error) {
      console.error('Unstake error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!connected || !publicKey) return;
    
    setLoading(true);
    try {
      // TODO: Call staking program claim_rewards instruction
      console.log('Claiming rewards');
      alert('Claim rewards not yet connected to program. Coming in Phase 7!');
    } catch (error) {
      console.error('Claim error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 mb-4">Connect your wallet to stake </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Stats Card */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Your Staking</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Staked</p>
            <p className="text-xl font-bold">{stakingState.stakedAmount.toLocaleString()} AEGIS</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Rewards</p>
            <p className="text-xl font-bold text-green-400">{stakingState.availableRewards.toLocaleString()} AEGIS</p>
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Wallet Balance</p>
          <p className="text-lg">{stakingState.tokenBalance.toLocaleString()} AEGIS</p>
        </div>
      </div>

      {/* Stake Card */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Stake</h3>
        <input
          type="number"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          placeholder="Amount to stake"
          className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={handleStake}
          disabled={loading || !stakeAmount}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded py-2 font-semibold transition"
        >
          {loading ? 'Processing...' : 'Stake AEGIS'}
        </button>
      </div>

      {/* Unstake Card */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Unstake</h3>
        <input
          type="number"
          value={unstakeAmount}
          onChange={(e) => setUnstakeAmount(e.target.value)}
          placeholder="Amount to unstake"
          className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={handleUnstake}
          disabled={loading || !unstakeAmount}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded py-2 font-semibold transition"
        >
          {loading ? 'Processing...' : 'Unstake AEGIS'}
        </button>
      </div>

      {/* Claim Rewards */}
      <div className="bg-gray-800 rounded-lg p-6">
        <button
          onClick={handleClaimRewards}
          disabled={loading || stakingState.availableRewards <= 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded py-2 font-semibold transition"
        >
          {loading ? 'Processing...' : 'Claim Rewards'}
        </button>
      </div>
    </div>
  );
};
