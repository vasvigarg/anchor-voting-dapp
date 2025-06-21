use anchor_lang::prelude::*;

declare_id!("FVGuJ5boyFbvbwtgLPJgg8wijgWZp4BNuEKskWeRjwjV");

#[program]
pub mod anchor_voting_dapp {
    use super::*;

    /// Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>, 
        description: String,
        seed: u64  // Add seed parameter for PDA generation
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let proposer = &ctx.accounts.proposer;

        // Validate description length
        require!(
            description.len() > 0 && description.len() <= 500,
            VotingError::InvalidDescriptionLength
        );

        // Initialize proposal
        proposal.proposer = proposer.key();
        proposal.description = description;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.created_at = Clock::get()?.unix_timestamp;
        proposal.seed = seed;
        proposal.bump = ctx.bumps.proposal;

        msg!("Proposal created by: {}", proposer.key());
        msg!("Description: {}", proposal.description);

        Ok(())
    }

    /// Cast a vote on a proposal
    pub fn vote(
        ctx: Context<Vote>, 
        support: bool
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let voter_record = &mut ctx.accounts.voter_record;
        let voter = &ctx.accounts.voter;

        // Ensure proposer cannot vote on their own proposal
        require!(
            proposal.proposer != voter.key(),
            VotingError::ProposerCannotVote
        );

        // Ensure voter hasn't already voted
        require!(
            !voter_record.voted,
            VotingError::AlreadyVoted
        );

        // Cast the vote
        if support {
            proposal.votes_for += 1;
            msg!("Vote FOR cast by: {}", voter.key());
        } else {
            proposal.votes_against += 1;
            msg!("Vote AGAINST cast by: {}", voter.key());
        }

        // Mark voter as having voted
        voter_record.voted = true;
        voter_record.voter = voter.key();
        voter_record.proposal = proposal.key();
        voter_record.support = support;
        voter_record.voted_at = Clock::get()?.unix_timestamp;

        msg!("Current votes - For: {}, Against: {}", 
            proposal.votes_for, 
            proposal.votes_against
        );

        Ok(())
    }

    /// Get proposal results (view function)
    pub fn get_results(ctx: Context<GetResults>) -> Result<()> {
        let proposal = &ctx.accounts.proposal;
        
        msg!("Proposal: {}", proposal.description);
        msg!("Votes For: {}", proposal.votes_for);
        msg!("Votes Against: {}", proposal.votes_against);
        msg!("Total Votes: {}", proposal.votes_for + proposal.votes_against);
        
        if proposal.votes_for > proposal.votes_against {
            msg!("Status: PASSED");
        } else if proposal.votes_against > proposal.votes_for {
            msg!("Status: REJECTED");
        } else {
            msg!("Status: TIED");
        }

        Ok(())
    }
}

// Context for creating a proposal
#[derive(Accounts)]
#[instruction(description: String, seed: u64)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = proposer,
        space = 8 + 32 + 4 + 500 + 8 + 8 + 8 + 8 + 1, // 8 (discriminator) + 32 (pubkey) + 4 + 500 (string) + 8 + 8 + 8 + 8 + 1
        seeds = [
            b"proposal",
            proposer.key().as_ref(),
            &seed.to_le_bytes()
        ],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Context for voting on a proposal
#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 1 + 1 + 8, // 8 (discriminator) + 32 + 32 + 1 + 1 + 8
        seeds = [
            b"voter",
            proposal.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Context for getting results
#[derive(Accounts)]
pub struct GetResults<'info> {
    pub proposal: Account<'info, Proposal>,
}

// Proposal account structure
#[account]
pub struct Proposal {
    pub proposer: Pubkey,           // 32 bytes
    pub description: String,        // 4 + up to 500 bytes
    pub votes_for: u64,            // 8 bytes
    pub votes_against: u64,        // 8 bytes
    pub created_at: i64,           // 8 bytes
    pub seed: u64,                 // 8 bytes (added for PDA generation)
    pub bump: u8,                  // 1 byte
}

// Voter record to track individual votes
#[account]
pub struct VoterRecord {
    pub voter: Pubkey,             // 32 bytes
    pub proposal: Pubkey,          // 32 bytes
    pub voted: bool,               // 1 byte
    pub support: bool,             // 1 byte
    pub voted_at: i64,             // 8 bytes
}

// Custom error types
#[error_code]
pub enum VotingError {
    #[msg("Description must be between 1 and 500 characters")]
    InvalidDescriptionLength,
    
    #[msg("Proposer cannot vote on their own proposal")]
    ProposerCannotVote,
    
    #[msg("You have already voted on this proposal")]
    AlreadyVoted,
}