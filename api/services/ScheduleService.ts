import cron from 'node-cron';
import { ProjectService } from './ProjectService.js';
import { RoyaltyService } from './RoyaltyService.js';
import { NotificationService } from './NotificationService.js';
import { run, get, all } from '../db/database.js';
import { AuthService } from './AuthService.js';

export class ScheduleService {
  static init() {
    console.log('定时任务服务已启动');
    
    cron.schedule('*/30 * * * *', () => {
      console.log('执行项目自动备份任务');
      this.autoBackupProjects();
    });
    
    cron.schedule('0 2 1 * *', () => {
      console.log('执行月度结算任务');
      this.generateMonthlyReports();
    });
    
    cron.schedule('0 1 * * *', () => {
      console.log('执行通知清理任务');
      this.cleanOldNotifications();
    });
  }

  static autoBackupProjects() {
    try {
      const rows = all(`
        SELECT id FROM projects WHERE status = 'active'
      `) as { id: number }[];
      
      let backupCount = 0;
      rows.forEach(row => {
        const backup = ProjectService.createBackup(row.id);
        if (backup) {
          backupCount++;
          
          const members = ProjectService.getMembers(row.id);
          members.forEach(member => {
            NotificationService.create(
              member.userId,
              'system',
              '项目自动备份',
              `项目已自动备份，版本号 v${backup.version}`,
              `backup:${backup.id}`
            );
          });
        }
      });
      
      console.log(`自动备份完成，共备份 ${backupCount} 个项目`);
    } catch (error) {
      console.error('自动备份任务执行失败:', error);
    }
  }

  static generateMonthlyReports() {
    try {
      const reports = RoyaltyService.generateMonthlyReports();
      console.log(`月度结算完成，共生成 ${reports.length} 份报告`);
      
      const admins = AuthService.getAll('admin');
      admins.forEach(admin => {
        NotificationService.create(
          admin.id,
          'system',
          '月度结算完成',
          `本月度版税结算已完成，共生成 ${reports.length} 份结算报告`,
          `settlement:monthly`
        );
      });
    } catch (error) {
      console.error('月度结算任务执行失败:', error);
    }
  }

  static cleanOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = run(`
        DELETE FROM notifications 
        WHERE is_read = 1 AND created_at < ?
      `, [thirtyDaysAgo.toISOString()]);
      
      console.log(`通知清理完成，共清理 ${result.changes} 条已读通知`);
    } catch (error) {
      console.error('通知清理任务执行失败:', error);
    }
  }

  static triggerBackup() {
    this.autoBackupProjects();
  }

  static triggerSettlement() {
    this.generateMonthlyReports();
  }
}
