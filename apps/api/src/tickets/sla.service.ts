import { Injectable } from "@nestjs/common";
import { TicketPriority, prisma } from "@peanut/db";

export interface SlaDueDates {
  slaDueFirstResponseAt: Date;
  slaDueStartAt: Date;
  slaDueResolutionAt: Date;
}

const DEFAULT_SLA_MINUTES: Record<
  TicketPriority,
  { response: number; start: number; resolution: number }
> = {
  CRITICAL: { response: 15, start: 30, resolution: 240 }, // 15m | 30m | 4h (240m)
  URGENT: { response: 30, start: 60, resolution: 480 }, // 30m | 1h (60m) | 8h (480m)
  HIGH: { response: 60, start: 120, resolution: 1440 }, // 1h (60m) | 2h (120m) | 24h (1440m)
  MEDIUM: { response: 120, start: 240, resolution: 2880 }, // 2h (120m) | 4h (240m) | 48h (2880m)
  LOW: { response: 240, start: 960, resolution: 7200 }, // 4h (240m) | 16h (960m) | 120h (7200m)
};

@Injectable()
export class SlaService {
  /**
   * Calculates dynamic SLA deadlines (response, start, resolution) for a ticket.
   * If a custom SlaPolicy is active in the workspace, uses it. Fallback is the approved standard policy times.
   */
  async calculateSla(
    workspaceId: string,
    priority: TicketPriority,
    openedAt: Date = new Date(),
  ): Promise<SlaDueDates & { slaPolicyId: string | null }> {
    try {
      const policy = await prisma.slaPolicy.findFirst({
        where: {
          workspaceId,
          priority,
          active: true,
        },
      });

      const minutes = policy
        ? {
            response: policy.firstResponseMinutes,
            start: policy.startMinutes,
            resolution: policy.resolutionMinutes,
          }
        : DEFAULT_SLA_MINUTES[priority];

      const addMinutes = (date: Date, mins: number) => {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + mins);
        return result;
      };

      return {
        slaPolicyId: policy?.id || null,
        slaDueFirstResponseAt: addMinutes(openedAt, minutes.response),
        slaDueStartAt: addMinutes(openedAt, minutes.start),
        slaDueResolutionAt: addMinutes(openedAt, minutes.resolution),
      };
    } catch (error) {
      // Graceful fallback if database read fails
      const minutes = DEFAULT_SLA_MINUTES[priority];
      const addMinutes = (date: Date, mins: number) => {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + mins);
        return result;
      };

      return {
        slaPolicyId: null,
        slaDueFirstResponseAt: addMinutes(openedAt, minutes.response),
        slaDueStartAt: addMinutes(openedAt, minutes.start),
        slaDueResolutionAt: addMinutes(openedAt, minutes.resolution),
      };
    }
  }
}
