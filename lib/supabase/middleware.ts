import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // Check if user is authenticated via cookie (set by client-side login)
  const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"

  // Protect all routes except login and public assets
  if (!isAuthenticated && !request.nextUrl.pathname.startsWith("/auth") && request.nextUrl.pathname !== "/") {
    // Redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}
