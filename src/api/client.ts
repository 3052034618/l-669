import axios from 'axios';
import type {
  User,
  Project,
  Work,
  MixingTask,
  Master,
  Notification,
  RoyaltySplit,
  RoyaltyReport,
  LoginRequest,
  AuthResponse,
  ApiResponse
} from '../../shared/types.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: LoginRequest): Promise<ApiResponse<AuthResponse>> =>
    apiClient.post('/auth/login', data).then(res => res.data),
  
  register: (data: any): Promise<ApiResponse<User>> =>
    apiClient.post('/auth/register', data).then(res => res.data),
  
  getMe: (): Promise<ApiResponse<User>> =>
    apiClient.get('/auth/me').then(res => res.data),
  
  getUsers: (role?: string): Promise<ApiResponse<User[]>> =>
    apiClient.get('/auth/users', { params: { role } }).then(res => res.data)
};

export const projectApi = {
  getProjects: (): Promise<ApiResponse<Project[]>> =>
    apiClient.get('/projects').then(res => res.data),
  
  createProject: (data: { name: string; description: string }): Promise<ApiResponse<Project>> =>
    apiClient.post('/projects', data).then(res => res.data),
  
  getProject: (id: number): Promise<ApiResponse<Project>> =>
    apiClient.get(`/projects/${id}`).then(res => res.data),
  
  addMember: (projectId: number, data: { userId: number; role: string; permissions: string[] }): Promise<ApiResponse<any>> =>
    apiClient.post(`/projects/${projectId}/members`, data).then(res => res.data),
  
  createBackup: (projectId: number): Promise<ApiResponse<any>> =>
    apiClient.post(`/projects/${projectId}/backup`).then(res => res.data)
};

export const workApi = {
  getWorks: (projectId?: number): Promise<ApiResponse<Work[]>> =>
    apiClient.get('/works', { params: { projectId } }).then(res => res.data),
  
  uploadWork: (formData: FormData): Promise<ApiResponse<Work>> =>
    apiClient.post('/works', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  
  checkSimilarity: (id: number): Promise<ApiResponse<{ similarity: number; isLocked: boolean }>> =>
    apiClient.post(`/works/${id}/check-similarity`).then(res => res.data)
};

export const mixingApi = {
  getAvailableTasks: (): Promise<ApiResponse<MixingTask[]>> =>
    apiClient.get('/mixing-tasks/available').then(res => res.data),
  
  getMyTasks: (): Promise<ApiResponse<MixingTask[]>> =>
    apiClient.get('/mixing-tasks/my').then(res => res.data),
  
  createTask: (data: { workId: number; budget: number; deadline?: string; minRatingRequired?: number }): Promise<ApiResponse<MixingTask>> =>
    apiClient.post('/mixing-tasks', data).then(res => res.data),
  
  acceptTask: (taskId: number): Promise<ApiResponse<MixingTask>> =>
    apiClient.post(`/mixing-tasks/${taskId}/accept`).then(res => res.data),
  
  signAgreement: (taskId: number, role: string): Promise<ApiResponse<any>> =>
    apiClient.post(`/mixing-tasks/${taskId}/sign`, { role }).then(res => res.data),
  
  getAgreement: (taskId: number): Promise<ApiResponse<any>> =>
    apiClient.get(`/mixing-tasks/${taskId}/agreement`).then(res => res.data)
};

export const masterApi = {
  uploadMaster: (taskId: number, formData: FormData): Promise<ApiResponse<Master>> =>
    apiClient.post(`/mastering/${taskId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  
  confirmMaster: (id: number): Promise<ApiResponse<any>> =>
    apiClient.post(`/mastering/${id}/confirm`).then(res => res.data),
  
  getMasters: (taskId?: number): Promise<ApiResponse<Master[]>> =>
    apiClient.get('/mastering', { params: { taskId } }).then(res => res.data)
};

export const royaltyApi = {
  setSplits: (workId: number, splits: { userId: number; percentage: number }[]): Promise<ApiResponse<any>> =>
    apiClient.put(`/royalty/splits/${workId}`, { splits }).then(res => res.data),
  
  getSplits: (workId: number): Promise<ApiResponse<RoyaltySplit[]>> =>
    apiClient.get(`/royalty/splits/${workId}`).then(res => res.data),
  
  getReports: (workId?: number, month?: string): Promise<ApiResponse<RoyaltyReport[]>> =>
    apiClient.get('/royalty/reports', { params: { workId, month } }).then(res => res.data),
  
  generateReport: (workId: number, month: string): Promise<ApiResponse<RoyaltyReport>> =>
    apiClient.post('/royalty/reports/generate', { workId, month }).then(res => res.data)
};

export const notificationApi = {
  getNotifications: (): Promise<ApiResponse<Notification[]>> =>
    apiClient.get('/notifications').then(res => res.data),
  
  getUnreadCount: (): Promise<ApiResponse<{ count: number }>> =>
    apiClient.get('/notifications/unread-count').then(res => res.data),
  
  markAsRead: (id: number): Promise<ApiResponse<any>> =>
    apiClient.put(`/notifications/${id}/read`).then(res => res.data),
  
  markAllAsRead: (): Promise<ApiResponse<any>> =>
    apiClient.put('/notifications/read-all').then(res => res.data)
};

export const adminApi = {
  getMaterials: (): Promise<ApiResponse<any[]>> =>
    apiClient.get('/admin/materials').then(res => res.data),
  
  createMaterial: (formData: FormData): Promise<ApiResponse<any>> =>
    apiClient.post('/admin/materials', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  
  updateMaterial: (id: number, data: any): Promise<ApiResponse<any>> =>
    apiClient.put(`/admin/materials/${id}`, data).then(res => res.data),
  
  deleteMaterial: (id: number): Promise<ApiResponse<any>> =>
    apiClient.delete(`/admin/materials/${id}`).then(res => res.data),
  
  getStats: (): Promise<ApiResponse<any>> =>
    apiClient.get('/admin/stats').then(res => res.data),
  
  triggerBackup: (): Promise<ApiResponse<any>> =>
    apiClient.post('/admin/trigger-backup').then(res => res.data),
  
  triggerSettlement: (): Promise<ApiResponse<any>> =>
    apiClient.post('/admin/trigger-settlement').then(res => res.data)
};

export default apiClient;
