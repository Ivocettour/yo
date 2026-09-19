import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildBackup, buildCsvExport } from "@/lib/backup/service";
import { todayInTimezone } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

/** GET /api/export?format=json|csv — descarga los datos del usuario autenticado. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = todayInTimezone(user.timezone);

  try {
    if (format === "csv") {
      const csv = await buildCsvExport(user.id);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="gastos-${stamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const backup = await buildBackup(user.id);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="gastos-backup-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar la exportación" }, { status: 500 });
  }
}
