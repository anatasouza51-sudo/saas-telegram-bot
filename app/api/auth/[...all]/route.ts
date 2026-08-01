// Better Auth endpoints removed — Clerk handles auth via /__clerk routes.
// This file is kept as a no-op to avoid 404 errors from any lingering references.
import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({ status: "deprecated" }, { status: 410 })
}

export function POST() {
  return NextResponse.json({ status: "deprecated" }, { status: 410 })
}
