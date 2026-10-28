import { Controller, Get, Query, UseGuards, Module } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { prisma, Prisma } from "@peanut/db";

@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  @Get()
  async search(@CurrentUser() user: any, @Query("q") input = "") {
    const q = String(input).trim().slice(0, 100);
    if (q.length < 2) return { data: [] };
    const finance = ["OWNER", "ADMIN", "FINANCIAL"].includes(user.role);
    const technical = ["OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY"].includes(
      user.role,
    );
    const folded = q
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const roots = folded
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .slice(0, 8)
      .map((word) =>
        word.length > 4
          ? word.replace(/(oes|ao|mente|amentos|amento|ando|endo|indo|s)$/, "")
          : word,
      )
      .map((word) => word + ":*")
      .join(" & ");
    // Fixed query fragments only; every user value is bound. Portuguese stemming
    // matches inflected words; literal identifiers remain searchable too.
    const sources = [
      Prisma.sql`SELECT id,coalesce("tradeName","legalName") label,concat_ws(' ',"legalName","tradeName",document,email) corpus,'Cliente' kind,concat('/dashboard/clients/',id) href FROM clients WHERE "workspaceId"=${user.workspaceId}::uuid`,
      ...(technical
        ? [
            Prisma.sql`SELECT id,name label,concat_ws(' ',name,hostname,"serialNumber") corpus,'Equipamento' kind,concat('/dashboard/clients/',"clientId",'/assets/',id) href FROM assets WHERE "workspaceId"=${user.workspaceId}::uuid`,
          ]
        : []),
      Prisma.sql`SELECT id,concat(number,' · ',title) label,concat_ws(' ',number,title) corpus,'Chamado' kind,concat('/dashboard/tickets/',id) href FROM tickets WHERE "workspaceId"=${user.workspaceId}::uuid`,
      Prisma.sql`SELECT id,concat(number,' · ',title) label,concat_ws(' ',number,title) corpus,'Contrato' kind,concat('/dashboard/contracts/',id) href FROM contracts WHERE "workspaceId"=${user.workspaceId}::uuid`,
      ...(finance
        ? [
            Prisma.sql`SELECT id,concat(number,' · ',"clientName") label,concat_ws(' ',number,"clientName",observations) corpus,'Fatura' kind,concat('/dashboard/invoices/',id) href FROM invoices WHERE "workspaceId"=${user.workspaceId}::uuid`,
          ]
        : []),
      ...(finance
        ? [
            Prisma.sql`SELECT id,concat(number,' · ',"clientName") label,concat_ws(' ',number,"clientName",observations) corpus,'Orçamento' kind,concat('/dashboard/quotes/',id) href FROM quotes WHERE "workspaceId"=${user.workspaceId}::uuid`,
          ]
        : []),
      Prisma.sql`SELECT id,concat(number,' · ',title) label,concat_ws(' ',number,title) corpus,'Ordem de serviço' kind,concat('/dashboard/service-orders/',id) href FROM service_orders WHERE "workspaceId"=${user.workspaceId}::uuid`,
      ...(finance
        ? [
            Prisma.sql`SELECT id,description label,description corpus,'Item do contrato' kind,concat('/dashboard/contracts/',"contractId") href FROM contract_line_items WHERE "workspaceId"=${user.workspaceId}::uuid`,
          ]
        : []),
    ];
    const data = await prisma.$queryRaw<any[]>(Prisma.sql`
      WITH records AS (${Prisma.join(sources, " UNION ALL ")})
      SELECT id,label,kind,href FROM records
      WHERE to_tsvector('portuguese',corpus) @@ websearch_to_tsquery('portuguese',${q}) OR corpus ILIKE ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"}
      OR (${roots !== ""} AND to_tsvector('simple',translate(lower(corpus),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')) @@ to_tsquery('simple',${roots || "zzemptyquery"}))
      ORDER BY ts_rank(to_tsvector('portuguese',corpus),websearch_to_tsquery('portuguese',${q})) DESC,label LIMIT 15`);
    return { data };
  }
}
@Module({ imports: [AuthModule], controllers: [SearchController] })
export class SearchModule {}
