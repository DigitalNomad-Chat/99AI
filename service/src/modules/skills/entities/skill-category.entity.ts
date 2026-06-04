import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'skill_categories' })
export class SkillCategoryEntity extends BaseEntity {
  @Column({ unique: true, comment: '技能分类名称' })
  name: string;

  @Column({ comment: '分类描述', nullable: true })
  description: string;

  @Column({ comment: '分类图标', nullable: true })
  icon: string;

  @Column({ comment: '分类排序、数字越大越靠前', default: 100 })
  order: number;

  @Column({ comment: '分类是否启用 0：禁用 1：启用', default: 1 })
  status: number;

  @Column({ comment: '分类是否为会员专属 0：否 1：是', default: 0 })
  isMember: number;

  @Column({ comment: '非会员是否隐藏 0：否 1：是', default: 0 })
  hideFromNonMember: number;
}
