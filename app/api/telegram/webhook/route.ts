import { NextResponse } from "next/server"
import type { TelegramUpdate } from "@/lib/telegram"
import { handleUpdate } from "@/lib/bot"

export async function POST(req: Request) {
  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  try {
    await handleUpdate(update)
  } catch (err) {
    console.log("[v0] telegram webhook error:", err)
  }

  // Always ack so Telegram doesn't retry indefinitely.
  return NextResponse.json({ ok: true })
}
