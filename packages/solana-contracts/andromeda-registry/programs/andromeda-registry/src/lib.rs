use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("FBYJTCxPU6PsGLwasEV8YemKsKaMgSkEfPKrudpLbhYx");

#[program]
pub mod andromeda_registry {
    use super::*;

    pub fn submit_milestone(
        ctx: Context<SubmitMilestone>,
        merkle_root: [u8; 32],
        ipfs_cid: String,
        did: String,
        ecosystem: String,
        dao_identifier: String,
    ) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;
        milestone.merkle_root = merkle_root;
        milestone.ipfs_cid = ipfs_cid;
        milestone.did = did.clone();
        milestone.ecosystem = ecosystem;
        milestone.dao_identifier = dao_identifier;
        milestone.timestamp = Clock::get()?.unix_timestamp;
        milestone.submitter = ctx.accounts.authority.key();
        milestone.verified = false;
        msg!("Milestone submitted: {}", milestone.did);
        Ok(())
    }

    pub fn verify_milestone(ctx: Context<VerifyMilestone>) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;
        milestone.verified = true;
        msg!("Milestone verified: {}", milestone.did);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    merkle_root: [u8; 32],
    ipfs_cid: String,
    did: String,
    ecosystem: String,
    dao_identifier: String,
)]
pub struct SubmitMilestone<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4 + 200) + (4 + 100) + (4 + 50) + (4 + 50) + 8 + 32 + 1,
        seeds = [
            b"milestone",
            authority.key().as_ref(),
            hash(did.as_bytes()).as_ref()
        ],
        bump
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyMilestone<'info> {
    #[account(mut, has_one = submitter)]
    pub milestone: Account<'info, Milestone>,
    pub submitter: Signer<'info>,
}

#[account]
pub struct Milestone {
    pub merkle_root: [u8; 32],
    pub ipfs_cid: String,
    pub did: String,
    pub ecosystem: String,
    pub dao_identifier: String,
    pub timestamp: i64,
    pub submitter: Pubkey,
    pub verified: bool,
}
