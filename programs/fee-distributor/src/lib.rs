use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface,
    withdraw_withheld_tokens_from_mint, WithdrawWithheldTokensFromMint,
};

declare_id!("7mLJQemwoCQztdtRXshEY7poKNKJN98m39foqvK3DnCg");

/// AEGIS Fee Distributor Program
/// 
/// Harvests transfer fees from SPL Token 2022 and distributes:
/// - 25% burned (deflationary)
/// - 50% to stakers (rewards)
/// - 25% to bounty treasury (community incentives)

#[program]
pub mod fee_distributor {
    use super::*;

    /// Initialize the fee distributor state
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.mint = ctx.accounts.mint.key();
        state.fee_vault = ctx.accounts.fee_vault.key();
        state.staking_rewards_vault = ctx.accounts.staking_rewards_vault.key();
        state.bounty_treasury = ctx.accounts.bounty_treasury.key();
        state.bump = bump;
        state.total_harvested = 0;
        state.total_burned = 0;
        state.total_to_stakers = 0;
        state.total_to_bounty = 0;

        msg!("Fee distributor initialized");
        msg!("Mint: {}", state.mint);
        msg!("Fee vault: {}", state.fee_vault);
        Ok(())
    }

    /// Harvest accumulated fees from token accounts
    /// 
    /// This withdraws withheld transfer fees from the specified accounts
    /// into the fee vault for later distribution.
    pub fn harvest_fees(ctx: Context<HarvestFees>) -> Result<()> {
        let state = &ctx.accounts.state;
        
        // Get fee vault balance before harvest for tracking
        let vault_before = ctx.accounts.fee_vault.amount;

        // Withdraw withheld tokens from the mint itself
        // Token 2022 accumulates fees at the mint level
        let seeds = &[
            b"distributor",
            state.mint.as_ref(),
            &[state.bump],
        ];
        let signer = &[&seeds[..]];

        // CPI to withdraw withheld tokens from mint
        let cpi_accounts = WithdrawWithheldTokensFromMint {
            token_program_id: ctx.accounts.token_program.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            destination: ctx.accounts.fee_vault.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        withdraw_withheld_tokens_from_mint(cpi_ctx)?;

        // Calculate amount harvested
        ctx.accounts.fee_vault.reload()?;
        let harvested = ctx.accounts.fee_vault.amount.saturating_sub(vault_before);
        
        // Update state
        let state = &mut ctx.accounts.state;
        state.total_harvested = state.total_harvested.checked_add(harvested).unwrap();

        msg!("Harvested {} tokens", harvested);
        msg!("Total harvested: {}", state.total_harvested);
        Ok(())
    }

    /// Distribute harvested fees according to protocol rules:
    /// - 25% burned
    /// - 50% to staking rewards
    /// - 25% to bounty treasury
    pub fn distribute(ctx: Context<Distribute>) -> Result<()> {
        let state = &ctx.accounts.state;
        let available = ctx.accounts.fee_vault.amount;
        
        require!(available > 0, FeeDistributorError::NoFeesToDistribute);

        // Calculate splits (using basis points for precision)
        let burn_amount = available.checked_mul(2500).unwrap().checked_div(10000).unwrap(); // 25%
        let staker_amount = available.checked_mul(5000).unwrap().checked_div(10000).unwrap(); // 50%
        let bounty_amount = available.saturating_sub(burn_amount).saturating_sub(staker_amount); // 25% (remainder)

        let seeds = &[
            b"distributor",
            state.mint.as_ref(),
            &[state.bump],
        ];
        let signer = &[&seeds[..]];

        // 1. Burn 25%
        if burn_amount > 0 {
            let burn_accounts = token_2022::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.fee_vault.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            };
            let burn_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                burn_accounts,
                signer,
            );
            token_2022::burn(burn_ctx, burn_amount)?;
            msg!("Burned {} tokens (25%)", burn_amount);
        }

        // 2. Transfer 50% to staking rewards
        if staker_amount > 0 {
            let transfer_accounts = token_2022::TransferChecked {
                from: ctx.accounts.fee_vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.staking_rewards_vault.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            };
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                signer,
            );
            token_2022::transfer_checked(transfer_ctx, staker_amount, ctx.accounts.mint.decimals)?;
            msg!("Transferred {} tokens to stakers (50%)", staker_amount);
        }

        // 3. Transfer 25% to bounty treasury
        if bounty_amount > 0 {
            let transfer_accounts = token_2022::TransferChecked {
                from: ctx.accounts.fee_vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.bounty_treasury.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            };
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                signer,
            );
            token_2022::transfer_checked(transfer_ctx, bounty_amount, ctx.accounts.mint.decimals)?;
            msg!("Transferred {} tokens to bounty treasury (25%)", bounty_amount);
        }

        // Update state totals
        let state = &mut ctx.accounts.state;
        state.total_burned = state.total_burned.checked_add(burn_amount).unwrap();
        state.total_to_stakers = state.total_to_stakers.checked_add(staker_amount).unwrap();
        state.total_to_bounty = state.total_to_bounty.checked_add(bounty_amount).unwrap();

        msg!("Distribution complete. Totals: burned={}, stakers={}, bounty={}",
            state.total_burned, state.total_to_stakers, state.total_to_bounty);
        Ok(())
    }
}

// ============================================================================
// State Accounts
// ============================================================================

#[account]
pub struct DistributorState {
    /// Authority that can manage the distributor
    pub authority: Pubkey,
    /// The AEGIS token mint
    pub mint: Pubkey,
    /// Vault where harvested fees are collected
    pub fee_vault: Pubkey,
    /// Vault where staking rewards are sent
    pub staking_rewards_vault: Pubkey,
    /// Treasury for bounties/community incentives
    pub bounty_treasury: Pubkey,
    /// PDA bump seed
    pub bump: u8,
    /// Total fees ever harvested
    pub total_harvested: u64,
    /// Total tokens burned
    pub total_burned: u64,
    /// Total sent to stakers
    pub total_to_stakers: u64,
    /// Total sent to bounty
    pub total_to_bounty: u64,
}

impl DistributorState {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        32 + // mint
        32 + // fee_vault
        32 + // staking_rewards_vault
        32 + // bounty_treasury
        1 +  // bump
        8 +  // total_harvested
        8 +  // total_burned
        8 +  // total_to_stakers
        8;   // total_to_bounty
}

// ============================================================================
// Instruction Contexts
// ============================================================================

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The AEGIS token mint (Token 2022 with transfer_fee)
    #[account(
        constraint = mint.to_account_info().owner == &token_2022::ID
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Distributor state PDA
    #[account(
        init,
        payer = authority,
        space = DistributorState::SIZE,
        seeds = [b"distributor", mint.key().as_ref()],
        bump,
    )]
    pub state: Account<'info, DistributorState>,

    /// Fee vault - where harvested fees collect
    #[account(
        constraint = fee_vault.mint == mint.key(),
        constraint = fee_vault.to_account_info().owner == &token_2022::ID
    )]
    pub fee_vault: InterfaceAccount<'info, TokenAccount>,

    /// Staking rewards vault
    #[account(
        constraint = staking_rewards_vault.mint == mint.key(),
        constraint = staking_rewards_vault.to_account_info().owner == &token_2022::ID
    )]
    pub staking_rewards_vault: InterfaceAccount<'info, TokenAccount>,

    /// Bounty treasury
    #[account(
        constraint = bounty_treasury.mint == mint.key(),
        constraint = bounty_treasury.to_account_info().owner == &token_2022::ID
    )]
    pub bounty_treasury: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct HarvestFees<'info> {
    #[account(
        mut,
        seeds = [b"distributor", state.mint.as_ref()],
        bump = state.bump,
    )]
    pub state: Account<'info, DistributorState>,

    /// The AEGIS token mint
    #[account(
        mut,
        constraint = mint.key() == state.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Fee vault to receive harvested fees
    #[account(
        mut,
        constraint = fee_vault.key() == state.fee_vault
    )]
    pub fee_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(
        mut,
        seeds = [b"distributor", state.mint.as_ref()],
        bump = state.bump,
    )]
    pub state: Account<'info, DistributorState>,

    /// The AEGIS token mint
    #[account(
        mut,
        constraint = mint.key() == state.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Fee vault (source of funds to distribute)
    #[account(
        mut,
        constraint = fee_vault.key() == state.fee_vault
    )]
    pub fee_vault: InterfaceAccount<'info, TokenAccount>,

    /// Staking rewards destination
    #[account(
        mut,
        constraint = staking_rewards_vault.key() == state.staking_rewards_vault
    )]
    pub staking_rewards_vault: InterfaceAccount<'info, TokenAccount>,

    /// Bounty treasury destination
    #[account(
        mut,
        constraint = bounty_treasury.key() == state.bounty_treasury
    )]
    pub bounty_treasury: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum FeeDistributorError {
    #[msg("No fees available to distribute")]
    NoFeesToDistribute,
}
