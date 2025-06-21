# 🗳️ Anchor Voting DApp

A decentralized voting application built with Anchor framework on Solana blockchain. This DApp allows users to create proposals and vote on them in a transparent, immutable way.

## 🌟 Features

- Create Proposals: Users can create proposals with descriptions up to 500 characters
- Democratic Voting: Vote FOR or AGAINST proposals
- Anti-Fraud Protection: Proposers cannot vote on their own proposals. One vote per user per proposal. All votes are recorded on-chain.
- Transparent Results: View real-time voting results and proposal status
- CLI Interface: Easy-to-use command-line interface for all operations
- PDA-based Architecture: Uses Program Derived Addresses for secure account management

## 🏗️ Architecture

1. Smart Contract Structure
- Proposal Account: Stores proposal data, vote counts, and metadata
- VoterRecord Account: Tracks individual voting records to prevent double voting
- PDA Seeds: Uses deterministic addresses for security and uniqueness

2. Account Structures
```bash
// Proposal Account (569 bytes)
pub struct Proposal {
    pub proposer: Pubkey,      // Creator of the proposal
    pub description: String,   // Proposal description (max 500 chars)
    pub votes_for: u64,       // Number of FOR votes
    pub votes_against: u64,   // Number of AGAINST votes
    pub created_at: i64,      // Creation timestamp
    pub seed: u64,            // Unique seed for PDA generation
    pub bump: u8,             // PDA bump seed
}

// Voter Record Account (82 bytes)
pub struct VoterRecord {
    pub voter: Pubkey,        // Voter's public key
    pub proposal: Pubkey,     // Proposal being voted on
    pub voted: bool,          // Has voted flag
    pub support: bool,        // Vote direction (true = FOR, false = AGAINST)
    pub voted_at: i64,        // Voting timestamp
}
``` 

## 🚀 Quick Start

1. Prerequisites
- Rust (latest stable)
- Solana CLI (v1.16+)
- Anchor CLI (v0.28+)
- Node.js (v16+)
- Yarn or npm

2. Installation

Clone the repository:

```bash 
git clone <your-repo-url>
cd anchor-voting-dapp
```

Install dependencies

```bash
yarn install
# or
npm install
```

Configure Solana for devnet

```bash
solana config set --url devnet
solana-keygen new  # if you don't have a keypair
solana airdrop 2   # get some devnet SOL
```

Build the program

```bash
anchor build
```

Deploy to devnet

```bash
anchor deploy --provider.cluster devnet
``` 

## 📖 Usage

CLI Commands: 
The project includes a comprehensive CLI tool for interacting with the voting DApp:

Create a Proposal
```bash
node cli-interact.js create "Should we implement dark mode?"
```

Vote on a Proposal
```bash
# Vote FOR a proposal
node cli-interact.js vote <proposal-address> for

# Vote AGAINST a proposal
node cli-interact.js vote <proposal-address> against
```

View Proposal Results
```bash
node cli-interact.js results <proposal-address>
```

List All Proposals
```bash
node cli-interact.js list
```

Help
```bash 
node cli-interact.js
```

## Example Workflow

```bash
# 1. Create a proposal
node cli-interact.js create "Should we add a mobile app?"

# Output:
# ✅ Proposal created!
# 📝 Description: Should we add a mobile app?
# 🔗 Proposal Address: 7xKz9abc...def123
# 🔢 Seed: 1672531200000
# 🧾 Transaction: 5mF2n...xyz789

# 2. Vote on the proposal (using different wallet)
node cli-interact.js vote 7xKz9abc...def123 for

# 3. Check results
node cli-interact.js results 7xKz9abc...def123

# Output:
# 📋 PROPOSAL RESULTS
# ═══════════════════════════════════════════════════════
# 📝 Description: Should we add a mobile app?
# 👤 Proposer: 8YFw2...abc123
# 📅 Created: 12/31/2023, 10:00:00 PM
# 🔢 Seed: 1672531200000
# ✅ Votes For: 1
# ❌ Votes Against: 0
# 📊 Total Votes: 1
# 🏆 Status: PASSED
```

## 🛠️ Development

Project Structure
```bash 
anchor-voting-dapp/
├── programs/
│   └── anchor-voting-dapp/
│       └── src/
│           └── lib.rs              # Main program logic
├── target/
│   └── idl/
│       └── anchor_voting_dapp.json # Generated IDL
├── tests/                          # Anchor tests
├── cli-interact.js                 # CLI interface
├── Anchor.toml                     # Anchor configuration
├── Cargo.toml                      # Rust dependencies
└── package.json                    # Node.js dependencies
```

Running Tests
```bash
anchor test
```

Local Development
```bash
# Start local validator
solana-test-validator

# In another terminal, deploy locally
anchor build
anchor deploy --provider.cluster localnet

# Update cli-interact.js to use localnet
# Change connection URL to: "http://localhost:8899"
```

## 🔒 Security Features

Anti-Fraud Mechanisms

- Proposer Restriction: Creators cannot vote on their own proposals
- Single Vote Enforcement: Each user can only vote once per proposal
- Immutable Records: All votes are permanently recorded on-chain
- PDA Security: Uses Program Derived Addresses to prevent account manipulation

## Error Handling
The program includes comprehensive error handling:
```bash
rust#[error_code]
pub enum VotingError {
    #[msg("Description must be between 1 and 500 characters")]
    InvalidDescriptionLength,
    
    #[msg("Proposer cannot vote on their own proposal")]
    ProposerCannotVote,
    
    #[msg("You have already voted on this proposal")]
    AlreadyVoted,
}
```

## 🌐 Network Configuration
Devnet (Recommended for testing)
```bash
toml[programs.devnet]
anchor_voting_dapp = "FVGuJ5boyFbvbwtgLPJgg8wijgWZp4BNuEKskWeRjwjV"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

Mainnet-beta (Production)
```bash
toml[programs.mainnet-beta]
anchor_voting_dapp = "YOUR_MAINNET_PROGRAM_ID"

[provider]
cluster = "mainnet-beta"
wallet = "~/.config/solana/id.json"
```

## 📊 Program Instructions
1. `create_proposal`
Creates a new proposal with a unique seed-based PDA.

Parameters:

`description` : String - Proposal description (1-500 characters)

`seed` : u64 - Unique seed for PDA generation

 Accounts:

`proposal` - The proposal account to create (PDA)

`proposer` - The user creating the proposal (signer)

`system_program` - Solana system program

2. `vote`
Cast a vote on an existing proposal.

Parameters:

`support` : bool - Vote direction (true = FOR, false = AGAINST)

Accounts:

`proposal` - The proposal being voted on

`voter_record` - Voter record account (PDA)

`voter` - The user casting the vote (signer)

`system_program` - Solana system program

3. `get_results`
View function to display proposal results (mainly for program logs).

Accounts:

`proposal` - The proposal to view

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
