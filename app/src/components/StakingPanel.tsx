"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  DEPLOYMENT_STATUS,
  AEGIS_MINT,
  findStakeAccountPDA,
  findStakingPoolPDA,
  formatTokenAmount,
  parseTokenAmount,
  shortenPubkey,
  NETWORK,
} from "@/lib/anchor";

interface StakingState {
  stakedAmount: number;
  availableRewards: number;
  tokenBalance: number;
}

// Deployment status badge component
const StatusBadge = ({ deployed, label }: { deployed: boolean; label: string }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      deployed ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        deployed ? "bg-green-400" : "bg-yellow-400"
      }`}
    />
    {label}: {deployed ? "Live" : "Pending"}
  </span>
);

export const StakingPanel = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [stakingState, setStakingState] = useState<StakingState>({
    stakedAmount: 0,
    availableRewards: 0,
    tokenBalance: 0,
  });

  const stakingDeployed = DEPLOYMENT_STATUS.staking.deployed;

  // Fetch staking state from chain
  const fetchStakingState = useCallback(async () => {
    if (!connected || !publicKey) return;

    if (!stakingDeployed) {
      // Staking program not yet deployed
      setStakingState({
        stakedAmount: 0,
        availableRewards: 0,
        tokenBalance: 0,
      });
      return;
    }

    try {
      // TODO: Implement actual on-chain fetch once staking program is deployed
      // const [poolPDA] = findStakingPoolPDA(AEGIS_MINT);
      // const [stakeAccountPDA] = findStakeAccountPDA(poolPDA, publicKey);
      // const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPDA);
      
      setStakingState({
        stakedAmount: 0,
        availableRewards: 0,
        tokenBalance: 0,
      });
    } catch (error) {
      console.error("Failed to fetch staking state:", error);
    }
  }, [connected, publicKey, stakingDeployed]);

  useEffect(() => {
    fetchStakingState();
  }, [fetchStakingState]);

  const handleStake = async () => {
    if (!connected || !publicKey || !stakeAmount) return;

    if (!stakingDeployed) {
      alert("Staking program not yet deployed. Check back soon!");
      return;
    }

    setLoading(true);
    try {
      // TODO: Call staking program stake instruction
      console.log("Staking", stakeAmount, "AEGIS");
      alert("Staking transaction would be sent here");
    } catch (error) {
      console.error("Stake error:", error);
      alert(`Stake failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!connected || !publicKey || !unstakeAmount) return;

    if (!stakingDeployed) {
      alert("Staking program not yet deployed. Check back soon!");
      return;
    }

    setLoading(true);
    try {
      // TODO: Call staking program unstake instruction
      console.log("Unstaking", unstakeAmount, "AEGIS");
      alert("Unstake transaction would be sent here");
    } catch (error) {
      console.error("Unstake error:", error);
      alert(`Unstake failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!connected || !publicKey) return;

    if (!stakingDeployed) {
      alert("Staking program not yet deployed. Check back soon!");
      return;
    }

    setLoading(true);
    try {
      // TODO: Call staking program claim_rewards instruction
      console.log("Claiming rewards");
      alert("Claim rewards transaction would be sent here");
    } catch (error) {
      console.error("Claim error:", error);
      alert(`Claim failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 mb-4">Connect your wallet to stake AEGIS</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Network & Deployment Status */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Network</span>
          <span className="text-sm font-mono text-blue-400">{NETWORK}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge deployed={DEPLOYMENT_STATUS.aegis.deployed} label="Token" />
          <StatusBadge deployed={DEPLOYMENT_STATUS.feeDistributor.deployed} label="Fees" />
          <StatusBadge deployed={DEPLOYMENT_STATUS.staking.deployed} label="Staking" />
        </div>
        {!stakingDeployed && (
          <p className="text-xs text-yellow-400 mt-2">
            ⏳ Staking deployment pending (~0.25 SOL needed)
          </p>
        )}
      </div>

      {/* Connected Wallet */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Wallet</span>
          <span className="text-sm font-mono text-green-400">
            {shortenPubkey(publicKey!)}
          </span>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Your Staking</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Staked</p>
            <p className="text-xl font-bold">
              {stakingState.stakedAmount.toLocaleString()} AEGIS
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Rewards</p>
            <p className="text-xl font-bold text-green-400">
              {stakingState.availableRewards.toLocaleString()} AEGIS
            </p>
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Wallet Balance</p>
          <p className="text-lg">
            {stakingState.tokenBalance.toLocaleString()} AEGIS
          </p>
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
          disabled={loading || !stakingDeployed}
        />
        <button
          onClick={handleStake}
          disabled={loading || !stakeAmount || !stakingDeployed}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded py-2 font-semibold transition"
        >
          {loading ? "Processing..." : stakingDeployed ? "Stake AEGIS" : "Awaiting Deployment"}
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
          disabled={loading || !stakingDeployed}
        />
        <button
          onClick={handleUnstake}
          disabled={loading || !unstakeAmount || !stakingDeployed}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded py-2 font-semibold transition"
        >
          {loading ? "Processing..." : stakingDeployed ? "Unstake AEGIS" : "Awaiting Deployment"}
        </button>
      </div>

      {/* Claim Rewards */}
      <div className="bg-gray-800 rounded-lg p-6">
        <button
          onClick={handleClaimRewards}
          disabled={loading || stakingState.availableRewards <= 0 || !stakingDeployed}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded py-2 font-semibold transition"
        >
          {loading ? "Processing..." : stakingDeployed ? "Claim Rewards" : "Awaiting Deployment"}
        </button>
      </div>
    </div>
  );
};
