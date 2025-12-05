<template>
  <button @click="print">Print</button>
  <button @click="send">Send</button>
</template>

<script setup lang="ts">
import {
  RhinestoneSDK,
  type TokenSymbol,
  walletClientToAccount,
} from "@rhinestone/sdk";
import {
  type Address,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
} from "viem";
import { sepolia } from "viem/chains";
import { rhinestoneApiKey } from "../utils";

type Action = "none" | "call" | "transfer_eth" | "transfer_erc20";

const isDev = false;
// const isTestnet = true;
// const isSameChain = false;
// const action: Action = "none";

// const sourceChain = isTestnet ? baseSepolia : base;
// const targetSameChain = isTestnet ? baseSepolia : base;
// const targetCrossChain = isTestnet ? optimismSepolia : optimism;
// const targetChain = isSameChain ? targetSameChain : targetCrossChain;
const sourceChain = sepolia;
const targetChain = sepolia;

const usdcAmount = 4n;
const ethAmount = 3n;

async function print() {
  const initialWalletClient = createWalletClient({
    chain: sourceChain,
    transport: custom(window.ethereum),
  });
  const [signerAddress] = await initialWalletClient.requestAddresses();
  console.info("signerAddress", signerAddress);

  const walletClient = createWalletClient({
    account: signerAddress,
    chain: sourceChain,
    transport: custom(window.ethereum),
  });
  const signerAccount = walletClientToAccount(walletClient);
  console.info("signer", signerAccount.address);
}

async function send() {
  const initialWalletClient = createWalletClient({
    chain: sourceChain,
    transport: custom(window.ethereum),
  });
  const [signerAddress] = await initialWalletClient.requestAddresses();
  console.info("signerAddress", signerAddress);

  const walletClient = createWalletClient({
    account: signerAddress,
    chain: sourceChain,
    transport: custom(window.ethereum),
  });
  const signerAccount = walletClientToAccount(walletClient);
  console.info("signer", signerAccount.address);
  const rhinestone = new RhinestoneSDK({
    apiKey: rhinestoneApiKey,
    endpointUrl: isDev
      ? "https://dev.v1.orchestrator.rhinestone.dev"
      : undefined,
    useDevContracts: isDev,
  });
  const rhinestoneAccount = await rhinestone.createAccount({
    account: {
      type: "nexus",
    },
    owners: {
      type: "ecdsa",
      accounts: [signerAccount],
    },
  });
  const address = rhinestoneAccount.getAddress();
  console.info("address", address);

  // await prefund(sourceChain, address);
  // await prefundUsdc(sourceChain, address)
  await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
  await rhinestoneAccount.deploy(sourceChain);

  console.info("prepare transaction");
  // const { calls } = getTransactionConfig(action);
  const transactionData = await rhinestoneAccount.prepareTransaction({
    sourceChains: [sourceChain],
    targetChain: targetChain,
    calls: [],
    sponsored: true,
  });
  console.info("signing transaction");
  const signedData = await rhinestoneAccount.signTransaction(transactionData);
  console.info("submitting transaction");
  const result = await rhinestoneAccount.submitTransaction(
    signedData,
    undefined
  );
  console.info("waiting for execution", result);
  const status = await rhinestoneAccount.waitForExecution(result, false);
  console.info("status", status);
}

function getTransactionConfig(action: Action) {
  const targetAddress: Address = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

  switch (action) {
    case "none":
      return {
        calls: [],
        tokenRequests: undefined,
      };
    case "call":
      return {
        calls: [
          {
            to: targetAddress,
            value: 0n,
            data: "0xdeadbeef" as const,
          },
        ],
        tokenRequests: undefined,
      };

    case "transfer_eth":
      return {
        calls: [
          {
            to: targetAddress,
            value: ethAmount,
            data: "0x" as const,
          },
        ],
        tokenRequests: [
          {
            address: "ETH" as TokenSymbol,
            amount: ethAmount,
          },
        ],
      };

    case "transfer_erc20":
      return {
        calls: [
          {
            to: "USDC" as TokenSymbol,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [targetAddress, usdcAmount],
            }),
          },
        ],
        tokenRequests: [
          {
            address: "USDC" as TokenSymbol,
            amount: usdcAmount,
          },
        ],
      };

    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}
</script>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
