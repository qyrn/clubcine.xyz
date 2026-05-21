import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSiteLocked } from "@/lib/launch";

export function proxy(request: NextRequest) {
  if (!isSiteLocked()) return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (
    path === "/soon" ||
    path === "/soon/opengraph-image" ||
    path === "/api/health"
  ) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL("/soon", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|sw\\.js).*)"],
};
