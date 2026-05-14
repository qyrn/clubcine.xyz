import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSiteLocked } from "@/lib/launch";

export function middleware(request: NextRequest) {
  if (!isSiteLocked()) return NextResponse.next();
  if (request.nextUrl.pathname === "/soon") return NextResponse.next();
  return NextResponse.rewrite(new URL("/soon", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
