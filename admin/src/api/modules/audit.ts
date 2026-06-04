import api from '../index';

export default {
  queryList(params?: any) {
    return api.get('/audit/list', { params });
  },
  cleanup(data: { days?: number }) {
    return api.post('/audit/cleanup', data);
  },
};
