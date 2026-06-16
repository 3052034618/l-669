import { run, get, all } from '../db/database.js';
import { MixingTask, Agreement } from '../../shared/types.js';
import { AuthService } from './AuthService.js';
import { WorkService } from './WorkService.js';
import { NotificationService } from './NotificationService.js';

export class MixingService {
  static createTask(
    workId: number,
    budget: number,
    deadline: string,
    minRating: number = 4.0
  ): MixingTask | null {
    const work = WorkService.getById(workId);
    if (!work) return null;
    
    const result = run(
      `INSERT INTO mixing_tasks (work_id, budget, deadline, min_rating_required)
       VALUES (?, ?, ?, ?)`,
      [workId, budget, deadline, minRating]
    );
    const taskId = result.lastInsertRowid as number;
    
    const agreementContent = this.generateAgreementContent(work.title, budget, deadline);
    run(
      `INSERT INTO agreements (task_id, content)
       VALUES (?, ?)`,
      [taskId, agreementContent]
    );
    
    const engineers = AuthService.getAll('engineer');
    engineers.forEach(engineer => {
      if (engineer.rating >= minRating) {
        NotificationService.create(
          engineer.id,
          'task',
          '新混音任务',
          `有新的混音任务「${work.title}」，预算：¥${budget}`,
          `mixing:${taskId}`
        );
      }
    });
    
    return this.getTaskById(taskId);
  }

  static getTaskById(id: number): MixingTask | null {
    const row = get('SELECT * FROM mixing_tasks WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const task = this.mapTaskRow(row);
    task.work = WorkService.getById(row.work_id) || undefined;
    task.assignee = row.assignee_id ? AuthService.getById(row.assignee_id) || undefined : undefined;
    
    return task;
  }

  static getAvailableTasks(engineerRating: number): MixingTask[] {
    const rows = all(`
      SELECT * FROM mixing_tasks 
      WHERE status = 'pending' AND min_rating_required <= ?
      ORDER BY created_at DESC
    `, [engineerRating]) as any[];
    
    return rows.map(row => {
      const task = this.mapTaskRow(row);
      task.work = WorkService.getById(row.work_id) || undefined;
      return task;
    });
  }

  static getMyTasks(userId: number, role: string): MixingTask[] {
    let query = 'SELECT mt.* FROM mixing_tasks mt';
    const params: any[] = [];
    
    if (role === 'engineer') {
      query += ' WHERE mt.assignee_id = ?';
      params.push(userId);
    } else if (role === 'producer' || role === 'admin') {
      query += ` 
        JOIN works w ON mt.work_id = w.id
        JOIN projects p ON w.project_id = p.id
        WHERE p.creator_id = ?
      `;
      params.push(userId);
    }
    
    query += ' ORDER BY mt.created_at DESC';
    
    const rows = all(query, params) as any[];
    
    return rows.map(row => {
      const task = this.mapTaskRow(row);
      task.work = WorkService.getById(row.work_id) || undefined;
      task.assignee = row.assignee_id ? AuthService.getById(row.assignee_id) || undefined : undefined;
      return task;
    });
  }

  static acceptTask(taskId: number, engineerId: number): { success: boolean; message: string; task?: MixingTask } {
    const engineer = AuthService.getById(engineerId);
    if (!engineer || engineer.role !== 'engineer') {
      return { success: false, message: '只有混音师可以接受任务' };
    }
    
    const task = this.getTaskById(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }
    
    if (task.status !== 'pending') {
      return { success: false, message: '任务已被接受或已完成' };
    }
    
    if (engineer.rating < task.minRatingRequired) {
      return { success: false, message: `评分不足，需要${task.minRatingRequired}分以上` };
    }
    
    if (engineer.currentLoad >= 3) {
      return { success: false, message: '当前任务已达上限（最多3个）' };
    }
    
    run(
      `UPDATE mixing_tasks 
       SET status = 'assigned', assignee_id = ? 
       WHERE id = ?`,
      [engineerId, taskId]
    );
    
    AuthService.updateUserLoad(engineerId, engineer.currentLoad + 1);
    
    if (task.work?.project?.creatorId) {
      NotificationService.create(
        task.work.project.creatorId,
        'task',
        '任务已被接受',
        `混音任务「${task.work?.title}」已被${engineer.name}接受`,
        `mixing:${taskId}`
      );
    }
    
    NotificationService.create(
      engineerId,
      'task',
      '任务接受成功',
      `您已成功接受混音任务「${task.work?.title}」`,
      `mixing:${taskId}`
    );
    
    return { success: true, message: '任务接受成功', task: this.getTaskById(taskId)! };
  }

  static getAgreement(taskId: number): Agreement | null {
    const row = get('SELECT * FROM agreements WHERE task_id = ?', [taskId]) as any;
    if (!row) return null;
    
    const agreement = this.mapAgreementRow(row);
    agreement.task = this.getTaskById(taskId) || undefined;
    
    return agreement;
  }

  static signAgreement(taskId: number, userId: number, role: string): { success: boolean; message: string } {
    const agreement = this.getAgreement(taskId);
    if (!agreement) {
      return { success: false, message: '协议不存在' };
    }
    
    run(
      `UPDATE agreements 
       SET ${role === 'producer' ? 'producer_signed' : 'engineer_signed'} = 1
       WHERE task_id = ?`,
      [taskId]
    );
    
    const updatedAgreement = this.getAgreement(taskId)!;
    
    if (updatedAgreement.producerSigned && updatedAgreement.engineerSigned) {
      run(
        `UPDATE agreements SET signed_at = CURRENT_TIMESTAMP WHERE task_id = ?`,
        [taskId]
      );
      
      run(
        `UPDATE mixing_tasks SET status = 'in_progress' WHERE id = ?`,
        [taskId]
      );
      
      if (updatedAgreement.task?.assigneeId) {
        NotificationService.create(
          updatedAgreement.task.assigneeId,
          'task',
          '协议已签署',
          `混音任务「${updatedAgreement.task.work?.title}」协议已完成签署，可以开始工作`,
          `mixing:${taskId}`
        );
      }
      
      if (updatedAgreement.task?.work?.project?.creatorId) {
        NotificationService.create(
          updatedAgreement.task.work.project.creatorId,
          'task',
          '协议已签署',
          `混音任务「${updatedAgreement.task.work?.title}」协议已完成签署`,
          `mixing:${taskId}`
        );
      }
    }
    
    return { success: true, message: '签署成功' };
  }

  private static generateAgreementContent(workTitle: string, budget: number, deadline: string): string {
    return `
混音服务协议

甲方（委托方）：音乐制作人
乙方（服务方）：混音师

鉴于甲方委托乙方完成音乐作品「${workTitle}」的混音工作，双方经友好协商，达成如下协议：

一、服务内容
乙方按照行业标准完成该作品的混音和母带处理工作。

二、服务费用
本次混音服务费用为人民币 ¥${budget} 元整。

三、交付时间
乙方应于 ${deadline} 前完成全部工作并交付成果。

四、质量标准
1. 采样率不低于 44.1kHz
2. 位深度不低于 24bit
3. 格式为 WAV 或 FLAC

五、付款方式
作品验收合格后，甲方通过平台支付服务费用。

六、知识产权
本作品相关知识产权归属依照双方另行约定的版权分成协议执行。

七、违约责任
任何一方违反本协议约定，应承担相应的违约责任。

八、争议解决
因本协议引起的争议，双方应友好协商解决；协商不成的，提交平台调解。

本协议自双方签署之日起生效。
    `.trim();
  }

  private static mapTaskRow(row: any): MixingTask {
    return {
      id: row.id,
      workId: row.work_id,
      assigneeId: row.assignee_id,
      status: row.status as MixingTask['status'],
      budget: row.budget,
      deadline: row.deadline,
      minRatingRequired: row.min_rating_required,
      createdAt: row.created_at
    };
  }

  private static mapAgreementRow(row: any): Agreement {
    return {
      id: row.id,
      taskId: row.task_id,
      content: row.content,
      producerSigned: Boolean(row.producer_signed),
      engineerSigned: Boolean(row.engineer_signed),
      signedAt: row.signed_at
    };
  }
}
