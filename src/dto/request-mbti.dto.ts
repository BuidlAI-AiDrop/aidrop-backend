import { IsString } from 'class-validator';

export class RequestMbtiDto {
  @IsString()
  sourceaddress: string;

  @IsString()
  storyaddress: string;

  @IsString()
  sourcechainId: string;
}
