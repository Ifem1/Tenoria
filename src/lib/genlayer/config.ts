export const GENLAYER_STUDIONET = {
  name: process.env.NEXT_PUBLIC_GENLAYER_NETWORK_NAME || "GenLayer Studionet",
  chainId: Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61999),
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
  currency: process.env.NEXT_PUBLIC_GENLAYER_CURRENCY || "GEN",
  explorerUrl: process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || "https://explorer-studio.genlayer.com",
};

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "";

export const CONTRACT_CONFIGURED = !!CONTRACT_ADDRESS && CONTRACT_ADDRESS.length > 0;

export const SETUP_NOTICE =
  "GenLayer contract is not configured yet. Deploy Tenoria and add NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS to enable live complaint review.";
