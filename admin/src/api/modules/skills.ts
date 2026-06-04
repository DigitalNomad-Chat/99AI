import api from '../index';

export default {
  // 分类管理
  queryCategories: (params?: any) => api.get('skills/category/list', { params }),
  createCategory: (data: any) => api.post('skills/category/create', data),
  updateCategory: (data: any) => api.post('skills/category/update', data),
  deleteCategory: (data: any) => api.post('skills/category/delete', data),

  // 技能管理
  querySkills: (params?: any) => api.get('skills/list', { params }),
  createSkill: (data: any) => api.post('skills/create', data),
  updateSkill: (data: any) => api.post('skills/update', data),
  deleteSkill: (data: any) => api.post('skills/delete', data),
  querySkillDetail: (id: number) => api.get('skills/detail', { params: { id } }),

  // 内置技能
  initBuiltIn: () => api.post('skills/init-built-in', {}),
  queryBuiltInDefinitions: () => api.get('skills/built-in/definitions'),

  // 执行记录
  queryExecutions: (params?: any) => api.get('skills/execution/list', { params }),
};
