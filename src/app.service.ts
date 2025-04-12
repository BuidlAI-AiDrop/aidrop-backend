import { Injectable } from '@nestjs/common';
import { Status } from './status.enum';
import { RequestMbtiDto } from './dto/request-mbti.dto';
import axios from 'axios';
import IpCreatorAbi from './abis/IpCreatorAbi.json';
import { walletClient, account } from './utils/walletClient';
import { encodeFunctionData, createPublicClient, http, getAddress } from 'viem';

const CONTRACT_ADDRESS = '0xB3e993c87c17E2B64B03c5d14FE0adE4F6a72d57';

@Injectable()
export class AppService {
  private status: Status = Status.NONE;
  private mbti: string | null = null;
  private tokenUrl: string | null = null;
  private txResult: string | null = null;

  getStatus() {
    return { status: this.status };
  }

  async getResult() {
    let imageUrl = null;

    if (this.tokenUrl) {
      try {
        const response = await axios.get(this.tokenUrl);
        imageUrl = response.data.image;
      } catch (error) {
        console.error('Error fetching token metadata:', error);
      }
    }

    const result = {
      mbti: this.mbti,
      imageUrl: imageUrl,
      txResult: this.txResult,
      status: this.status,
    };

    // Reset all state variables to initial values
    this.status = Status.NONE;
    this.mbti = null;
    this.tokenUrl = null;
    this.txResult = null;

    return result;
  }

  async requestMbti(data: RequestMbtiDto) {
    this.status = Status.ANALYZING;

    try {
      // FOR TETS
      const requestData = {
        sourceAddress: data.sourceaddress,
        storyAddress: data.storyaddress,
        sourceChainId: data.sourcechainId,
      };

      const response = await axios.post(
        'http://localhost:8000/analyze',
        requestData,
      );
      let requestId = response.data?.requestId;

      let isCompleted = false;
      let resultData = null;

      while (!isCompleted) {
        console.log(`Polling for results with requestId: ${requestId}`);

        const pollResponse = await axios.post(
          'http://localhost:8000/api/result',
          {
            requestId: requestId,
          },
        );

        if (pollResponse.data.status === 'completed') {
          isCompleted = true;
          resultData = pollResponse.data;
        } else if (pollResponse.data.status === 'processing') {
          // 3초 대기 후 다시 폴링
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          // 에러 상태 또는 예상치 못한 상태
          throw new Error(`Unexpected status: ${pollResponse.data.status}`);
        }
      }

      this.mbti = (resultData as any)?.mbti || 'Unknown';
      this.tokenUrl = (resultData as any)?.tokenUrl || null;
      // this.mbti = 'ENTP';
      // this.tokenUrl =
      //   'https://aidrop-test.s3.amazonaws.com/profiles/1/0x0bb9aec3b681d0a5a65d1b27c7b7a3e1f8a95d71/bfdebe469b01de67f73637e981cea53f_metadata.json';

      this.status = Status.MININT_IP;
      if (!this.tokenUrl) {
        throw new Error('Token URL is null');
      }

      const txResult = await this.sendTx(data.storyaddress, this.tokenUrl);
      console.log('Story Protocol TX 보내기 완료');
      this.status = Status.COMPLETE;
      this.txResult = txResult;
    } catch (error) {
      console.log(error);
      this.status = Status.NONE;
      this.mbti = null;
      this.tokenUrl = null;
      this.txResult = null;
    }
  }

  private async sendTx(storyAddress: string, tokenUrl: string) {
    try {
      const data = encodeFunctionData({
        abi: IpCreatorAbi.abi,
        functionName: 'mintAndCreateIp',
        args: [getAddress(storyAddress), tokenUrl],
      });

      const hash = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESS,
        data,
        account,
        chain: walletClient.chain,
        gas: 1_000_000n,
      });

      console.log(`Tx sent: ${hash}`);

      // 트랜잭션 receipt 확인
      const publicClient = createPublicClient({
        chain: walletClient.chain,
        transport: http(process.env.RPC_PROVIDER_URL),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        const reason = await this.getRevertReason(publicClient, {
          to: CONTRACT_ADDRESS,
          from: account.address,
          data,
        });
        console.error('Transaction reverted:', reason);
        throw new Error(`Transaction reverted: ${reason}`);
      }

      return hash;
    } catch (err) {
      console.error('Transaction failed:', err);
      throw err;
    }
  }

  private async getRevertReason(
    publicClient: ReturnType<typeof createPublicClient>,
    txData: { to: `0x${string}`; from: `0x${string}`; data: `0x${string}` },
  ): Promise<string> {
    try {
      await publicClient.call(txData);
      return 'Reverted (no reason returned)';
    } catch (e: any) {
      return e?.shortMessage || e?.message || 'Unknown revert reason';
    }
  }
}
