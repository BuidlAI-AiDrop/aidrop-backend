// src/utils/storyClient.ts

import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';

const privateKey = process.env.WALLET_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('WALLET_PRIVATE_KEY is not set in environment variables');
}

const account = privateKeyToAccount(`0x${privateKey}`);

const config: StoryConfig = {
  account,
  transport: http(process.env.RPC_PROVIDER_URL),
  chainId: 'aeneid', // ✅ 네트워크에 따라 적절히 설정
};

export const storyClient = StoryClient.newClient(config);
