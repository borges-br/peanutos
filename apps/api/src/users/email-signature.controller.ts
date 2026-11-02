import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  prisma,
  resolveUserEmailSignature,
  renderWorkspaceBillingEmail,
} from "@peanut/db";
import { emailSignatureSchema } from "@peanut/validators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("users/me/email-signature")
@UseGuards(AuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "FINANCIAL")
export class EmailSignatureController {
  private parse(body: unknown) {
    const parsed = emailSignatureSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        parsed.error.issues.map((e) => e.message).join(" "),
      );
    return parsed.data;
  }
  @Get()
  async get(@CurrentUser() actor: any) {
    const user = await prisma.user.findFirst({
      where: {
        id: actor.id,
        workspaceId: actor.workspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        name: true,
        email: true,
        jobTitle: true,
        phone: true,
        emailSignature: true,
      },
    });
    if (!user) throw new NotFoundException();
    return (
      user.emailSignature || {
        enabled: false,
        showLogo: true,
        displayName: user.name,
        jobTitle: user.jobTitle || "",
        company: "",
        email: user.email,
        phone: user.phone || "",
        whatsapp: "",
        website: "",
        address: "",
        registration: "",
      }
    );
  }
  @Put()
  async save(@CurrentUser() actor: any, @Body() body: unknown) {
    const config = this.parse(body);
    await prisma.$transaction(async (tx) => {
      const saved = await tx.user.updateMany({
        where: {
          id: actor.id,
          workspaceId: actor.workspaceId,
          deletedAt: null,
          status: "ACTIVE",
        },
        data: { emailSignature: config },
      });
      if (!saved.count) throw new NotFoundException();
      await tx.auditLog.create({
        data: {
          workspaceId: actor.workspaceId,
          actorUserId: actor.id,
          action: "user.email_signature_updated",
          entityType: "USER",
          entityId: actor.id,
          severity: "INFO",
        },
      });
    });
    return config;
  }
  @Post("preview")
  async preview(@CurrentUser() actor: any, @Body() body: unknown) {
    const config = this.parse(body);
    const signature = await resolveUserEmailSignature(
      prisma,
      actor.workspaceId,
      actor.id,
      config,
    );
    return renderWorkspaceBillingEmail(
      prisma,
      actor.workspaceId,
      {
        subject: "Prévia da assinatura",
        body: "Olá, {cliente}.\n\nEsta é uma prévia da minha assinatura de email.",
        signature,
      },
      {
        cliente: "Cliente Demonstração",
        empresa: config.company,
        fatura: "DEMO",
        competencia: "Exemplo",
        fuso: "America/Sao_Paulo",
      },
    );
  }
}
