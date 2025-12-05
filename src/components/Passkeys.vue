<template>
  <button @click="print">Print</button>
  <button @click="send">Send</button>
</template>

<script setup lang="ts">
import { RhinestoneSDK } from "@rhinestone/sdk";
import {
  type P256Credential,
  createWebAuthnCredential,
  toWebAuthnAccount,
} from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import { prefund, rhinestoneApiKey } from "../utils";

const PASSKEY_STORAGE_KEY = "rhinestone.passkey";

// Helper function to convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const length = bytes.byteLength;
  for (let i = 0; i < length; i++) {
    // Uint8Array[i] always returns a number (0-255), never undefined
    const byte: number = bytes[i] as number;
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Get or create passkey credential
// Returns a credential object compatible with toWebAuthnAccount
async function getOrCreatePasskeyCredential(): Promise<{
  id: P256Credential["id"];
  publicKey: P256Credential["publicKey"];
}> {
  // Check localStorage for existing credential
  const stored = localStorage.getItem(PASSKEY_STORAGE_KEY);

  if (stored) {
    try {
      const credentialData = JSON.parse(stored);

      // Validate that we have the required fields
      if (credentialData.id && credentialData.publicKey) {
        console.info(
          "Found stored passkey credential, reusing existing credential"
        );

        // The credential ID is stored as a string (either original string or base64)
        // We need to determine if it needs to be converted back to Uint8Array
        // For now, use it as-is since P256Credential['id'] accepts string
        // The WebAuthn API will handle the conversion internally when needed
        return {
          id: credentialData.id as P256Credential["id"],
          publicKey: credentialData.publicKey as P256Credential["publicKey"],
        };
      }
    } catch (error) {
      console.warn(
        "Failed to parse stored credential, creating new one",
        error
      );
    }
  }

  // No stored credential found, create a new one
  console.info(
    "No stored credential found, creating/registering new passkey credential"
  );
  const credential = await createWebAuthnCredential({
    name: "Rhinestone Passkey",
  });

  // Store credential metadata
  // The credential from createWebAuthnCredential is a P256Credential
  // which has id and publicKey properties
  // Store the credential ID - it might be a string or Uint8Array
  let credentialId: string;
  if (typeof credential.id === "string") {
    credentialId = credential.id;
  } else {
    // If it's Uint8Array, convert to base64 for storage
    credentialId = uint8ArrayToBase64(credential.id as Uint8Array);
  }

  const credentialData = {
    id: credentialId,
    publicKey: credential.publicKey,
  };
  localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(credentialData));
  console.info("Stored passkey credential in localStorage", credentialData);

  // Return only id and publicKey as that's what toWebAuthnAccount needs
  return {
    id: credential.id,
    publicKey: credential.publicKey,
  };
}

async function print() {
  const credential = await getOrCreatePasskeyCredential();
  const passkeyAccount = toWebAuthnAccount({ credential });
  console.info("passkey account", passkeyAccount);
  console.info("public key", passkeyAccount.publicKey);
}

async function send() {
  // Get or create passkey credential
  const credential = await getOrCreatePasskeyCredential();
  const passkeyAccount = toWebAuthnAccount({ credential });
  console.info("passkey account", passkeyAccount);
  console.info("public key", passkeyAccount.publicKey);

  const rhinestone = new RhinestoneSDK({
    apiKey: rhinestoneApiKey,
  });

  const rhinestoneAccount = await rhinestone.createAccount({
    account: {
      type: "nexus",
    },
    owners: {
      type: "passkey",
      accounts: [passkeyAccount],
    },
  });
  const address = rhinestoneAccount.getAddress();
  console.info("address", address);

  await prefund(baseSepolia, address);
  await new Promise((resolve) => setTimeout(resolve, 5 * 1000));

  console.info("prepare transaction");
  const transactionData = await rhinestoneAccount.prepareTransaction({
    chain: baseSepolia,
    calls: [
      {
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        value: 0n,
        data: "0xdeadbeef" as const,
      },
    ],
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
</script>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
