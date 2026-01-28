import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateArticleDto {
  @ApiProperty({ description: '写作需求描述', example: '写一篇关于人工智能发展历史的文章' })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
