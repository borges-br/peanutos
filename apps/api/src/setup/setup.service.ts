import {
  Injectable,
  ConflictException,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../audit/audit.service";
import { SetupAdminInput } from "@peanut/validators";

@Injectable()
export class SetupService {
  constructor(private readonly auditService: AuditService) {}

  async getStatus() {
    const count = await prisma.user.count();
    return { requiresSetup: count === 0 };
  }

  async createAdmin(
    input: SetupAdminInput,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { workspaceName, adminName, adminEmail, adminPassword } = input;
    const normalizedEmail = adminEmail.toLowerCase().trim();
    const slug = this.generateSlug(workspaceName);

    const result = await prisma.$transaction(async (tx) => {
      // Double-check inside transaction to guard against race conditions
      const count = await tx.user.count();
      if (count > 0) {
        throw new ConflictException(
          "Setup já foi concluído. Acesso negado.",
        );
      }

      // Ensure unique slug
      const existingWs = await tx.workspace.findUnique({ where: { slug } });
      const finalSlug = existingWs ? `${slug}-${Date.now()}` : slug;

      const workspace = await tx.workspace.create({
        data: { name: workspaceName, slug: finalSlug, status: "ACTIVE" },
      });

      const passwordHash = bcrypt.hashSync(adminPassword, 12);

      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          name: adminName,
          email: normalizedEmail,
          passwordHash,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      return { workspace, user };
    });

    // Audit outside transaction — setup success is guaranteed even if log fails
    try {
      await this.auditService.log({
        workspaceId: result.workspace.id,
        actorUserId: result.user.id,
        action: "setup.admin_created",
        entityType: "USER",
        entityId: result.user.id,
        after: {
          workspaceName: result.workspace.name,
          userId: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        ipAddress,
        userAgent,
        severity: "SECURITY_ALERT",
      });
    } catch {
      // Non-fatal
    }

    return {
      success: true,
      message:
        "Configuração inicial concluída. Faça login para continuar.",
    };
  }

  private generateSlug(name: string): string {
    const normalized = name.toLowerCase().normalize("NFD");
    // Remove combining diacritical marks (U+0300 to U+036F)
    const diacriticsRegex = new RegExp("[\\u0300-\\u036f]", "g");
    return (
      normalized
        .replace(diacriticsRegex, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100) || "workspace"
    );
  }
}
