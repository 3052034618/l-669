import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';
import { ScheduleService } from '../services/ScheduleService.js';
import { run, get, all } from '../db/database.js';
import { Material } from '../../shared/types.js';
import { ApiResponse } from '../../shared/types.js';

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
      accessPermissions: JSON.parse(row.access_permissions),
      createdAt: row.created_at
    }));
    
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取素材列表失败' });
  }
});

router.post('/materials', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { name, category, filePath, accessPermissions } = req.body;
    
    if (!name || !category || !filePath || !accessPermissions) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const result = run(`
      INSERT INTO materials (name, category, file_path, access_permissions)
      VALUES (?, ?, ?, ?)
    `, [
      name,
      category,
      filePath,
      JSON.stringify(accessPermissions)
    ]);
    
    const material = get('SELECT * FROM materials WHERE id = ?', [result.lastInsertRowid]) as any;
    
    res.json({ 
      success: true, 
      data: {
        id: material.id,
        name: material.name,
        category: material.category,
        filePath: material.file_path,
        accessPermissions: JSON.parse(material.access_permissions),
        createdAt: material.created_at
      },
      message: '素材添加成功' 
    });
  } catch (error) {
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

export default router;
