import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/database.js';
import { initDatabase } from './db/init.js';
import { ScheduleService } from './services/ScheduleService.js';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import workRoutes from './routes/works.js';
import mixingRoutes from './routes/mixing.js';
import masteringRoutes from './routes/mastering.js';
import royaltyRoutes from './routes/royalty.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/reports', express.static(path.join(__dirname, '..', 'reports')));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/works', workRoutes);
app.use('/api/mixing-tasks', mixingRoutes);
app.use('/api/mastering', masteringRoutes);
app.use('/api/royalty', royaltyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '音乐制作协作平台 API 服务运行正常' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

let isInitialized = false;

export async function initializeApp(): Promise<void> {
  if (isInitialized) return;
  
  console.log('正在初始化数据库...');
  await initDb();
  await initDatabase();
  
  console.log('正在启动定时任务...');
  ScheduleService.init();
  
  isInitialized = true;
  console.log('应用初始化完成');
}

export function isAppInitialized(): boolean {
  return isInitialized;
}

export default app;
