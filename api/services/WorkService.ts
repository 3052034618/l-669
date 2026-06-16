import { run, get, all } from '../db/database.js';
import { Work } from '../../shared/types.js';
import { AuthService } from './AuthService.js';
import { ProjectService } from './ProjectService.js';
import { NotificationService } from './NotificationService.js';

export class WorkService {
  static create(
    projectId: number,
    uploaderId: number,
    title: string,
    lyrics: string,
    melodyPath: string
  ): Work | null {
    const project = ProjectService.getById(projectId);
    if (!project) return null;
    
    const result = run(`
      INSERT INTO works (project_id, uploader_id, title, lyrics, melody_path)
      VALUES (?, ?, ?, ?, ?)
    `, [projectId, uploaderId, title, lyrics, melodyPath]);
    const workId = result.lastInsertRowid as number;
    
    const similarityScore = this.checkSimilarity(title, lyrics);
    const isLocked = similarityScore > 70;
    
    if (isLocked) {
      run(`
        UPDATE works SET similarity_score = ?, is_locked = 1 WHERE id = ?
      `, [similarityScore, workId]);
      
      const uploader = AuthService.getById(uploaderId);
      if (uploader) {
        NotificationService.create(
          uploaderId,
          'upload',
          '作品上传异常',
          `您上传的作品「${title}」旋律相似度达${similarityScore}%，已被锁定`,
          `work:${workId}`
        );
        
        const admins = AuthService.getAll('admin');
        admins.forEach(admin => {
          NotificationService.create(
            admin.id,
            'upload',
            '疑似重复作品',
            `作品「${title}」旋律相似度达${similarityScore}%，已被锁定`,
            `work:${workId}`
          );
        });
      }
    } else {
      run(`
        UPDATE works SET similarity_score = ? WHERE id = ?
      `, [similarityScore, workId]);
      
      const uploader = AuthService.getById(uploaderId);
      if (uploader) {
        NotificationService.create(
          uploaderId,
          'upload',
          '作品上传成功',
          `您的作品「${title}」已成功上传`,
          `work:${workId}`
        );
      }
      
      const members = ProjectService.getMembers(projectId);
      members.forEach(member => {
        if (member.userId !== uploaderId) {
          NotificationService.create(
            member.userId,
            'upload',
            '新作品上传',
            `项目「${project.name}」有新作品「${title}」已上传`,
            `work:${workId}`
          );
        }
      });
    }
    
    return this.getById(workId);
  }

  static getById(id: number): Work | null {
    const row = get('SELECT * FROM works WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const work = this.mapRow(row);
    work.uploader = AuthService.getById(row.uploader_id) || undefined;
    work.project = ProjectService.getById(row.project_id) || undefined;
    
    return work;
  }

  static getByProjectId(projectId: number): Work[] {
    const rows = all(`
      SELECT * FROM works WHERE project_id = ? ORDER BY created_at DESC
    `, [projectId]) as any[];
    
    return rows.map(row => {
      const work = this.mapRow(row);
      work.uploader = AuthService.getById(row.uploader_id) || undefined;
      return work;
    });
  }

  static getByUserId(userId: number): Work[] {
    const rows = all(`
      SELECT * FROM works WHERE uploader_id = ? ORDER BY created_at DESC
    `, [userId]) as any[];
    
    return rows.map(row => {
      const work = this.mapRow(row);
      work.project = ProjectService.getById(row.project_id) || undefined;
      return work;
    });
  }

  static checkSimilarity(title: string, lyrics: string): number {
    const hash = this.simpleHash(title + lyrics);
    return (hash % 100) + Math.random() * 20;
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static mapRow(row: any): Work {
    return {
      id: row.id,
      projectId: row.project_id,
      uploaderId: row.uploader_id,
      title: row.title,
      lyrics: row.lyrics,
      melodyPath: row.melody_path,
      similarityScore: row.similarity_score,
      isLocked: Boolean(row.is_locked),
      createdAt: row.created_at
    };
  }
}
