import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";

@Controller()
export class InboundController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("inbound/:endpointId")
  async handleInboundPublic(
    @Param("endpointId") endpointId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const timestamp = req.headers["x-peanut-timestamp"];
    const signature = req.headers["x-peanut-signature"];

    if (!timestamp || !signature) {
      throw new BadRequestException(
        "Headers X-Peanut-Timestamp ou X-Peanut-Signature ausentes",
      );
    }

    // Access raw request body buffer and convert it to string
    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";

    return this.webhooksService.handleInbound(
      endpointId,
      timestamp,
      signature,
      rawBody,
      body,
      ip,
      ua,
    );
  }
}
