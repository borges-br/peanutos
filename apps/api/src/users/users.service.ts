import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@peanut/db';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { UserInput } from '@peanut/validators';

@Injectable()
export class UsersService {
  constructor(private readonly auditService: AuditService) {}

  async list(workspaceId: string) {
    const users = await prisma.user.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(({ passwordHash, ...user }) => user);
  }

  async getById(id: string, workspaceId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async create(input: UserInput, workspaceId: string, actorUserId: string, ipAddress?: string, userAgent?: string) {
    const { name, email, password, role, status } = input;

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const defaultPassword = password || 'ChangeMe123!';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        workspaceId,
        name,
        email,
        passwordHash,
        role,
        status: status || 'ACTIVE',
      },
    });

    const { passwordHash: _, ...sanitizedUser } = newUser;
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'user.created',
      entityType: 'USER',
      entityId: newUser.id,
      after: sanitizedUser,
      ipAddress,
      userAgent,
    });

    return sanitizedUser;
  }

  async update(id: string, input: Partial<UserInput>, workspaceId: string, actorUserId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { passwordHash: _, ...before } = user;

    const data: any = {};
    if (input.name) data.name = input.name;
    if (input.role) data.role = input.role;
    if (input.password) {
      data.passwordHash = bcrypt.hashSync(input.password, 10);
    }
    if (input.status) {
      data.status = input.status;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    const { passwordHash: __, ...after } = updatedUser;

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'user.updated',
      entityType: 'USER',
      entityId: id,
      before,
      after,
      ipAddress,
      userAgent,
    });

    return after;
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED', workspaceId: string, actorUserId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (status !== 'ACTIVE' && user.role === 'OWNER') {
      const activeOwnersCount = await prisma.user.count({
        where: {
          workspaceId,
          role: 'OWNER',
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (activeOwnersCount <= 1) {
        throw new BadRequestException('Não é permitido desativar o único OWNER ativo do workspace');
      }
    }

    const { passwordHash: _, ...before } = user;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
    });

    const { passwordHash: __, ...after } = updatedUser;

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'user.status_changed',
      entityType: 'USER',
      entityId: id,
      before,
      after,
      ipAddress,
      userAgent,
    });

    return after;
  }
}
