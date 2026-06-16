import { run, get, all } from '../db/database.js';
import { Project, ProjectMember, User, Backup } from '../../shared/types.js';
import { AuthService } from './AuthService.js';
import { NotificationService } from './NotificationService.js';

export class ProjectService {
  static create(creatorId: number, name: string, description: string): Project {
    const result = run(`
      INSERT INTO projects (creator_id, name, description)
      VALUES (?, ?, ?)
    `, [creatorId, name, description]);
    const projectId = result.lastInsertRowid as number;
    
    this.addMember(projectId, creatorId, 'owner', ['read', 'write', 'delete', 'manage']);
    
    const creator = AuthService.getById(creatorId);
    if (creator) {
      NotificationService.create(
        creatorId,
        'system',
        '项目创建成功',
        `您已成功创建项目「${name}」`,
        `project:${projectId}`
      );
    }
    
    return this.getById(projectId)!;
  }

  static getById(id: number): Project | null {
    const row = get('SELECT * FROM projects WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const project = this.mapRow(row);
    project.creator = AuthService.getById(row.creator_id) || undefined;
    project.members = this.getMembers(id);
    
    return project;
  }

  static getByUserId(userId: number): Project[] {
    const rows = all(`
      SELECT DISTINCT p.* FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.creator_id = ? OR pm.user_id = ?
      ORDER BY p.updated_at DESC
    `, [userId, userId]) as any[];
    
    return rows.map(row => {
      const project = this.mapRow(row);
      project.creator = AuthService.getById(row.creator_id) || undefined;
      project.members = this.getMembers(row.id);
      return project;
    });
  }

  static addMember(
    projectId: number,
    userId: number,
    role: string,
    permissions: string[]
  ): ProjectMember | null {
    const existing = get(`
      SELECT id FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `, [projectId, userId]);
    
    if (existing) return null;
    
    const result = run(`
      INSERT INTO project_members (project_id, user_id, role, permissions)
      VALUES (?, ?, ?, ?)
    `, [projectId, userId, role, JSON.stringify(permissions)]);
    
    const user = AuthService.getById(userId);
    const project = this.getById(projectId);
    
    if (user && project) {
      NotificationService.create(
        userId,
        'permission',
        '项目邀请',
        `您已被邀请加入项目「${project.name}」，角色：${role}`,
        `project:${projectId}`
      );
    }
    
    return this.getMemberById(result.lastInsertRowid as number);
  }

  static getMembers(projectId: number): ProjectMember[] {
    const rows = all(`
      SELECT * FROM project_members WHERE project_id = ?
    `, [projectId]) as any[];
    
    return rows.map(row => {
      const member = this.mapMemberRow(row);
      member.user = AuthService.getById(row.user_id) || undefined;
      return member;
    });
  }

  static getMemberById(id: number): ProjectMember | null {
    const row = get('SELECT * FROM project_members WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const member = this.mapMemberRow(row);
    member.user = AuthService.getById(row.user_id) || undefined;
    return member;
  }

  static updateMemberPermissions(
    projectId: number,
    userId: number,
    permissions: string[]
  ): boolean {
    const result = run(`
      UPDATE project_members SET permissions = ? 
      WHERE project_id = ? AND user_id = ?
    `, [JSON.stringify(permissions), projectId, userId]);
    
    if (result.changes > 0) {
      const user = AuthService.getById(userId);
      const project = this.getById(projectId);
      
      if (user && project) {
        NotificationService.create(
          userId,
          'permission',
          '权限变更',
          `您在项目「${project.name}」的权限已更新`,
          `project:${projectId}`
        );
      }
    }
    
    return result.changes > 0;
  }

  static removeMember(projectId: number, userId: number): boolean {
    const result = run(`
      DELETE FROM project_members 
      WHERE project_id = ? AND user_id = ? AND role != 'owner'
    `, [projectId, userId]);
    return result.changes > 0;
  }

  static createBackup(projectId: number): Backup | null {
    const project = this.getById(projectId);
    if (!project) return null;
    
    const lastBackup = get(`
      SELECT MAX(version) as max_version FROM backups WHERE project_id = ?
    `, [projectId]) as { max_version: number | null };
    
    const version = (lastBackup.max_version || 0) + 1;
    const filePath = `/backups/project-${projectId}-v${version}.zip`;
    
    const result = run(`
      INSERT INTO backups (project_id, file_path, version)
      VALUES (?, ?, ?)
    `, [projectId, filePath, version]);
    
    return this.getBackupById(result.lastInsertRowid as number);
  }

  static getBackups(projectId: number): Backup[] {
    const rows = all(`
      SELECT * FROM backups WHERE project_id = ? 
      ORDER BY created_at DESC
    `, [projectId]) as any[];
    
    return rows.map(row => this.mapBackupRow(row));
  }

  static getBackupById(id: number): Backup | null {
    const row = get('SELECT * FROM backups WHERE id = ?', [id]) as any;
    return row ? this.mapBackupRow(row) : null;
  }

  private static mapRow(row: any): Project {
    return {
      id: row.id,
      creatorId: row.creator_id,
      name: row.name,
      description: row.description,
      status: row.status as 'active' | 'completed' | 'archived',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static mapMemberRow(row: any): ProjectMember {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role,
      permissions: JSON.parse(row.permissions),
      joinedAt: row.joined_at
    };
  }

  private static mapBackupRow(row: any): Backup {
    return {
      id: row.id,
      projectId: row.project_id,
      filePath: row.file_path,
      version: row.version,
      createdAt: row.created_at
    };
  }
}
