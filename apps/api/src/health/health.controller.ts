import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "Peanut OS";
    return {
      status: "UP",
      timestamp: new Date().toISOString(),
      service: `${brandName} Modular Monolith API`,
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
      uptime: process.uptime(),
    };
  }
}
