"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import {
  DEPLOYMENT_STATUS,
  AEGIS_MINT,
  parseTokenAmount,
  shortenPubkey,
  NETWORK,
  AEGIS_DECIMALS,
} from "@/lib/anchor";
import {
  createStakeInstruction,
  createUnstakeInstruction,
  createClaimRewardsInstruction,
  getTokenBalance,
  getStakingState,
} from "@/lib/staking";

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

// Transaction status component
const TxStatus = ({ 
  status, 
  signature 
}: { 
  status: "idle" | "pending" | "success" | "error"; 
  signature?: string;
}) => {
  if (status === "idle") return null;
  
  const colors = {
    pending: "bg-blue-900 text-blue-300",
    success: "bg-green-900 text-green-300",
    error: "bg-red-900 text-red-300",
  };
  
  const messages = {
    pending: "⏳ Transaction pending...",
    success: "✅ Transaction confirmed!",
    error: "❌ Transaction failed",
  };

  return (
    <div className={`${colors[status]} rounded-lg p-3 mb-4 text-sm`}>
      <p>{messages[status]}</p>
      {signature && status === "success" && (
        <a
          href={`https://explorer.solana.com/tx/${signature}?cluster=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline text-xs mt-1 block"
        >
          View on Explorer →
        </a>
      )}
    </div>
  );
};

export const StakingPanel = () => {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [lastSignature, setLastSignature] = useState<string>();
  const [stakingState, setStakingState] = useState<StakingState>({
    stakedAmount: 0,
    availableRewards: 0,
    tokenBalance: 0,
  });

  const stakingDeployed = DEPLOYMENT_STATUS.staking.deployed;

  // Fetch staking state from chain
  const fetchStakingState = useCallback(async () => {
    if (!connected || !publicKey) return;

    try {
      // Get token balance
      const tokenBalance = await getTokenBalance(connection, publicKey);
      
      // Get staking state
      const { stakedAmount, availableRewards } = await getStakingState(connection, publicKey);

      setStakingState({
        stakedAmount,
        availableRewards,
        tokenBalance,
      });
    } catch (error) {
      console.error("Failed to fetch staking state:", error);
    }
  }, [connected, publicKey, connection]);

  useEffect(() => {
    fetchStakingState();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStakingState, 30000);
    return () => clearInterval(interval);
  }, [fetchStakingState]);

  // Reset tx status after a delay
  useEffect(() => {
    if (txStatus === "success" || txStatus === "error") {
      const timer = setTimeout(() => setTxStatus("idle"), 5000);
      return () => clearTimeout(timer);
    }
  }, [txStatus]);

  const handleStake = async () => {
    if (!connected || !publicKey || !stakeAmount || !sendTransaction) return;

    if (!stakingDeployed) {
      alert("Staking program not yet deployed. Check back soon!");
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > stakingState.tokenBalance) {
      alert("Insufficient balance");
      return;
    }

    setLoading(true);
    setTxStatus("pending");
    
    try {
      const amountBN = new BN(Math.floor(amount * 10 ** AEGIS_DECIMALS));
      const tx = await createStakeInstruction(connection, publicKey, amountBN);
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      console.log("Stake tx sent:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setLastSignature(signature);
      setTxStatus("success");
      setStakeAmount("");
      
      // Refresh balances
      setTimeout(fetchStakingState, 2000);
    } catch (error: any) {
      console.error("Stake error:", error);
      setTxStatus("error");
      
      // Show user-friendly error
      if (error.message?.includes("User rejected")) {
        alert("Transaction cancelled");
      } else if (error.message?.includes("insufficient")) {
        alert("Insufficient SOL for transaction fees");
      } else {
        alert(`Stake failed: ${error.message || error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!connected || !publicKey || !unstakeAmount || !sendTransaction) return;

    if (!stakingDeployed) {
      alert("Staking program not yet deployed. Check back soon!");
      return;
    }

    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > stakingState.stakedAmount) {
      alert("Cannot unstake more than staked amount");
      return;
    }

    setLoading(true);
    setTxStatus("pending");
    
    try {
      const amountBN = new BN(Math.floor(amount * 10 ** AEGIS_DECIMALS));
      const tx = await createUnstakeInstruction(connection, publicKey, amountBN);
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      console.log("Unstake tx sent:", signature);
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setLastSignature(signature);
      setTxStatus("success");
      setUnstakeAmount("");
      
      setTimeout(fetchStakingState, 2000);
    } catch (error: any) {
      console.error("Unstake error:", error);
      setTxStatus("error");
      alert(`Unstake failed: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!connected || !publicKey || !sendTransaction) return;

    if (!stakingDeployed) {
      alert("Staking program not yet deployed. Check back soon!");
      return;
    }

    if (stakingState.availableRewards <= 0) {
      alert("No rewards to claim");
      return;
    }

    setLoading(true);
    setTxStatus("pending");
    
    try {
      const tx = await createClaimRewardsInstruction(connection, publicKey);
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      console.log("Claim rewards tx sent:", signature);
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setLastSignature(signature);
      setTxStatus("success");
      
      setTimeout(fetchStakingState, 2000);
    } catch (error: any) {
      console.error("Claim error:", error);
      setTxStatus("error");
      alert(`Claim failed: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMaxStake = () => {
    setStakeAmount(stakingState.tokenBalance.toString());
  };

  const handleMaxUnstake = () => {
    setUnstakeAmount(stakingState.stakedAmount.toString());
  };

  if (!connected) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 mb-4">Connect your wallet to stake AEGIS</p>
        <p className="text-sm text-gray-500">
          AEGIS Token: <span className="font-mono text-xs">{AEGIS_MINT.toBase58()}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Network & Deployment Status */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Network</span>
          <span className="text-sm font-mono text-blue-400 uppercase">{NETWORK}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge deployed={DEPLOYMENT_STATUS.aegis.deployed} label="Token" />
          <StatusBadge deployed={DEPLOYMENT_STATUS.feeDistributor.deployed} label="Fees" />
          <StatusBadge deployed={DEPLOYMENT_STATUS.staking.deployed} label="Staking" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Token: {shortenPubkey(AEGIS_MINT)}
        </p>
      </div>

      {/* Transaction Status */}
      <TxStatus status={txStatus} signature={lastSignature} />

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
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Staking</h3>
          <button
            onClick={fetchStakingState}
            className="text-xs text-gray-400 hover:text-white"
            title="Refresh"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Staked</p>
            <p className="text-xl font-bold">
              {stakingState.stakedAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} AEGIS
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Rewards</p>
            <p className="text-xl font-bold text-green-400">
              {stakingState.availableRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} AEGIS
            </p>
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Wallet Balance</p>
          <p className="text-lg">
            {stakingState.tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} AEGIS
          </p>
        </div>
      </div>

      {/* Stake Card */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Stake</h3>
        <div className="relative">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Amount to stake"
            className="w-full bg-gray-700 rounded px-4 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !stakingDeployed}
          />
          <button
            onClick={handleMaxStake}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
            disabled={loading}
          >
            MAX
          </button>
        </div>
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
        <div className="relative">
          <input
            type="number"
            value={unstakeAmount}
            onChange={(e) => setUnstakeAmount(e.target.value)}
            placeholder="Amount to unstake"
            className="w-full bg-gray-700 rounded px-4 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !stakingDeployed}
          />
          <button
            onClick={handleMaxUnstake}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-400 hover:text-purple-300"
            disabled={loading}
          >
            MAX
          </button>
        </div>
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
          {loading 
            ? "Processing..." 
            : stakingDeployed 
              ? `Claim ${stakingState.availableRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} AEGIS` 
              : "Awaiting Deployment"}
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>💡 Stake AEGIS tokens to earn rewards from protocol fees</p>
        <p>50% of all transfer fees are distributed to stakers</p>
      </div>
    </div>
  );
};
