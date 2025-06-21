// cli-interact.js - Fixed version with correct field names
const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

class VotingDappCLI {
  constructor() {
    this.connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );
    this.programId = new PublicKey(
      "FVGuJ5boyFbvbwtgLPJgg8wijgWZp4BNuEKskWeRjwjV"
    );
    this.program = null;
  }

  async initialize() {
    // Load wallet from file
    const walletPath = path.join(process.env.HOME, ".config/solana/id.json");
    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
    this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    // Set up provider
    const provider = new anchor.AnchorProvider(
      this.connection,
      new anchor.Wallet(this.wallet),
      { commitment: "confirmed" }
    );

    // Load IDL - Check if file exists first
    const idlPath = path.join(__dirname, "target/idl/anchor_voting_dapp.json");
    if (!fs.existsSync(idlPath)) {
      throw new Error(
        `IDL file not found at: ${idlPath}\nRun 'anchor build' first.`
      );
    }

    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

    // Initialize program
    this.program = new anchor.Program(idl, this.programId, provider);

    console.log("✅ CLI initialized");
    console.log(`📧 Wallet: ${this.wallet.publicKey.toString()}`);
    console.log(`🌐 Network: devnet`);
  }

  async createProposal(description) {
    try {
      console.log("🚀 Creating proposal...");

      // Generate a unique seed (using timestamp)
      const seed = new anchor.BN(Date.now());

      // Find proposal PDA using the seed
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          this.wallet.publicKey.toBuffer(),
          seed.toArrayLike(Buffer, "le", 8),
        ],
        this.program.programId
      );

      // Create transaction with the seed parameter
      const tx = await this.program.methods
        .createProposal(description, seed)
        .accounts({
          proposal: proposalPda,
          proposer: this.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Proposal created!");
      console.log(`📝 Description: ${description}`);
      console.log(`🔗 Proposal Address: ${proposalPda.toString()}`);
      console.log(`🔢 Seed: ${seed.toString()}`);
      console.log(`🧾 Transaction: ${tx}`);

      return proposalPda;
    } catch (error) {
      console.error("❌ Error creating proposal:", error.message);
      throw error;
    }
  }

  async vote(proposalAddress, support) {
    try {
      console.log(`🗳️  Casting vote ${support ? "FOR" : "AGAINST"}...`);

      const proposalPda = new PublicKey(proposalAddress);

      // Find voter record PDA
      const [voterRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("voter"),
          proposalPda.toBuffer(),
          this.wallet.publicKey.toBuffer(),
        ],
        this.program.programId
      );

      // Create vote transaction
      const tx = await this.program.methods
        .vote(support)
        .accounts({
          proposal: proposalPda,
          voterRecord: voterRecordPda,
          voter: this.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Vote ${support ? "FOR" : "AGAINST"} cast successfully!`);
      console.log(`🧾 Transaction: ${tx}`);
    } catch (error) {
      console.error("❌ Error voting:", error.message);
      throw error;
    }
  }

  async getResults(proposalAddress) {
    try {
      console.log("📊 Fetching proposal results...");

      const proposalPda = new PublicKey(proposalAddress);

      // Fetch proposal data
      const proposalData = await this.program.account.proposal.fetch(
        proposalPda
      );

      // FIXED: Use correct field names (snake_case as in Rust)
      const totalVotes =
        proposalData.votes_for.toNumber() +
        proposalData.votes_against.toNumber();
      let status = "TIED";

      if (
        proposalData.votes_for.toNumber() >
        proposalData.votes_against.toNumber()
      ) {
        status = "PASSED";
      } else if (
        proposalData.votes_against.toNumber() >
        proposalData.votes_for.toNumber()
      ) {
        status = "REJECTED";
      }

      console.log("\n📋 PROPOSAL RESULTS");
      console.log("═".repeat(50));
      console.log(`📝 Description: ${proposalData.description}`);
      console.log(`👤 Proposer: ${proposalData.proposer.toString()}`);
      console.log(
        `📅 Created: ${new Date(
          proposalData.created_at.toNumber() * 1000
        ).toLocaleString()}`
      );
      console.log(`🔢 Seed: ${proposalData.seed.toString()}`);
      console.log(`✅ Votes For: ${proposalData.votes_for.toNumber()}`);
      console.log(`❌ Votes Against: ${proposalData.votes_against.toNumber()}`);
      console.log(`📊 Total Votes: ${totalVotes}`);
      console.log(`🏆 Status: ${status}`);
      console.log("═".repeat(50));

      return {
        description: proposalData.description,
        proposer: proposalData.proposer.toString(),
        votesFor: proposalData.votes_for.toNumber(),
        votesAgainst: proposalData.votes_against.toNumber(),
        totalVotes,
        status,
        createdAt: proposalData.created_at.toNumber(),
        seed: proposalData.seed.toString(),
      };
    } catch (error) {
      console.error("❌ Error fetching results:", error.message);
      throw error;
    }
  }

  async listAllProposals() {
    try {
      console.log("📋 Fetching all proposals...");

      // Get all proposal accounts
      const proposals = await this.program.account.proposal.all();

      if (proposals.length === 0) {
        console.log("📭 No proposals found");
        return [];
      }

      console.log(`\n📊 FOUND ${proposals.length} PROPOSAL(S)`);
      console.log("═".repeat(80));

      proposals.forEach((proposal, index) => {
        const data = proposal.account;
        // FIXED: Use correct field names
        const totalVotes =
          data.votes_for.toNumber() + data.votes_against.toNumber();
        let status = "TIED";

        if (data.votes_for.toNumber() > data.votes_against.toNumber()) {
          status = "PASSED";
        } else if (data.votes_against.toNumber() > data.votes_for.toNumber()) {
          status = "REJECTED";
        }

        console.log(`\n${index + 1}. ${data.description}`);
        console.log(`   🔗 Address: ${proposal.publicKey.toString()}`);
        console.log(`   👤 Proposer: ${data.proposer.toString()}`);
        console.log(`   🔢 Seed: ${data.seed.toString()}`);
        console.log(
          `   ✅ For: ${data.votes_for.toNumber()} | ❌ Against: ${data.votes_against.toNumber()} | 📊 Total: ${totalVotes}`
        );
        console.log(`   🏆 Status: ${status}`);
        console.log(
          `   📅 Created: ${new Date(
            data.created_at.toNumber() * 1000
          ).toLocaleString()}`
        );
      });

      console.log("═".repeat(80));
      return proposals;
    } catch (error) {
      console.error("❌ Error listing proposals:", error.message);
      throw error;
    }
  }

  // Helper method to find proposal PDA by seed
  findProposalPDA(proposer, seed) {
    const seedBN = new anchor.BN(seed);
    const [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        new PublicKey(proposer).toBuffer(),
        seedBN.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );
    return proposalPda;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🗳️  Voting DApp CLI Tool

Usage:
  node cli-interact.js create "Your proposal description"
  node cli-interact.js vote <proposal-address> <for|against>
  node cli-interact.js results <proposal-address>
  node cli-interact.js list

Examples:
  node cli-interact.js create "Should we implement feature X?"
  node cli-interact.js vote 7xKz...ABC for
  node cli-interact.js vote 7xKz...ABC against
  node cli-interact.js results 7xKz...ABC
  node cli-interact.js list
        `);
    return;
  }

  const cli = new VotingDappCLI();
  await cli.initialize();

  const command = args[0];

  try {
    switch (command) {
      case "create":
        if (!args[1]) {
          console.error("❌ Please provide a proposal description");
          return;
        }
        await cli.createProposal(args[1]);
        break;

      case "vote":
        if (!args[1] || !args[2]) {
          console.error(
            "❌ Please provide proposal address and vote (for/against)"
          );
          return;
        }
        const support = args[2].toLowerCase() === "for";
        await cli.vote(args[1], support);
        break;

      case "results":
        if (!args[1]) {
          console.error("❌ Please provide proposal address");
          return;
        }
        await cli.getResults(args[1]);
        break;

      case "list":
        await cli.listAllProposals();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log(
          "Use 'node cli-interact.js' without arguments to see usage"
        );
    }
  } catch (error) {
    console.error("❌ Command failed:", error.message);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
    process.exit(1);
  }
}

// Export for use as module
module.exports = VotingDappCLI;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
