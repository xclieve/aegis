import { ConnectWallet } from '@/components/ConnectWallet';
import { StakingPanel } from '@/components/StakingPanel';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold">AEGIS</h1>
          <p className="text-gray-400">Stake. Earn. Govern.</p>
        </div>
        <ConnectWallet />
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold mb-2">Staking Dashboard</h2>
          <p className="text-gray-400">
            Stake your  tokens to earn a share of protocol fees
          </p>
        </div>

        <StakingPanel />

        {/* Info Section */}
        <div className="mt-12 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How it works</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">1.</span>
              <span>Every transfer has a 2% fee collected automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">2.</span>
              <span>Fees are distributed: 25% burned, 50% to stakers, 25% to bounty treasury</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">3.</span>
              <span>Your share of staking rewards is proportional to your stake</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">4.</span>
              <span>Claim rewards anytime — no lockup period</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-500 mt-16 pb-8">
        <p> Token MVP • Phase 6 Frontend</p>
      </footer>
    </main>
  );
}
