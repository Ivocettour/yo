import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "gastos_session";
const PUBLIC_PATHS = ["/login", "/register", "/offline"];

/**
 * Proteccion de rutas a nivel de red: sin cookie de sesion no se llega a la app.
 * La verificacion real de la sesion (contra la base) se hace en el layout y en cada action.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + request.nextUrl.search)}` : "";
    return NextResponse.redirect(url);
  }
  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Todo salvo assets estaticos, iconos, manifest y service worker.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt|.*\.(?:png|svg|jpg|jpeg|webp|ico)$).*)",
  ],
};
