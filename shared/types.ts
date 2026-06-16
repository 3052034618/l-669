export type UserRole = 'producer' | 'engineer' | 'songwriter' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  username?: string;
  nickname?: string;
  role: UserRole;
  avatar: string;
  rating: number;
  currentLoad: number;
  createdAt: string;
}

export interface Project {
  id: number;
  creatorId: number;
  creator?: User;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  members?: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  user?: User;
  role: string;
  permissions: string[];
  joinedAt: string;
}

export interface Backup {
  id: number;
  projectId: number;
  filePath: string;
  version: number;
  createdAt: string;
}

export interface Work {
  id: number;
  projectId: number;
  uploaderId: number;
  uploader?: User;
  creator?: User;
  project?: Project;
  title: string;
  lyrics: string;
  melodyPath: string;
  similarityScore: number;
  isLocked: boolean;
  createdAt: string;
}

export interface MixingTask {
  id: number;
  workId: number;
  work?: Work;
  assigneeId: number | null;
  assignee?: User;
  status: 'pending' | 'assigned' | 'in_progress' | 'mastering' | 'completed' | 'rejected';
  budget: number;
  deadline: string;
  minRatingRequired: number;
  createdAt: string;
  agreementSignedAt?: string | null;
  masters?: Master[];
}

export interface Agreement {
  id: number;
  taskId: number;
  task?: MixingTask;
  content: string;
  producerSigned: boolean;
  engineerSigned: boolean;
  signedAt: string | null;
}

export interface Master {
  id: number;
  taskId: number;
  task?: MixingTask;
  filePath: string;
  format: string;
  sampleRate: number;
  bitDepth: number;
  isVerified: boolean;
  rejectReason: string | null;
  uploadedAt: string;
  confirmerId?: number | null;
  confirmedAt?: string | null;
  confirmNote?: string | null;
}

export interface RoyaltySplit {
  id: number;
  workId: number;
  userId: number;
  user?: User;
  percentage: number;
  createdAt: string;
}

export interface RoyaltyReport {
  id: number;
  workId: number;
  work?: Work;
  reportPath: string;
  totalRevenue: number;
  month: string;
  generatedAt: string;
}

export type NotificationType = 'upload' | 'permission' | 'task' | 'settlement' | 'system';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId: string;
  isRead: boolean;
  createdAt: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  filePath: string;
  materialType: 'file' | 'url';
  accessPermissions: string[];
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
