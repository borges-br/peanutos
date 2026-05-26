import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { DocumentTemplatesService } from "./document-templates.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  updateDocumentTemplateSettingSchema,
  TEMPLATE_DOCUMENT_TYPES,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("document-templates")
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async listAll(@CurrentUser() user: any) {
    return this.service.listAll(user.workspaceId);
  }

  @Get(":documentType")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getByType(
    @Param("documentType") documentType: string,
    @CurrentUser() user: any,
  ) {
    if (!TEMPLATE_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new BadRequestException(
        `Tipo de documento inválido. Use: ${TEMPLATE_DOCUMENT_TYPES.join(", ")}`,
      );
    }
    return this.service.getByType(user.workspaceId, documentType);
  }

  @Patch(":documentType")
  @Roles("OWNER", "ADMIN")
  async update(
    @Param("documentType") documentType: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    if (!TEMPLATE_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new BadRequestException(`Tipo de documento inválido`);
    }

    const result = updateDocumentTemplateSettingSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(", "),
      );
    }

    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.service.upsert(
      user.workspaceId,
      documentType,
      result.data,
      user.id,
      ip,
      ua,
    );
  }

  @Post(":documentType/reset")
  @Roles("OWNER", "ADMIN")
  async reset(
    @Param("documentType") documentType: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    if (!TEMPLATE_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new BadRequestException(`Tipo de documento inválido`);
    }

    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.service.reset(user.workspaceId, documentType, user.id, ip, ua);
  }
}
