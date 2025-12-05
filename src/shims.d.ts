interface Window {
	ethereum: {
		request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
		isMetaMask?: boolean;
		isConnected?: () => boolean;
		selectedAddress?: string;
		chainId?: string;
		on?: (event: string, handler: (...args: unknown[]) => void) => void;
		removeListener?: (
			event: string,
			handler: (...args: unknown[]) => void,
		) => void;
	};
}
