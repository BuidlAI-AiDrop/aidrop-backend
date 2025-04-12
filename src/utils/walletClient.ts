import { http, createWalletClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { storyAeneid } from 'viem/chains';
import 'dotenv/config'; // 네트워크에 맞게 바꿔줘 (Story Testnet chain 있으면 그걸로)

const privateKey = process.env.WALLET_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('WALLET_PRIVATE_KEY is missing');
}

export const account = privateKeyToAccount(`0x${privateKey}`);

export const walletClient: WalletClient = createWalletClient({
  account,
  chain: storyAeneid, // 또는 story chain ID (chainId: 999999 같은 커스텀 값)
  transport: http(process.env.RPC_PROVIDER_URL),
});
