import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API Key 名称/备注', required: false, example: '飞书多维表专用' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
