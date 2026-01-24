import { Module } from '@nestjs/common';
import { FastGPTAdapter, WorkflowAdapterManager } from './workflow.adapter';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';

/**
 * 工作流模块
 * 提供工作流平台（FastGPT、Dify、n8n等）的接入能力
 */
@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, FastGPTAdapter, WorkflowAdapterManager],
  exports: [WorkflowService, FastGPTAdapter, WorkflowAdapterManager],
})
export class WorkflowModule {}
