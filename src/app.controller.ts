import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { RequestMbtiDto } from './dto/request-mbti.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('request-mbti')
  async requestMbti(@Body() body: RequestMbtiDto) {
    await this.appService.requestMbti(body);
    return { message: 'MBTI analysis started' };
  }

  @Get('status')
  getStatus() {
    return this.appService.getStatus();
  }

  @Get('result')
  async getResult() {
    const result = await this.appService.getResult();
    return result;
  }
}
