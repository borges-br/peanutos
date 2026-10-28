import { Injectable } from "@nestjs/common";
import { prisma } from "@peanut/db";

@Injectable()
export class AuditService {
  private sanitize(data: any): any {
    if (!data) return data;
    if (typeof data !== "object") return data;

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized = { ...data };
    const sensitiveKeys = [
      "password",
      "passwordhash", "passwordencrypted", "smtppassword",
      "token",
      "accesstoken",
      "refreshtoken",
      "authorization",
      "secret",
      "key",
      "password_hash",
      "sensitivedata",
      "sensitivedataencrypted",
      "remoteaccess",
      "vpn",
      "apikey",
      "credential",
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else if (
        typeof sanitized[key] === "object" &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }
    return sanitized;
  }

  async log(params: {
    workspaceId: string;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
    severity?: "INFO" | "WARN" | "SECURITY_ALERT";
  }) {
    try {
      const beforeJson = params.before
        ? JSON.stringify(this.sanitize(params.before))
        : null;
      const afterJson = params.after
        ? JSON.stringify(this.sanitize(params.after))
        : null;

      await prisma.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorUserId: params.actorUserId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeJson,
          afterJson,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          severity: params.severity || "INFO",
        },
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }

  public sanitizeForRead(data: any, role: string): any {
    if (!data) return data;
    if (typeof data !== "object") return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeForRead(item, role));
    }

    const sanitized = { ...data };

    // 1. General sensitive keys (applied to ALL roles)
    const generalKeys = [
      "password",
      "token",
      "secret",
      "key",
      "credential",
      "vpn",
      "bearer",
      "authorization",
    ];

    // 2. Technical sensitive keys (redacted for FINANCIAL and READ_ONLY)
    const techKeys = [
      "ipaddress",
      "macaddress",
      "hostname",
      "remoteaccessid",
      "ssh",
      "port",
      "host",
      "connection",
      "url",
      "database",
      "db",
    ];

    // 3. Financial sensitive keys (redacted for TECHNICIAN and READ_ONLY)
    const financialKeys = [
      "amount",
      "cents",
      "price",
      "billing",
      "invoice",
      "quote",
      "payment",
      "pix",
      "card",
      "cost",
      "value",
      "revenue",
    ];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      let shouldRedact = generalKeys.some((sub) => lowerKey.includes(sub));

      if (role === "FINANCIAL") {
        shouldRedact =
          shouldRedact || techKeys.some((sub) => lowerKey.includes(sub));
      } else if (role === "TECHNICIAN") {
        shouldRedact =
          shouldRedact || financialKeys.some((sub) => lowerKey.includes(sub));
      } else if (role === "READ_ONLY") {
        shouldRedact =
          shouldRedact ||
          techKeys.some((sub) => lowerKey.includes(sub)) ||
          financialKeys.some((sub) => lowerKey.includes(sub));
      }

      if (shouldRedact) {
        sanitized[key] = "[REDACTED]";
      } else if (
        typeof sanitized[key] === "object" &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeForRead(sanitized[key], role);
      }
    }
    return sanitized;
  }
}
