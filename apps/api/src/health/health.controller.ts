import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "UP",
      timestamp: new Date().toISOString(),
      service: "Peanut OS API",
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
      uptime: process.uptime(),
    };
  }
}
