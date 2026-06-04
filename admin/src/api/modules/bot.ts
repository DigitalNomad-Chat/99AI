import api from '@/api';

export function getBotInstances() {
  return api.get('/bot/instances');
}

export function createBotInstance(data: any) {
  return api.post('/bot/instances', data);
}

export function updateBotInstance(id: number, data: any) {
  return api.put(`/bot/instances/${id}`, data);
}

export function deleteBotInstance(id: number) {
  return api.delete(`/bot/instances/${id}`);
}

export function getBotMessages(id: number, params: { page?: number; size?: number }) {
  return api.get(`/bot/instances/${id}/messages`, { params });
}
