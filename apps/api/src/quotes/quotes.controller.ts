import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { QuotesService } from "./quotes.service";
import {
  quoteCreateSchema,
  quoteQuerySchema,
  quoteStatusUpdateSchema,
  quoteUpdateSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get("quotes")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async list(@Query() query: any, @CurrentUser() user: any) {
    const validation = quoteQuerySchema.safeParse(query);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    return this.quotesService.list(
      user.workspaceId,
      validation.data,
      user.role,
    );
  }

  @Get("clients/:clientId/quotes")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async listClientQuotes(
    @Param("clientId") clientId: string,
    @Query() query: any,
    @CurrentUser() user: any,
  ) {
    const validation = quoteQuerySchema.safeParse({ ...query, clientId });
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    return this.quotesService.list(
      user.workspaceId,
      validation.data,
      user.role,
    );
  }

  @Get("quotes/:quoteId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getById(@Param("quoteId") quoteId: string, @CurrentUser() user: any) {
    return this.quotesService.getById(quoteId, user.workspaceId, user.role);
  }

  @Post("quotes")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const validation = quoteCreateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }

    return this.quotesService.create(
      validation.data,
      user.workspaceId,
      user.id,
      req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1",
      req.headers?.["user-agent"] || "Unknown",
    );
  }

  @Patch("quotes/:quoteId")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async update(
    @Param("quoteId") quoteId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = quoteUpdateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }

    return this.quotesService.update(
      quoteId,
      validation.data,
      user.workspaceId,
      user.id,
      req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1",
      req.headers?.["user-agent"] || "Unknown",
    );
  }

  @Patch("quotes/:quoteId/status")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async updateStatus(
    @Param("quoteId") quoteId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = quoteStatusUpdateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }

    return this.quotesService.updateStatus(
      quoteId,
      validation.data,
      user.workspaceId,
      user.id,
      req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1",
      req.headers?.["user-agent"] || "Unknown",
    );
  }

  @Get("quotes/:quoteId/preview")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getPreview(
    @Param("quoteId") quoteId: string,
    @CurrentUser() user: any,
    @Res() reply: any,
  ) {
    if (!["OWNER", "ADMIN", "FINANCIAL"].includes(user.role)) {
      throw new ForbiddenException(
        "Você não possui permissão para visualizar o preview comercial.",
      );
    }

    const html = await this.quotesService.getQuotePreviewHtml(
      quoteId,
      user.workspaceId,
    );

    reply.header("Content-Type", "text/html; charset=utf-8");
    reply.send(html);
  }
}
