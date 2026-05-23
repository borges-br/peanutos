import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@peanut/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuditService } from '../audit/audit.service';
import { LoginInput } from '@peanut/validators';

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'change-me-in-production-at-least-32-chars-long';

  constructor(private readonly auditService: AuditService) {}

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.status !== 'ACTIVE') {
      // Find a fallback workspace for logging since actor user doesn't exist/isn't active
      const fallbackWorkspace = await prisma.workspace.findFirst();
      if (fallbackWorkspace) {
        await this.auditService.log({
          workspaceId: fallbackWorkspace.id,
          action: 'auth.login_failed',
          entityType: 'USER',
          entityId: user?.id || fallbackWorkspace.id,
          before: { email },
          ipAddress,
          userAgent,
          severity: 'SECURITY_ALERT',
        });
      }
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Compare password hashes
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.auditService.log({
        workspaceId: user.workspaceId,
        action: 'auth.login_failed',
        entityType: 'USER',
        entityId: user.id,
        before: { email },
        ipAddress,
        userAgent,
        severity: 'SECURITY_ALERT',
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      workspaceId: user.workspaceId,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });

    // Log successful login
    await this.auditService.log({
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      action: 'auth.login_success',
      entityType: 'USER',
      entityId: user.id,
      after: { name: user.name, email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        workspaceId: user.workspaceId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        return null;
      }

      return {
        id: user.id,
        workspaceId: user.workspaceId,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch (err) {
      return null;
    }
  }
}
