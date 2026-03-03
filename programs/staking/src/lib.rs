use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

declare_id!("Stak1ng111111111111111111111111111111111111");

/// AEGIS Staking Program
/// 
/// Allows users to stake AEGIS tokens and earn rewards from protocol fees.
/// Rewards are distributed proportionally based on stake amount.
/// 
/// Flow:
/// 1. User stakes tokens → stake_vault
/// 2. Fee distributor sends 50% of fees → rewards_vault
/// 3. User claims proportional share of rewards_vault

#[program]
pub mod staking {
    use super::*;

    /// Initialize the staking pool
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.mint = ctx.accounts.mint.key();
        pool.stake_vault = ctx.accounts.stake_vault.key();
        pool.rewards_vault = ctx.accounts.rewards_vault.key();
        pool.bump = bump;
        pool.total_staked = 0;
        pool.total_rewards_distributed = 0;
        pool.reward_per_token_stored = 0;
        pool.last_update_time = Clock::get()?.unix_timestamp;

        msg!("Staking pool initialized");
        msg!("Mint: {}", pool.mint);
        msg!("Stake vault: {}", pool.stake_vault);
        msg!("Rewards vault: {}", pool.rewards_vault);
        Ok(())
    }

    /// Stake AEGIS tokens
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        // Update rewards before changing stake
        update_rewards(&mut ctx.accounts.pool, &mut ctx.accounts.stake_account, &ctx.accounts.rewards_vault)?;

        // Transfer tokens from user to stake vault
        let cpi_accounts = token_2022::TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        // Update stake account
        let stake_account = &mut ctx.accounts.stake_account;
        stake_account.owner = ctx.accounts.user.key();
        stake_account.pool = ctx.accounts.pool.key();
        stake_account.staked_amount = stake_account.staked_amount.checked_add(amount).unwrap();
        stake_account.stake_timestamp = Clock::get()?.unix_timestamp;

        // Update pool totals
        let pool = &mut ctx.accounts.pool;
        pool.total_staked = pool.total_staked.checked_add(amount).unwrap();

        msg!("Staked {} tokens", amount);
        msg!("User total staked: {}", stake_account.staked_amount);
        msg!("Pool total staked: {}", pool.total_staked);
        Ok(())
    }

    /// Unstake AEGIS tokens
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);
        
        let stake_account = &ctx.accounts.stake_account;
        require!(stake_account.staked_amount >= amount, StakingError::InsufficientStake);

        // Update rewards before changing stake
        update_rewards(&mut ctx.accounts.pool, &mut ctx.accounts.stake_account, &ctx.accounts.rewards_vault)?;

        let pool = &ctx.accounts.pool;
        let seeds = &[
            b"staking_pool",
            pool.mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer tokens from stake vault back to user
        let cpi_accounts = token_2022::TransferChecked {
            from: ctx.accounts.stake_vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        // Update stake account
        let stake_account = &mut ctx.accounts.stake_account;
        stake_account.staked_amount = stake_account.staked_amount.checked_sub(amount).unwrap();

        // Update pool totals
        let pool = &mut ctx.accounts.pool;
        pool.total_staked = pool.total_staked.checked_sub(amount).unwrap();

        msg!("Unstaked {} tokens", amount);
        msg!("User remaining stake: {}", stake_account.staked_amount);
        msg!("Pool total staked: {}", pool.total_staked);
        Ok(())
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        // Update rewards to get latest
        update_rewards(&mut ctx.accounts.pool, &mut ctx.accounts.stake_account, &ctx.accounts.rewards_vault)?;

        let stake_account = &mut ctx.accounts.stake_account;
        let rewards = stake_account.unclaimed_rewards;
        
        require!(rewards > 0, StakingError::NoRewardsToClaim);

        let pool = &ctx.accounts.pool;
        let seeds = &[
            b"staking_pool",
            pool.mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer rewards from rewards vault to user
        let cpi_accounts = token_2022::TransferChecked {
            from: ctx.accounts.rewards_vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token_2022::transfer_checked(cpi_ctx, rewards, ctx.accounts.mint.decimals)?;

        // Reset unclaimed rewards and update pool stats
        stake_account.unclaimed_rewards = 0;
        let pool = &mut ctx.accounts.pool;
        pool.total_rewards_distributed = pool.total_rewards_distributed.checked_add(rewards).unwrap();

        msg!("Claimed {} reward tokens", rewards);
        msg!("Total rewards distributed: {}", pool.total_rewards_distributed);
        Ok(())
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Update reward calculations for a user
/// Uses a simple reward-per-token model:
/// - reward_per_token increases as rewards_vault grows
/// - user_rewards = staked_amount * (current_rpt - user_rpt_paid)
fn update_rewards(
    pool: &mut Account<StakingPool>,
    stake_account: &mut Account<StakeAccount>,
    rewards_vault: &InterfaceAccount<TokenAccount>,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    
    // Calculate new rewards available in vault
    // (This is a simplified model - rewards_vault balance represents available rewards)
    if pool.total_staked > 0 {
        // Calculate rewards per token based on vault balance
        // We use 1e18 precision for reward_per_token to avoid precision loss
        let available_rewards = rewards_vault.amount as u128;
        let total_staked = pool.total_staked as u128;
        let new_reward_per_token = available_rewards
            .checked_mul(1_000_000_000_000_000_000u128) // 1e18 precision
            .unwrap()
            .checked_div(total_staked)
            .unwrap_or(0);
        
        pool.reward_per_token_stored = new_reward_per_token;
    }
    
    // Calculate user's pending rewards
    if stake_account.staked_amount > 0 {
        let staked = stake_account.staked_amount as u128;
        let reward_delta = pool.reward_per_token_stored.saturating_sub(stake_account.reward_per_token_paid);
        let pending = staked
            .checked_mul(reward_delta)
            .unwrap()
            .checked_div(1_000_000_000_000_000_000u128) // Remove 1e18 precision
            .unwrap_or(0) as u64;
        
        stake_account.unclaimed_rewards = stake_account.unclaimed_rewards.checked_add(pending).unwrap();
    }
    
    // Update user's checkpoint
    stake_account.reward_per_token_paid = pool.reward_per_token_stored;
    pool.last_update_time = current_time;
    
    Ok(())
}

// ============================================================================
// State Accounts
// ============================================================================

#[account]
pub struct StakingPool {
    /// Authority that can manage the pool
    pub authority: Pubkey,
    /// The AEGIS token mint
    pub mint: Pubkey,
    /// Vault where staked tokens are held
    pub stake_vault: Pubkey,
    /// Vault where rewards are held (filled by fee_distributor)
    pub rewards_vault: Pubkey,
    /// PDA bump seed
    pub bump: u8,
    /// Total tokens staked across all users
    pub total_staked: u64,
    /// Total rewards ever distributed
    pub total_rewards_distributed: u64,
    /// Reward per token stored (1e18 precision)
    pub reward_per_token_stored: u128,
    /// Last time rewards were updated
    pub last_update_time: i64,
}

impl StakingPool {
    pub const SIZE: usize = 8 +  // discriminator
        32 + // authority
        32 + // mint
        32 + // stake_vault
        32 + // rewards_vault
        1 +  // bump
        8 +  // total_staked
        8 +  // total_rewards_distributed
        16 + // reward_per_token_stored (u128)
        8;   // last_update_time
}

#[account]
pub struct StakeAccount {
    /// Owner of this stake account
    pub owner: Pubkey,
    /// The staking pool this belongs to
    pub pool: Pubkey,
    /// Amount currently staked
    pub staked_amount: u64,
    /// Timestamp of last stake action
    pub stake_timestamp: i64,
    /// User's reward_per_token_paid checkpoint
    pub reward_per_token_paid: u128,
    /// Unclaimed reward tokens
    pub unclaimed_rewards: u64,
}

impl StakeAccount {
    pub const SIZE: usize = 8 +  // discriminator
        32 + // owner
        32 + // pool
        8 +  // staked_amount
        8 +  // stake_timestamp
        16 + // reward_per_token_paid (u128)
        8;   // unclaimed_rewards
}

// ============================================================================
// Instruction Contexts
// ============================================================================

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The AEGIS token mint (Token 2022)
    #[account(
        constraint = mint.to_account_info().owner == &token_2022::ID
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Staking pool state PDA
    #[account(
        init,
        payer = authority,
        space = StakingPool::SIZE,
        seeds = [b"staking_pool", mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, StakingPool>,

    /// Vault for staked tokens (authority should be pool PDA)
    #[account(
        constraint = stake_vault.mint == mint.key(),
        constraint = stake_vault.to_account_info().owner == &token_2022::ID
    )]
    pub stake_vault: InterfaceAccount<'info, TokenAccount>,

    /// Vault for rewards (filled by fee_distributor, authority should be pool PDA)
    #[account(
        constraint = rewards_vault.mint == mint.key(),
        constraint = rewards_vault.to_account_info().owner == &token_2022::ID
    )]
    pub rewards_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// The AEGIS token mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// Staking pool
    #[account(
        mut,
        seeds = [b"staking_pool", mint.key().as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakingPool>,

    /// User's stake account (created if needed)
    #[account(
        init_if_needed,
        payer = user,
        space = StakeAccount::SIZE,
        seeds = [b"stake_account", pool.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// User's token account (source of stake)
    #[account(
        mut,
        constraint = user_token_account.mint == mint.key(),
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Stake vault (destination)
    #[account(
        mut,
        constraint = stake_vault.key() == pool.stake_vault,
    )]
    pub stake_vault: InterfaceAccount<'info, TokenAccount>,

    /// Rewards vault (for reward calculation)
    #[account(
        constraint = rewards_vault.key() == pool.rewards_vault,
    )]
    pub rewards_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// The AEGIS token mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// Staking pool
    #[account(
        mut,
        seeds = [b"staking_pool", mint.key().as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakingPool>,

    /// User's stake account
    #[account(
        mut,
        seeds = [b"stake_account", pool.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// User's token account (destination)
    #[account(
        mut,
        constraint = user_token_account.mint == mint.key(),
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Stake vault (source)
    #[account(
        mut,
        constraint = stake_vault.key() == pool.stake_vault,
    )]
    pub stake_vault: InterfaceAccount<'info, TokenAccount>,

    /// Rewards vault (for reward calculation)
    #[account(
        constraint = rewards_vault.key() == pool.rewards_vault,
    )]
    pub rewards_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// The AEGIS token mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// Staking pool
    #[account(
        mut,
        seeds = [b"staking_pool", mint.key().as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakingPool>,

    /// User's stake account
    #[account(
        mut,
        seeds = [b"stake_account", pool.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = stake_account.owner == user.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// User's token account (destination for rewards)
    #[account(
        mut,
        constraint = user_token_account.mint == mint.key(),
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Rewards vault (source of rewards)
    #[account(
        mut,
        constraint = rewards_vault.key() == pool.rewards_vault,
    )]
    pub rewards_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum StakingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient staked balance")]
    InsufficientStake,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
}
