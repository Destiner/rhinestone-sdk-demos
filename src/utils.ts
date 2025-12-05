import {
	http,
	type Address,
	type Chain,
	type Hex,
	concat,
	createPublicClient,
	createWalletClient,
	encodeFunctionData,
	erc20Abi,
	keccak256,
	parseEther,
	parseUnits,
	toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
	arbitrum,
	arbitrumSepolia,
	base,
	baseSepolia,
	optimism,
	optimismSepolia,
	sepolia,
} from "viem/chains";

const fundingPrivateKey = import.meta.env.VITE_FUNDING_PRIVATE_KEY as Hex;
if (!fundingPrivateKey) {
	throw new Error("FUNDING_PRIVATE_KEY is not set");
}

const rhinestoneApiKey = import.meta.env.VITE_RHINESTONE_API_KEY as string;
if (!rhinestoneApiKey) {
	throw new Error("RHINESTONE_API_KEY is not set");
}

const pimlicoApiKey = import.meta.env.VITE_PIMLICO_API_KEY as string;
if (!pimlicoApiKey) {
	throw new Error("PIMLICO_API_KEY is not set");
}

function toKey(seed: string, index: number) {
	return keccak256(concat([toHex(seed), toHex(index)]));
}

function getUsdcAddress(chain: Chain): Address {
	switch (chain.id) {
		case sepolia.id:
			return "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
		case baseSepolia.id:
			return "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
		case arbitrumSepolia.id:
			return "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
		case optimismSepolia.id:
			return "0x5fd84259d66Cd46123540766Be93DFE6D43130D7";
		case base.id:
			return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
		case arbitrum.id:
			return "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
		case optimism.id:
			return "0x0b2c639c533813f4aa9d7837caf62653d097ff85";
		default:
			throw new Error("Unsupported chain");
	}
}

function getWethAddress(chain: Chain) {
	switch (chain.id) {
		case sepolia.id:
			return "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
		case baseSepolia.id:
			return "0x4200000000000000000000000000000000000006";
		case arbitrumSepolia.id:
			return "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73";
		case optimismSepolia.id:
			return "0x4200000000000000000000000000000000000006";
		case base.id:
			return "0x4200000000000000000000000000000000000006";
		case arbitrum.id:
			return "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
		case optimism.id:
			return "0x4200000000000000000000000000000000000006";
		default:
			throw new Error("Unsupported chain");
	}
}

function getTransport(chain: Chain) {
	if (chain.id === sepolia.id) {
		return http("https://ethereum-sepolia-rpc.publicnode.com");
	}
	return http();
}

async function prefund(chain: Chain, address: Address, amount?: bigint) {
	const fundingAccount = privateKeyToAccount(fundingPrivateKey);
	const publicClient = createPublicClient({
		chain,
		transport: getTransport(chain),
	});
	const fundingClient = createWalletClient({
		account: fundingAccount,
		chain,
		transport: getTransport(chain),
	});
	const ethBalance = await publicClient.getBalance({
		address,
	});
	const fundAmount = amount
		? amount
		: chain.testnet
			? parseEther("0.001")
			: parseEther("0.00005");
	if (ethBalance < fundAmount / 2n) {
		const txHash = await fundingClient.sendTransaction({
			to: address,
			value: fundAmount,
		});
		await publicClient.waitForTransactionReceipt({ hash: txHash });
	}
}

async function prefundWeth(chain: Chain, address: Address, amount?: bigint) {
	const fundingAccount = privateKeyToAccount(fundingPrivateKey);
	const publicClient = createPublicClient({
		chain,
		transport: getTransport(chain),
	});
	const fundingClient = createWalletClient({
		account: fundingAccount,
		chain,
		transport: getTransport(chain),
	});
	const wethAddress = getWethAddress(chain);
	const wethBalance = await publicClient.readContract({
		address: wethAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: [address],
	});
	const fundAmount = amount
		? amount
		: chain.testnet
			? parseEther("0.002")
			: parseEther("0.00022");
	// parseEther('0.00005')
	if (wethBalance < fundAmount / 2n) {
		const wrapTxHash = await fundingClient.sendTransaction({
			to: wethAddress,
			data: encodeFunctionData({
				abi: [
					{
						inputs: [],
						name: "deposit",
						outputs: [],
						stateMutability: "payable",
						type: "function",
					},
				],
				functionName: "deposit",
				args: [],
			}),
			value: fundAmount,
		});
		await publicClient.waitForTransactionReceipt({ hash: wrapTxHash });
		const txHash = await fundingClient.sendTransaction({
			to: wethAddress,
			data: encodeFunctionData({
				abi: erc20Abi,
				functionName: "transfer",
				args: [address, fundAmount],
			}),
		});
		await publicClient.waitForTransactionReceipt({ hash: txHash });
	}
}

async function prefundUsdc(chain: Chain, address: Address, amount?: bigint) {
	const fundingAccount = privateKeyToAccount(fundingPrivateKey);
	const publicClient = createPublicClient({
		chain,
		transport: getTransport(chain),
	});
	const fundingClient = createWalletClient({
		account: fundingAccount,
		chain,
		transport: getTransport(chain),
	});
	const usdcAddress = getUsdcAddress(chain);
	const usdcBalance = await publicClient.readContract({
		address: usdcAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: [address],
	});
	const fundAmount = amount
		? amount
		: chain.testnet
			? parseUnits("0.1", 6)
			: // : parseUnits('0.1', 6)
				parseUnits("1", 6);
	if (usdcBalance < fundAmount / 2n) {
		const txHash = await fundingClient.sendTransaction({
			to: usdcAddress,
			data: encodeFunctionData({
				abi: erc20Abi,
				functionName: "transfer",
				args: [address, fundAmount],
			}),
		});
		await publicClient.waitForTransactionReceipt({ hash: txHash });
	}
}

async function relayTransaction(chain: Chain, to: Address, data: Hex) {
	const fundingAccount = privateKeyToAccount(fundingPrivateKey);
	const publicClient = createPublicClient({
		chain,
		transport: getTransport(chain),
	});
	const fundingClient = createWalletClient({
		account: fundingAccount,
		chain,
		transport: getTransport(chain),
	});
	const txHash = await fundingClient.sendTransaction({
		to,
		data,
	});
	console.info("relaying transaction", txHash);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
}

export {
	toKey,
	getWethAddress,
	getUsdcAddress,
	getTransport,
	prefund,
	prefundWeth,
	prefundUsdc,
	relayTransaction,
	fundingPrivateKey,
	rhinestoneApiKey,
	pimlicoApiKey,
};
