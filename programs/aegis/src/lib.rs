use anchor_lang::prelude::*;

declare_id!("9VsHdFGG2eT5gkXs7v1q5bWcwRCiGqhcZHN1NpgCcNWq");

#[program]
pub mod aegis {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
