import { Injectable } from '@nestjs/common';
import { prisma } from '@peanut/db';

@Injectable()
export class AuditService {
  private sanitize(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized = { ...data };
    const sensitiveKeys = [
      'password', 
      'passwordhash', 
      'token', 
      'accesstoken', 
      'refreshtoken', 
      'authorization', 
      'secret',
      'key',
      'password_hash'
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }
    return sanitized;
  }

  async log(params: {
    workspaceId: string;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
    severity?: 'INFO' | 'WARN' | 'SECURITY_ALERT';
  }) {
    try {
      const beforeJson = params.before ? JSON.stringify(this.sanitize(params.before)) : null;
      const afterJson = params.after ? JSON.stringify(this.sanitize(params.after)) : null;

      await prisma.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorUserId: params.actorUserId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeJson,
          afterJson,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          severity: params.severity || 'INFO',
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
