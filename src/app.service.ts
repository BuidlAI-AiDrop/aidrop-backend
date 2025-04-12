import { Injectable } from '@nestjs/common';
import { Status } from './status.enum';
import { RequestMbtiDto } from './dto/request-mbti.dto';
import axios from 'axios';
import IpCreatorAbi from './abis/IpCreatorAbi.json';
import { walletClient, account } from './utils/walletClient';
import { encodeFunctionData, createPublicClient, http, getAddress } from 'viem';

const CONTRACT_ADDRESS = '0xEF0d19D24DB6f7eBD3fB2Afab1e835083625a732';

@Injectable()
export class AppService {
  private status: Status = Status.NONE;
  private mbti: string | null = null; // ✅ 추가
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
      // const response = await axios.post(
      //   'http://localhost:1234/request-analyze',
      //   {
      //     sourceAddress: data.sourceaddress,
      //     storyAddress: data.storyaddress,
      //     sourceChainId: data.sourcechainId,
      //   },
      // );

      // this.mbti = response.data?.mbti || 'Unknown';
      // this.tokenUrl = response.data?.tokenUrl || null;
      this.mbti = 'ENTP';
      this.tokenUrl =
        'https://aidrop-test.s3.ap-southeast-2.amazonaws.com/aa.json';
      this.status = Status.MININT_IP;

      await this.sendTx(data.storyaddress, this.tokenUrl);
      console.log('Story Protocol TX 보내기 완료'); // Story Protocol TX 보내는 함수

      this.status = Status.COMPLETE;
    } catch (error) {
      this.status = Status.NONE;
      this.mbti = null;
      this.tokenUrl = null;
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
