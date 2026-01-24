import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'app' })
export class AppEntity extends BaseEntity {
  @Column({ unique: true, comment: 'App应用名称' })
  name: string;

  @Column({ comment: 'App分类Id列表，多个分类Id以逗号分隔', type: 'text' })
  catId: string;

  @Column({ comment: 'App应用描述信息' })
  des: string;

  @Column({ comment: 'App应用预设场景信息', type: 'text' })
  preset: string;

  @Column({ comment: 'App应用封面图片', nullable: true, type: 'text' })
  coverImg: string;

  @Column({ comment: 'App应用排序、数字越大越靠前', default: 100 })
  order: number;

  @Column({ comment: 'App应用是否启用中 0：禁用 1：启用', default: 1 })
  status: number;

  @Column({ comment: 'App示例数据', nullable: true, type: 'text' })
  demoData: string;

  @Column({ comment: 'App应用角色 system  user', default: 'system' })
  role: string;

  @Column({ comment: 'App应用是否是GPTs', default: '0' })
  isGPTs: number;

  @Column({ comment: 'App应用是否是固定使用模型', default: '0' })
  isFixedModel: number;

  @Column({ comment: 'App应用使用的模型', type: 'text' })
  appModel: string;

  @Column({ comment: 'GPTs 的调用ID', default: '' })
  gizmoID: string;

  @Column({ comment: 'App是否共享到应用广场', default: false })
  public: boolean;

  @Column({ comment: '用户Id', nullable: true })
  userId: number;

  @Column({ comment: '是否使用flowith模型', default: 0 })
  isFlowith: number;

  @Column({ comment: 'flowith模型ID', nullable: true })
  flowithId: string;

  @Column({ comment: 'flowith模型名称', nullable: true })
  flowithName: string;

  @Column({ comment: 'flowith模型Key', nullable: true })
  flowithKey: string;

  @Column({ comment: 'App背景图', nullable: true, type: 'text' })
  backgroundImg: string;

  @Column({ comment: 'App提问模版', nullable: true, type: 'text' })
  prompt: string;

  @Column({ comment: '应用类型: 0-智能体 1-FastGPT工作流 2-Dify工作流 3-n8n工作流', default: 0 })
  appType: number;

  @Column({ comment: '工作流API地址', nullable: true, type: 'text' })
  workflowApiUrl: string;

  @Column({ comment: '工作流API Key', nullable: true, type: 'text' })
  workflowApiKey: string;

  @Column({ comment: '工作流AppId/FlowId', nullable: true, type: 'text' })
  workflowAppId: string;
}
