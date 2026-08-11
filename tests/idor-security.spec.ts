import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

function functionBlock(text: string, functionName: string) {
  const start = text.indexOf(`export async function ${functionName}`)
  expect(start, `${functionName} deve existir`).toBeGreaterThanOrEqual(0)
  return text.slice(start)
}

function assertTenantScopedMutation(
  block: string,
  mutation: "delete" | "update",
  table: string,
  idExpression: string,
) {
  const mutationStart = block.indexOf(`.${mutation}(${table})`)
  expect(mutationStart, `${mutation}(${table}) deve existir`).toBeGreaterThanOrEqual(0)
  const mutationBlock = block.slice(mutationStart, mutationStart + 900)
  expect(mutationBlock).toMatch(new RegExp(`eq\\(${table}\\.id, ${idExpression}\\)`))
  expect(mutationBlock).toMatch(new RegExp(`eq\\(${table}\\.ownerId, user\\.storeId\\)`))
}

test.describe("Parte 3 — IDOR / isolamento de tenant", () => {
  test("Tenant A não pode excluir chat do Tenant B em removeChat", () => {
    const block = functionBlock(source("app/actions/tg-channels.ts"), "removeChat")
    assertTenantScopedMutation(block, "delete", "telegramChats", "id")
    expect(block).toContain("eq(telegramChats.id, id)")
    expect(block).toContain("eq(telegramChats.ownerId, user.storeId)")
  })

  test("Tenant A não pode atualizar chat do Tenant B em syncGroupToAudience", () => {
    const block = functionBlock(source("app/actions/tg-auto-detect.ts"), "syncGroupToAudience")
    assertTenantScopedMutation(block, "update", "telegramChats", "groupId")
    expect(block).toContain('eq(telegramChats.ownerId, user.storeId)')
  })

  test("Tenant A não pode alterar isForum do Tenant B em addTopic", () => {
    const block = functionBlock(source("app/actions/tg-topics.ts"), "addTopic")
    const mutationStart = block.indexOf(".update(telegramChats)")
    expect(mutationStart).toBeGreaterThanOrEqual(0)
    const mutationBlock = block.slice(mutationStart, mutationStart + 500)
    expect(mutationBlock).toContain("eq(telegramChats.id, chat.id)")
    expect(mutationBlock).toContain("eq(telegramChats.ownerId, user.storeId)")
  })

  test("testTopic rejeita chatId de outro tenant antes de chamar o Telegram", () => {
    const block = functionBlock(source("app/actions/tg-topics.ts"), "testTopic")
    const tenantLookup = block.indexOf("eq(telegramChats.chatId, chatId)")
    const clientLookup = block.indexOf("getStoreTelegram(user.storeId)")
    const sendMessage = block.indexOf("client.sendMessage(chatId")
    expect(tenantLookup).toBeGreaterThanOrEqual(0)
    expect(clientLookup).toBeGreaterThan(tenantLookup)
    expect(sendMessage).toBeGreaterThan(clientLookup)
    expect(block).toContain('if (!chat) return { ok: false, error: "Grupo não encontrado." }')
  })

  test("Tenant A não pode agendar nem alterar status de post do Tenant B", () => {
    const block = functionBlock(source("app/actions/tg-posts.ts"), "schedulePost")
    assertTenantScopedMutation(block, "update", "telegramPosts", "id")
    expect(block).toContain("ownerId: user.storeId")
    expect(block).toContain("status: \"scheduled\"")
  })

  test("Tenant A não pode alterar role de usuário do Tenant B", () => {
    const block = functionBlock(source("app/actions/admins.ts"), "updateAdminRole")
    const mutationStart = block.indexOf(".update(user)")
    expect(mutationStart).toBeGreaterThanOrEqual(0)
    const mutationBlock = block.slice(mutationStart, mutationStart + 400)
    expect(mutationBlock).toContain("eq(user.id, userId)")
    expect(mutationBlock).toContain("storeMembers(actor.storeId)")
  })

  test("Tenant A não pode excluir usuário do Tenant B", () => {
    const block = functionBlock(source("app/actions/admins.ts"), "deleteAdmin")
    const mutationStart = block.indexOf(".delete(user)")
    expect(mutationStart).toBeGreaterThanOrEqual(0)
    const mutationBlock = block.slice(mutationStart, mutationStart + 400)
    expect(mutationBlock).toContain("eq(user.id, userId)")
    expect(mutationBlock).toContain("storeMembers(actor.storeId)")
  })

  test("os caminhos legítimos continuam exigindo capability e tenant do próprio ator", () => {
    const files = [
      ["app/actions/tg-channels.ts", "removeChat"],
      ["app/actions/tg-auto-detect.ts", "syncGroupToAudience"],
      ["app/actions/tg-topics.ts", "addTopic"],
      ["app/actions/tg-posts.ts", "schedulePost"],
      ["app/actions/admins.ts", "updateAdminRole"],
      ["app/actions/admins.ts", "deleteAdmin"],
    ] as const

    for (const [file, functionName] of files) {
      const block = functionBlock(source(file), functionName)
      expect(
        block.includes('requireCapability("posts.manage")') ||
          block.includes('requireCapability("admins.manage")'),
      ).toBe(true)
    }
  })
})
