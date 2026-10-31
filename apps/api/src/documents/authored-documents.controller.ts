import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Res,
  ParseUUIDPipe,
} from "@nestjs/common";
import { authoredDocumentSchema, revisionSchema, z } from "@peanut/validators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthoredDocumentsService } from "./authored-documents.service";
const editSchema = authoredDocumentSchema
  .extend({ revision: z.number().int().min(1) })
  .strict();
const parse = <S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
): z.output<S> => {
  const r = schema.safeParse(body);
  if (!r.success)
    throw new BadRequestException(
      r.error.issues.map((i) => i.message).join(" "),
    );
  return r.data;
};
@Controller("authored-documents")
@UseGuards(AuthGuard, RolesGuard)
export class AuthoredDocumentsController {
  constructor(private readonly service: AuthoredDocumentsService) {}
  @Get()
  list(@CurrentUser() u: any) {
    return this.service.list(u.workspaceId, u.role);
  }
  @Post("preview")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  async preview(@CurrentUser() u: any, @Body() body: unknown, @Res() res: any) {
    return res
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send(
        await this.service.preview(
          u.workspaceId,
          u.role,
          parse(authoredDocumentSchema, body),
        ),
      );
  }
  @Post()
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  create(@CurrentUser() u: any, @Body() body: unknown) {
    return this.service.create(
      u.workspaceId,
      u.id,
      u.role,
      parse(authoredDocumentSchema, body),
    );
  }
  @Get(":id")
  get(@CurrentUser() u: any, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(u.workspaceId, id, u.role);
  }
  @Get(":id/preview")
  async render(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: any,
  ) {
    return res
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send(await this.service.render(u.workspaceId, id, u.role));
  }
  @Put(":id")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  update(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const { revision, ...input } = parse(editSchema, body);
    return this.service.update(
      u.workspaceId,
      id,
      u.id,
      u.role,
      input,
      revision,
    );
  }
  @Post(":id/finalize")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  finalize(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.service.finalize(
      u.workspaceId,
      id,
      u.id,
      u.role,
      parse(revisionSchema, body).revision,
    );
  }
}
