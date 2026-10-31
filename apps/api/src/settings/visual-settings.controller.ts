import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  BadRequestException,
  Res,
} from "@nestjs/common";
import {
  z,
  saveVisualSchema,
  revisionSchema,
  restoreVisualSchema,
  brandAssetSchema,
} from "@peanut/validators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { VisualSettingsService } from "./visual-settings.service";

const previewSchema = saveVisualSchema
  .pick({ config: true })
  .extend({
    documentType: z.enum([
      "INVOICE",
      "QUOTE",
      "SERVICE_ORDER",
      "REPORT",
      "PROPOSAL",
    ]),
  })
  .strict();
function parse<S extends z.ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues.map((i) => i.message).join(" "),
    );
  return result.data;
}
@UseGuards(AuthGuard, RolesGuard)
@Controller("settings/visual")
export class VisualSettingsController {
  constructor(private readonly service: VisualSettingsService) {}
  @Get("active")
  active(@CurrentUser() user: any) {
    return this.service.active(user.workspaceId);
  }
  @Get()
  @Roles("OWNER", "ADMIN")
  get(@CurrentUser() user: any) {
    return this.service.get(user.workspaceId);
  }
  @Put("draft")
  @Roles("OWNER", "ADMIN")
  save(@CurrentUser() user: any, @Body() body: unknown) {
    return this.service.write(user.workspaceId, user.id, {
      ...parse(saveVisualSchema, body),
      action: "save",
    });
  }
  @Post("publish")
  @Roles("OWNER", "ADMIN")
  publish(@CurrentUser() user: any, @Body() body: unknown) {
    return this.service.write(user.workspaceId, user.id, {
      ...parse(revisionSchema, body),
      action: "publish",
    });
  }
  @Post("restore")
  @Roles("OWNER", "ADMIN")
  restore(@CurrentUser() user: any, @Body() body: unknown) {
    return this.service.write(user.workspaceId, user.id, {
      ...parse(restoreVisualSchema, body),
      action: "restore",
    });
  }
  @Post("assets")
  @Roles("OWNER", "ADMIN")
  upload(@CurrentUser() user: any, @Body() body: unknown) {
    return this.service.upload(
      user.workspaceId,
      user.id,
      parse(brandAssetSchema, body),
    );
  }
  @Post("preview")
  @Roles("OWNER", "ADMIN")
  async preview(
    @CurrentUser() user: any,
    @Body() body: unknown,
    @Res() res: any,
  ) {
    const input = parse(previewSchema, body);
    return res
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send(
        await this.service.preview(
          user.workspaceId,
          input.config,
          input.documentType,
        ),
      );
  }
}
