import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  ticketCreateSchema,
  ticketUpdateSchema,
  ticketStatusUpdateSchema,
  ticketAssignSchema,
  ticketCommentCreateSchema,
  ticketTimeEntryCreateSchema,
} from "@peanut/validators";
import { TicketPriority, TicketStatus } from "@peanut/db";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get("tickets")
  async list(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("clientId") clientId: string,
    @Query("status") status: TicketStatus,
    @Query("priority") priority: TicketPriority,
    @Query("assignedToId") assignedToId: string,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.list(user.workspaceId, {
      page,
      limit,
      search,
      clientId,
      status,
      priority,
      assignedToId,
    });
  }

  @Get("tickets/sla-policies")
  async listSlaPolicies(@CurrentUser() user: any) {
    return this.ticketsService.listSlaPolicies(user.workspaceId);
  }

  @Get("tickets/:ticketId")
  async getById(@Param("ticketId") ticketId: string, @CurrentUser() user: any) {
    return this.ticketsService.getById(ticketId, user.workspaceId);
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("tickets")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const parse = ticketCreateSchema.safeParse(body);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.create(
      parse.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch("tickets/:ticketId")
  async update(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parse = ticketUpdateSchema.safeParse(body);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.update(
      ticketId,
      parse.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch("tickets/:ticketId/status")
  async updateStatus(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parse = ticketStatusUpdateSchema.safeParse(body);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.updateStatus(
      ticketId,
      parse.data.status,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch("tickets/:ticketId/assign")
  async assign(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parse = ticketAssignSchema.safeParse(body);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.assign(
      ticketId,
      parse.data.assignedToId,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("tickets/:ticketId/comments")
  async createComment(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parse = ticketCommentCreateSchema.safeParse(body);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.createComment(
      ticketId,
      parse.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Get("tickets/:ticketId/comments")
  async listComments(
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.listComments(ticketId, user.workspaceId);
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("tickets/:ticketId/time-entries")
  async createTimeEntry(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parse = ticketTimeEntryCreateSchema.safeParse(body);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.createTimeEntry(
      ticketId,
      parse.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Get("tickets/:ticketId/time-entries")
  async listTimeEntries(
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.listTimeEntries(ticketId, user.workspaceId);
  }

  // --- CLIENT-SPECIFIC ROUTES ---

  @Get("clients/:clientId/tickets")
  async listClientTickets(
    @Param("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: TicketStatus,
    @Query("priority") priority: TicketPriority,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.list(user.workspaceId, {
      page,
      limit,
      search,
      clientId,
      status,
      priority,
    });
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/tickets")
  async createClientTicket(
    @Param("clientId") clientId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const payload = { ...body, clientId };
    const parse = ticketCreateSchema.safeParse(payload);
    if (!parse.success) {
      const messages = parse.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.ticketsService.create(
      parse.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}
