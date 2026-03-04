use anchor_lang::prelude::*;

declare_id!("E9eCCUEZ5g41ddKGN9Coju43QzKJuEG4FEm32j1sTwNG");

#[program]
pub mod aegis {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
