import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AiCommand {
  REWRITE = 'rewrite',
  EXPAND = 'expand',
  SUMMARIZE = 'summarize',
  TRANSLATE = 'translate',
  POLISH = 'polish',
}

export class AiEditDto {
  @ApiProperty({ description: '要编辑的内容', example: '这是一段需要改写的文字。' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'AI命令类型',
    enum: AiCommand,
    example: AiCommand.REWRITE,
  })
  @IsEnum(AiCommand)
  @IsNotEmpty()
  command: AiCommand;

  @ApiProperty({
    description: '自定义提示词（可选，覆盖默认prompt）',
    required: false,
  })
  @IsString()
  @IsOptional()
  prompt?: string;
}
