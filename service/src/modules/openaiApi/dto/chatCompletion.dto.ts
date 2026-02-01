import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessage {
  @ApiProperty({ description: '消息角色', example: 'user' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: '消息内容', example: '你好' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatCompletionDto {
  @ApiProperty({ description: '模型名称', example: 'gpt-4o' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ description: '对话消息列表', type: [ChatMessage] })
  @IsArray()
  @IsNotEmpty()
  messages: ChatMessage[];

  @ApiProperty({ description: '生成最大token数', required: false, example: 2048 })
  @IsOptional()
  max_tokens?: number;

  @ApiProperty({ description: '采样温度', required: false, example: 0.7 })
  @IsOptional()
  temperature?: number;

  @ApiProperty({ description: '是否流式输出', required: false, example: true })
  @IsOptional()
  stream?: boolean;
}
