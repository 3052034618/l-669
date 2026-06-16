import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';
import { ScheduleService } from '../services/ScheduleService.js';
import { run, get, all } from '../db/database.js';
import { Material } from '../../shared/types.js';
import { ApiResponse } from '../../shared/types.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = Router();

router.use(authMiddleware, roleMiddleware('admin'));

router.get('/materials', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM materials';
    const params: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rows = all(query, params) as any[];
    const materials = rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      filePath: row.file_path,
      materialType: row.material_type || 'file',
      accessPermissions: JSON.parse(row.access_permissions),
      createdAt: row.created_at
    }));
    
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取素材列表失败' });
  }
});

router.post('/materials', upload.single('file'), (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { name, category, accessPermissions, materialType, externalUrl } = req.body;
    
    if (!name || !category || !accessPermissions) {
      return res.status(400).json({ success: false, message: '名称、分类和访问角色为必填项' });
    }

    const type = materialType || 'file';
    let filePath = '';
    
    if (type === 'url') {
      if (!externalUrl) {
        return res.status(400).json({ success: false, message: '外链模式请填写素材URL' });
      }
      filePath = externalUrl;
    } else {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '文件模式请选择要上传的文件' });
      }
      filePath = '/' + req.file.path.replace(/\\/g, '/');
    }
    
    const perms = typeof accessPermissions === 'string' ? JSON.parse(accessPermissions) : accessPermissions;

    const result = run(`
      INSERT INTO materials (name, category, file_path, material_type, access_permissions)
      VALUES (?, ?, ?, ?, ?)
    `, [
      name,
      category,
      filePath,
      type,
      JSON.stringify(perms)
    ]);
    
    const material = get('SELECT * FROM materials WHERE id = ?', [result.lastInsertRowid]) as any;
    
    res.json({ 
      success: true, 
      data: {
        id: material.id,
        name: material.name,
        category: material.category,
        filePath: material.file_path,
        materialType: material.material_type || 'file',
        accessPermissions: JSON.parse(material.access_permissions),
        createdAt: material.created_at
      },
      message: '素材添加成功' 
    });
  } catch (error) {
    console.error('Material create error:', error);
    res.status(500).json({ success: false, message: '添加素材失败' });
  }
});

router.post('/materials/permissions', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { materialId, accessPermissions } = req.body;
    
    if (!materialId || !accessPermissions) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const result = run(`
      UPDATE materials SET access_permissions = ? WHERE id = ?
    `, [JSON.stringify(accessPermissions), materialId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '素材不存在' });
    }
    
    res.json({ success: true, message: '权限设置成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '设置权限失败' });
  }
});

router.delete('/materials/:id', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const id = parseInt(req.params.id);
    const result = run('DELETE FROM materials WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '素材不存在' });
    }
    
    res.json({ success: true, message: '素材删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除素材失败' });
  }
});

router.get('/stats', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const userCount = (get('SELECT COUNT(*) as count FROM users', []) as { count: number }).count;
    const projectCount = (get('SELECT COUNT(*) as count FROM projects', []) as { count: number }).count;
    const workCount = (get('SELECT COUNT(*) as count FROM works', []) as { count: number }).count;
    const taskCount = (get('SELECT COUNT(*) as count FROM mixing_tasks', []) as { count: number }).count;
    const completedTaskCount = (get("SELECT COUNT(*) as count FROM mixing_tasks WHERE status = 'completed'", []) as { count: number }).count;
    const totalRevenue = (get('SELECT COALESCE(SUM(total_revenue), 0) as sum FROM royalty_reports', []) as { sum: number }).sum;
    
    res.json({
      success: true,
      data: {
        userCount,
        projectCount,
        workCount,
        taskCount,
        completedTaskCount,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

router.post('/trigger-backup', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    ScheduleService.triggerBackup();
    res.json({ success: true, message: '备份任务已触发' });
  } catch (error) {
    res.status(500).json({ success: false, message: '触发备份失败' });
  }
});

router.post('/trigger-settlement', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    ScheduleService.triggerSettlement();
    res.json({ success: true, message: '结算任务已触发' });
  } catch (error) {
    res.status(500).json({ success: false, message: '触发结算失败' });
  }
});

router.get('/settlement-candidates', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const rows = all(`
      SELECT DISTINCT 
        w.id as work_id,
        w.title as work_title,
        mt.id as task_id,
        mt.budget,
        mt.assignee_id,
        mt.status,
        u.name as engineer_name,
        p.name as project_name,
        mt.created_at
      FROM mixing_tasks mt
      JOIN works w ON mt.work_id = w.id
      JOIN projects p ON w.project_id = p.id
      LEFT JOIN users u ON mt.assignee_id = u.id
      WHERE mt.status = 'completed'
      ORDER BY mt.created_at DESC
    `, []) as any[];

    const candidates = rows.map(row => ({
      workId: row.work_id,
      workTitle: row.work_title,
      taskId: row.task_id,
      budget: row.budget,
      engineerId: row.assignee_id,
      engineerName: row.engineer_name,
      projectName: row.project_name,
      completedAt: row.created_at
    }));
    
    res.json({ success: true, data: candidates });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ success: false, message: '获取结算候选失败' });
  }
});

export default router;
