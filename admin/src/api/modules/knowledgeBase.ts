import api from '../index';

export default {
  queryList: (params: any) => api.get('knowledge-base', { params }),
  queryDetail: (id: number) => api.get(`knowledge-base/${id}`),
  create: (data: any) => api.post('knowledge-base', data),
  update: (id: number, data: any) => api.post(`knowledge-base/${id}`, data),
  delete: (id: number) => api.post(`knowledge-base/${id}/delete`, {}),
  queryFiles: (kbId: number, params?: any) => api.get(`knowledge-base/${kbId}/files`, { params }),
  deleteFile: (kbId: number, fileId: number) =>
    api.post(`knowledge-base/${kbId}/files/${fileId}/delete`, {}),
  retryFile: (kbId: number, fileId: number) =>
    api.post(`knowledge-base/${kbId}/files/${fileId}/retry`, {}),
  search: (kbId: number, data: any) => api.post(`knowledge-base/${kbId}/search`, data),
};
