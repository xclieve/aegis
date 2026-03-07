use anchor_lang::prelude::*;

declare_id!("F2dTW59to7C3zqFuTVa2LZWSnhJfixBse2ytimQeU4Kd");

#[program]
pub mod aegis {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
