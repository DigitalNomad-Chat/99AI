import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AiContinueDto {
  @ApiProperty({ description: '当前文章内容', example: '人工智能是计算机科学...' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
