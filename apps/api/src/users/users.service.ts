import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import { StorageService } from "../storage/storage.service";
import { UserRole } from "@peanut/types";
import {
  CreateWorkspaceUserInput,
  UpdateWorkspaceUserRoleInput,
  UpdateUserProfileInput,
} from "@peanut/validators";

@Injectable()
export class UsersService {
  constructor(
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
    private readonly storage: StorageService,
  ) {}

  async list(workspaceId: string) {
    const users = await prisma.user.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return users.map(({ passwordHash, ...user }) => user);
  }

  async getById(id: string, workspaceId: string) {
    const user = await prisma.user.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    const { passwordHash, ...result } = user;
    return result;
  }

  async create(
    input: CreateWorkspaceUserInput,
    workspaceId: string,
    actorUserId: string,
    _actorRole: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Role is already restricted by createWorkspaceUserSchema (no OWNER allowed)
    // Further RBAC is enforced at controller level via @Roles decorator

    const normalizedEmail = input.email.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, workspaceId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException("E-mail já cadastrado neste workspace");
    }

    const passwordHash = bcrypt.hashSync(input.password, 12);

    const newUser = await prisma.user.create({
      data: {
        workspaceId,
        name: input.name,
        email: normalizedEmail,
        passwordHash,
        role: input.role,
        status: "ACTIVE",
      },
    });

    const { passwordHash: _, ...sanitizedUser } = newUser;

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "user.created",
      entityType: "USER",
      entityId: newUser.id,
      after: sanitizedUser,
      ipAddress,
      userAgent,
    });

    this.webhookEvents.emit({
      workspaceId,
      eventType: 'user.created',
      entityId: newUser.id,
      data: { userId: newUser.id, name: sanitizedUser.name, email: sanitizedUser.email, role: sanitizedUser.role },
    }).catch(() => {});

    return sanitizedUser;
  }

  async updateRole(
    id: string,
    input: UpdateWorkspaceUserRoleInput,
    workspaceId: string,
    actorUserId: string,
    actorRole: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const target = await prisma.user.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!target) throw new NotFoundException("Usuário não encontrado");

    // ADMIN cannot modify an OWNER
    if (actorRole === "ADMIN" && target.role === "OWNER") {
      throw new ForbiddenException(
        "ADMIN não pode alterar a role de um OWNER",
      );
    }

    // Prevent removing the last OWNER — input.role is always non-OWNER per schema
    if (target.role === "OWNER") {
      const ownerCount = await prisma.user.count({
        where: { workspaceId, role: "OWNER", deletedAt: null },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          "Não é permitido remover a role do único OWNER do workspace",
        );
      }
    }

    // The schema already blocks assigning OWNER via this endpoint
    const { passwordHash: _, ...before } = target;

    const updated = await prisma.user.update({
      where: { id },
      data: { role: input.role },
    });

    const { passwordHash: __, ...after } = updated;

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "user.role_changed",
      entityType: "USER",
      entityId: id,
      before,
      after,
      ipAddress,
      userAgent,
    });

    if (input.role && before.role !== input.role) {
      this.webhookEvents.emit({
        workspaceId,
        eventType: 'user.role_changed',
        entityId: id,
        data: { userId: id, name: after.name, email: after.email, oldRole: before.role, newRole: input.role },
      }).catch(() => {});
    }

    return after;
  }

  async updateStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
    workspaceId: string,
    actorUserId: string,
    actorRole: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    // ADMIN cannot deactivate an OWNER
    if (actorRole === "ADMIN" && user.role === "OWNER") {
      throw new ForbiddenException(
        "ADMIN não pode alterar o status de um OWNER",
      );
    }

    if (status !== "ACTIVE" && user.role === "OWNER") {
      const activeOwners = await prisma.user.count({
        where: { workspaceId, role: "OWNER", status: "ACTIVE", deletedAt: null },
      });
      if (activeOwners <= 1) {
        throw new BadRequestException(
          "Não é permitido desativar o único OWNER ativo do workspace",
        );
      }
    }

    const { passwordHash: _, ...before } = user;

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
    });

    const { passwordHash: __, ...after } = updated;

    const action =
      status === "ACTIVE" ? "user.reactivated" : "user.deactivated";

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action,
      entityType: "USER",
      entityId: id,
      before,
      after,
      ipAddress,
      userAgent,
    });

    return after;
  }

  async deleteUser(
    id: string,
    workspaceId: string,
    actorUserId: string,
    actorRole: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    // Cannot delete yourself
    if (id === actorUserId) {
      throw new BadRequestException("Você não pode remover sua própria conta");
    }

    // ADMIN cannot delete an OWNER
    if (actorRole === "ADMIN" && user.role === "OWNER") {
      throw new ForbiddenException("ADMIN não pode remover um OWNER");
    }

    if (user.role === "OWNER") {
      const ownerCount = await prisma.user.count({
        where: { workspaceId, role: "OWNER", deletedAt: null },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          "Não é permitido remover o único OWNER do workspace",
        );
      }
    }

    const { passwordHash: _, ...before } = user;

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "user.deleted",
      entityType: "USER",
      entityId: id,
      before,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // ─── Profile & Document Identity ─────────────────────────────────────────────

  private sanitizeUser(user: any) {
    const { passwordHash: _, ...safe } = user;
    const avatarUrl = user.avatarFileObjectId ? `/api/v1/files/${user.avatarFileObjectId}` : null;
    const signatureUrl = user.signatureImageFileObjectId ? `/api/v1/files/${user.signatureImageFileObjectId}` : null;
    return { ...safe, avatarUrl, signatureUrl };
  }

  async getMyProfile(userId: string, workspaceId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, workspaceId, deletedAt: null } });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    return this.sanitizeUser(user);
  }

  async updateMyProfile(
    userId: string,
    workspaceId: string,
    input: UpdateUserProfileInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const before = await prisma.user.findFirst({ where: { id: userId, workspaceId, deletedAt: null } });
    if (!before) throw new NotFoundException("Usuário não encontrado");

    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle || null;
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.documentDisplayName !== undefined) data.documentDisplayName = input.documentDisplayName || null;
    if (input.documentSignatureEnabled !== undefined) data.documentSignatureEnabled = input.documentSignatureEnabled;

    const updated = await prisma.user.update({ where: { id: userId }, data });

    await this.auditService.log({
      workspaceId,
      actorUserId: userId,
      action: "user.profile_updated",
      entityType: "USER",
      entityId: userId,
      before: this.sanitizeUser(before),
      after: this.sanitizeUser(updated),
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return this.sanitizeUser(updated);
  }

  async uploadAvatar(
    userId: string,
    workspaceId: string,
    upload: { data: string; mimeType: string; filename: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findFirst({ where: { id: userId, workspaceId, deletedAt: null } });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    // NOTE: Old FileObject is intentionally kept (orphan cleanup deferred to future routine)

    const { fileObjectId } = await this.storage.uploadImage({
      workspaceId,
      actorUserId: userId,
      folder: `users/${userId}/avatar`,
      data: upload.data,
      mimeType: upload.mimeType,
      filename: upload.filename,
    });

    await prisma.user.update({ where: { id: userId }, data: { avatarFileObjectId: fileObjectId } });

    await this.auditService.log({
      workspaceId,
      actorUserId: userId,
      action: "user.avatar_uploaded",
      entityType: "USER",
      entityId: userId,
      after: { fileObjectId, filename: upload.filename },
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return { avatarUrl: `/api/v1/files/${fileObjectId}` };
  }

  async deleteAvatar(
    userId: string,
    workspaceId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findFirst({ where: { id: userId, workspaceId, deletedAt: null } });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    // Unlink avatar without deleting the FileObject (orphan cleanup deferred)
    if (user.avatarFileObjectId) {
      await prisma.user.update({ where: { id: userId }, data: { avatarFileObjectId: null } });
    }

    await this.auditService.log({
      workspaceId,
      actorUserId: userId,
      action: "user.avatar_removed",
      entityType: "USER",
      entityId: userId,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return { avatarUrl: null };
  }

  async uploadSignature(
    userId: string,
    workspaceId: string,
    upload: { data: string; mimeType: string; filename: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findFirst({ where: { id: userId, workspaceId, deletedAt: null } });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    // NOTE: Old FileObject is intentionally kept (orphan cleanup deferred to future routine)

    const { fileObjectId } = await this.storage.uploadImage({
      workspaceId,
      actorUserId: userId,
      folder: `users/${userId}/signature`,
      data: upload.data,
      mimeType: upload.mimeType,
      filename: upload.filename,
    });

    await prisma.user.update({ where: { id: userId }, data: { signatureImageFileObjectId: fileObjectId } });

    await this.auditService.log({
      workspaceId,
      actorUserId: userId,
      action: "user.signature_uploaded",
      entityType: "USER",
      entityId: userId,
      after: { fileObjectId, filename: upload.filename },
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return { signatureUrl: `/api/v1/files/${fileObjectId}` };
  }

  async deleteSignature(
    userId: string,
    workspaceId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findFirst({ where: { id: userId, workspaceId, deletedAt: null } });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    // Unlink signature without deleting the FileObject (orphan cleanup deferred)
    if (user.signatureImageFileObjectId) {
      await prisma.user.update({ where: { id: userId }, data: { signatureImageFileObjectId: null } });
    }

    await this.auditService.log({
      workspaceId,
      actorUserId: userId,
      action: "user.signature_removed",
      entityType: "USER",
      entityId: userId,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return { signatureUrl: null };
  }
}
