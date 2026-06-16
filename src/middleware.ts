import { NextResponse, type NextRequest } from "next/server";

// 没登录(无 wb_uid cookie)就跳到 onboarding。api / 静态资源不拦。
// 注意:这里不 import auth.ts,避免把 prisma 等 node 依赖拖进 edge runtime。
export function middleware(req: NextRequest) {
  const uid = req.cookies.get("wb_uid")?.value;
  const { pathname } = req.nextUrl;
  if (!uid && !pathname.startsWith("/onboarding")) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
