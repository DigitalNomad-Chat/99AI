import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Repository } from 'typeorm';
import { SkillEntity } from './entities/skill.entity';
import { SkillCategoryEntity } from './entities/skill-category.entity';
import { SkillExecutionEntity } from './entities/skill-execution.entity';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @InjectRepository(SkillEntity)
    private readonly skillRepository: Repository<SkillEntity>,
    @InjectRepository(SkillCategoryEntity)
    private readonly skillCategoryRepository: Repository<SkillCategoryEntity>,
    @InjectRepository(SkillExecutionEntity)
    private readonly skillExecutionRepository: Repository<SkillExecutionEntity>,
  ) {}

  // ==================== 技能分类管理 ====================

  async createCategory(body: any) {
    const { name } = body;
    const existing = await this.skillCategoryRepository.findOne({ where: { name } });
    if (existing) {
      throw new HttpException('该分类名称已存在！', HttpStatus.BAD_REQUEST);
    }
    return await this.skillCategoryRepository.save(body);
  }

  async updateCategory(body: any) {
    const { id, name } = body;
    const duplicate = await this.skillCategoryRepository.findOne({
      where: { name, id: Not(id) },
    });
    if (duplicate) {
      throw new HttpException('该分类名称已存在！', HttpStatus.BAD_REQUEST);
    }
    const res = await this.skillCategoryRepository.update({ id }, body);
    if (res.affected > 0) return '修改分类成功';
    throw new HttpException('修改分类失败！', HttpStatus.BAD_REQUEST);
  }

  async deleteCategory(body: any) {
    const { id } = body;
    const skills = await this.skillRepository.find();
    const hasSkills = skills.some(s => {
      const catIds = s.catId.split(',');
      return catIds.includes(id.toString());
    });
    if (hasSkills) {
      throw new HttpException('该分类下存在技能，不可删除！', HttpStatus.BAD_REQUEST);
    }
    const res = await this.skillCategoryRepository.delete(id);
    if (res.affected > 0) return '删除分类成功';
    throw new HttpException('删除分类失败！', HttpStatus.BAD_REQUEST);
  }

  async categoryList(query: any) {
    const { page = 1, size = 100, name, status } = query;
    const where: any = {};
    if (name) where.name = Like(`%${name}%`);
    if ([0, 1, '0', '1'].includes(status)) where.status = status;

    const [rows, count] = await this.skillCategoryRepository.findAndCount({
      where,
      order: { order: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    // 统计每个分类下的技能数量
    const allSkills = await this.skillRepository.find({ where: { status: 1 } });
    const catCountMap: Record<number, number> = {};
    allSkills.forEach(skill => {
      const catIds = skill.catId.split(',').map(Number);
      catIds.forEach(catId => {
        catCountMap[catId] = (catCountMap[catId] || 0) + 1;
      });
    });

    rows.forEach((item: any) => {
      item.skillCount = catCountMap[item.id] || 0;
    });

    return { rows, count };
  }

  // ==================== 技能管理 ====================

  async createSkill(body: any) {
    const { name, catId } = body;
    const existing = await this.skillRepository.findOne({ where: { name } });
    if (existing) {
      throw new HttpException('该技能名称已存在！', HttpStatus.BAD_REQUEST);
    }

    // 验证分类ID
    if (catId) {
      const catIds = catId.split(',');
      for (const id of catIds) {
        const numId = Number(id);
        if (isNaN(numId)) continue;
        const cat = await this.skillCategoryRepository.findOne({ where: { id: numId } });
        if (!cat) {
          throw new HttpException(`分类ID ${id} 不存在！`, HttpStatus.BAD_REQUEST);
        }
      }
    }

    const saveData = { ...body };
    if (!saveData.id || isNaN(Number(saveData.id))) {
      delete saveData.id;
    }
    saveData.isPublic = saveData.isPublic ?? false;
    saveData.status = isNaN(Number(saveData.status)) ? 1 : saveData.status;
    saveData.order = isNaN(Number(saveData.order)) ? 100 : saveData.order;

    return await this.skillRepository.save(saveData);
  }

  async updateSkill(body: any) {
    const { id, name, catId } = body;
    if (!id || isNaN(Number(id))) {
      throw new HttpException('无效的技能ID！', HttpStatus.BAD_REQUEST);
    }

    const duplicate = await this.skillRepository.findOne({
      where: { name, id: Not(id) },
    });
    if (duplicate) {
      throw new HttpException('该技能名称已存在！', HttpStatus.BAD_REQUEST);
    }

    if (catId) {
      const catIds = catId.split(',');
      for (const cid of catIds) {
        const cat = await this.skillCategoryRepository.findOne({ where: { id: Number(cid) } });
        if (!cat) {
          throw new HttpException(`分类ID ${cid} 不存在！`, HttpStatus.BAD_REQUEST);
        }
      }
    }

    const res = await this.skillRepository.update({ id }, body);
    if (res.affected > 0) return '修改技能成功';
    throw new HttpException('修改技能失败！', HttpStatus.BAD_REQUEST);
  }

  async deleteSkill(body: any) {
    const { id } = body;
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new HttpException('该技能不存在！', HttpStatus.BAD_REQUEST);
    }
    // 内置技能不允许删除
    if (skill.isBuiltIn) {
      throw new HttpException('内置技能不允许删除！', HttpStatus.BAD_REQUEST);
    }
    const res = await this.skillRepository.delete(id);
    if (res.affected > 0) return '删除技能成功';
    throw new HttpException('删除技能失败！', HttpStatus.BAD_REQUEST);
  }

  async skillList(query: any) {
    const { page = 1, size = 10, name, status, catId, type } = query;
    const where: any = {};
    if (name) where.name = Like(`%${name}%`);
    if (status !== undefined) where.status = status;
    if (type) where.type = type;

    if (catId) {
      const allSkills = await this.skillRepository.find({ where });
      const filtered = allSkills.filter(s => {
        const catIds = s.catId.split(',');
        return catIds.includes(catId.toString());
      });
      const start = (page - 1) * size;
      const rows = filtered.slice(start, start + size);
      return { rows, count: filtered.length };
    }

    const [rows, count] = await this.skillRepository.findAndCount({
      where,
      order: { order: 'DESC', id: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    // 添加分类名称
    const allCats = await this.skillCategoryRepository.find();
    const catsMap: Record<number, string> = {};
    allCats.forEach(cat => {
      catsMap[cat.id] = cat.name;
    });

    rows.forEach((item: any) => {
      const catIds = item.catId.split(',').map(Number);
      const catNames = catIds.map((id: number) => catsMap[id]).filter((name: string) => name);
      item.catName = catNames.join(', ');
    });

    return { rows, count };
  }

  async frontSkillList(query: any, req?: any) {
    const { page = 1, size = 100, catId, keyword } = query;
    const where: any = {
      status: 1,
      isPublic: true,
    };

    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }

    let allSkills = await this.skillRepository.find({ where, order: { order: 'DESC' } });

    if (catId) {
      allSkills = allSkills.filter(s => {
        const catIds = s.catId.split(',');
        return catIds.includes(catId.toString());
      });
    }

    // 获取分类名称
    const allCats = await this.skillCategoryRepository.find();
    const catsMap: Record<number, string> = {};
    allCats.forEach(cat => {
      catsMap[cat.id] = cat.name;
    });

    const start = (page - 1) * size;
    const rows = allSkills.slice(start, start + size).map(item => {
      const catIds = item.catId.split(',').map(Number);
      const catNames = catIds.map((id: number) => catsMap[id]).filter((name: string) => name);
      return {
        ...item,
        catName: catNames.join(', '),
        systemPrompt: undefined, // 前端不返回 systemPrompt
        executionConfig: undefined,
      };
    });

    return { rows, count: allSkills.length };
  }

  async getSkillDetail(id: number) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new HttpException('技能不存在！', HttpStatus.BAD_REQUEST);
    }
    return skill;
  }

  // ==================== 技能执行记录 ====================

  async createExecutionRecord(skillId: number, userId: number, inputParams: any, groupId?: number) {
    const record = this.skillExecutionRepository.create({
      skillId,
      userId,
      groupId: groupId || null,
      inputParams: JSON.stringify(inputParams),
      status: 'pending',
    });
    return await this.skillExecutionRepository.save(record);
  }

  async updateExecutionRecord(id: number, updates: Partial<SkillExecutionEntity>) {
    await this.skillExecutionRepository.update({ id }, updates);
  }

  async executionList(query: any, req?: any) {
    const { page = 1, size = 20, skillId, status } = query;
    const where: any = {};
    if (req?.user?.role !== 'super') {
      where.userId = req.user.id;
    }
    if (skillId) where.skillId = skillId;
    if (status) where.status = status;

    const [rows, count] = await this.skillExecutionRepository.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    // 补充技能名称
    const skillIds = [...new Set(rows.map(r => r.skillId))];
    const skills = await this.skillRepository.find({
      where: { id: In(skillIds) },
      select: ['id', 'name', 'coverImg'],
    });
    const skillMap: Record<number, any> = {};
    skills.forEach(s => {
      skillMap[s.id] = s;
    });

    rows.forEach((item: any) => {
      item.skillName = skillMap[item.skillId]?.name || '未知技能';
      item.skillCoverImg = skillMap[item.skillId]?.coverImg || '';
    });

    return { rows, count };
  }

  // ==================== 使用统计 ====================

  async incrementUseCount(skillId: number) {
    const skill = await this.skillRepository.findOne({ where: { id: skillId } });
    if (skill) {
      skill.useCount += 1;
      await this.skillRepository.save(skill);
    }
  }
}
