import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorVotingDapp } from "../target/types/anchor_voting_dapp";
import { expect } from "chai";

describe("anchor-voting-dapp", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .AnchorVotingDapp as Program<AnchorVotingDapp>;

  // Test accounts
  const proposer = anchor.web3.Keypair.generate();
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();

  // Proposal PDA
  let proposalPda: anchor.web3.PublicKey;
  let proposalBump: number;

  before(async () => {
    // Fund test accounts
    await provider.connection.requestAirdrop(
      proposer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      voter1.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      voter2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrop confirmations
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  it("Creates a proposal", async () => {
    const description = "Should we implement feature X?";
    const timestamp = Math.floor(Date.now() / 1000);

    // Find PDA for proposal
    [proposalPda, proposalBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        proposer.publicKey.toBuffer(),
        Buffer.from(timestamp.toString().padStart(8, "0"), "hex"),
      ],
      program.programId
    );

    // Create proposal
    await program.methods
      .createProposal(description)
      .accounts({
        proposal: proposalPda,
        proposer: proposer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([proposer])
      .rpc();

    // Fetch and verify proposal
    const proposalAccount = await program.account.proposal.fetch(proposalPda);

    expect(proposalAccount.description).to.equal(description);
    expect(proposalAccount.proposer.toString()).to.equal(
      proposer.publicKey.toString()
    );
    expect(proposalAccount.votesFor.toNumber()).to.equal(0);
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(0);
  });

  it("Allows voting FOR a proposal", async () => {
    // Find voter record PDA
    const [voterRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        proposalPda.toBuffer(),
        voter1.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Cast vote FOR
    await program.methods
      .vote(true)
      .accounts({
        proposal: proposalPda,
        voterRecord: voterRecordPda,
        voter: voter1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    // Verify vote was recorded
    const proposalAccount = await program.account.proposal.fetch(proposalPda);
    const voterRecord = await program.account.voterRecord.fetch(voterRecordPda);

    expect(proposalAccount.votesFor.toNumber()).to.equal(1);
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(0);
    expect(voterRecord.voted).to.be.true;
    expect(voterRecord.support).to.be.true;
  });

  it("Allows voting AGAINST a proposal", async () => {
    // Find voter record PDA
    const [voterRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        proposalPda.toBuffer(),
        voter2.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Cast vote AGAINST
    await program.methods
      .vote(false)
      .accounts({
        proposal: proposalPda,
        voterRecord: voterRecordPda,
        voter: voter2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    // Verify vote was recorded
    const proposalAccount = await program.account.proposal.fetch(proposalPda);
    const voterRecord = await program.account.voterRecord.fetch(voterRecordPda);

    expect(proposalAccount.votesFor.toNumber()).to.equal(1);
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(1);
    expect(voterRecord.voted).to.be.true;
    expect(voterRecord.support).to.be.false;
  });

  it("Prevents double voting", async () => {
    // Find voter record PDA (voter1 trying to vote again)
    const [voterRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        proposalPda.toBuffer(),
        voter1.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .vote(false)
        .accounts({
          proposal: proposalPda,
          voterRecord: voterRecordPda,
          voter: voter1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();

      expect.fail("Should have thrown an error for double voting");
    } catch (error) {
      expect(error.toString()).to.include("already been created");
    }
  });

  it("Prevents proposer from voting on own proposal", async () => {
    // Find voter record PDA for proposer
    const [voterRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        proposalPda.toBuffer(),
        proposer.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .vote(true)
        .accounts({
          proposal: proposalPda,
          voterRecord: voterRecordPda,
          voter: proposer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([proposer])
        .rpc();

      expect.fail("Should have thrown an error for proposer voting");
    } catch (error) {
      expect(error.toString()).to.include("ProposerCannotVote");
    }
  });

  it("Gets proposal results", async () => {
    await program.methods
      .getResults()
      .accounts({
        proposal: proposalPda,
      })
      .rpc();

    // Verify final state
    const proposalAccount = await program.account.proposal.fetch(proposalPda);
    expect(proposalAccount.votesFor.toNumber()).to.equal(1);
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(1);
  });
});
