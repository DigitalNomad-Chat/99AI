import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';
import { KbFileService } from './kb-file.service';

@ApiTags('knowledge-base')
@Controller('knowledge-base/:kbId/files')
export class KbFileController {
  constructor(private readonly kbFileService: KbFileService) {}

  @Post('upload')
  @ApiOperation({ summary: '上传文件到知识库' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadFile(
    @Req() req: Request,
    @Param('kbId') kbId: string,
    @UploadedFile() file: any,
    @Query('relativePath') relativePath?: string,
  ) {
    const { id: userId } = req.user as any;
    return this.kbFileService.uploadFile(Number(kbId), file, userId, relativePath);
  }

  @Get()
  @ApiOperation({ summary: '获取知识库文件列表' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findFiles(@Param('kbId') kbId: string, @Query('parentFolderId') parentFolderId?: string) {
    return this.kbFileService.findFiles(
      Number(kbId),
      parentFolderId ? Number(parentFolderId) : undefined,
    );
  }

  @Get('folders')
  @ApiOperation({ summary: '获取知识库文件夹列表' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findFolders(@Param('kbId') kbId: string, @Query('parentFolderId') parentFolderId?: string) {
    return this.kbFileService.findFolders(
      Number(kbId),
      parentFolderId ? Number(parentFolderId) : undefined,
    );
  }

  @Post('folder')
  @ApiOperation({ summary: '创建文件夹' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createFolder(
    @Req() req: Request,
    @Param('kbId') kbId: string,
    @Body() body: { folderName: string; parentFolderId?: number },
  ) {
    const { id: userId } = req.user as any;
    return this.kbFileService.createFolder(
      Number(kbId),
      body.folderName,
      body.parentFolderId,
      userId,
    );
  }

  @Delete(':fileId')
  @ApiOperation({ summary: '删除文件' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteFile(@Req() req: Request, @Param('fileId') fileId: string) {
    const { id: userId, role } = req.user as any;
    return this.kbFileService.deleteFile(Number(fileId), userId, role);
  }

  @Get(':fileId')
  @ApiOperation({ summary: '获取文件状态' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getFileStatus(@Param('fileId') fileId: string) {
    return this.kbFileService.getFileStatus(Number(fileId));
  }

  @Get(':fileId/chunks')
  @ApiOperation({ summary: '获取文件分块内容' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getFileChunks(
    @Param('fileId') fileId: string,
    @Query('page') page = 1,
    @Query('size') size = 20,
  ) {
    return this.kbFileService.getFileChunks(Number(fileId), Number(page), Number(size));
  }

  @Post(':fileId/retry')
  @ApiOperation({ summary: '重新处理文件' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async retryFile(@Req() req: Request, @Param('fileId') fileId: string) {
    const { id: userId, role } = req.user as any;
    return this.kbFileService.retryFile(Number(fileId), userId, role);
  }
}
