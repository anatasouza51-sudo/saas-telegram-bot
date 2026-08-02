const API_BASE = "https://api.telegram.org/bot";

class TelegramClient {
  constructor(token) {
    this.token = token;
  }

  get botId() {
    const prefix = this.token.split(":")[0];
    const id = Number(prefix);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  async callApi(method, payload) {
    const startedAt = Date.now();
    try {
      const res = await fetch(`${API_BASE}${this.token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      const elapsed = Date.now() - startedAt;
      
      if (!data.ok) {
        console.log(`[LOG SERVIDOR] Method: ${method} | Bot: ${this.botId} | Status: ${res.status} | Elapsed: ${elapsed}ms | Error: ${data.description || "Unknown error"}`);
      }
      return data;
    } catch (err) {
      console.error(`[LOG SERVIDOR] CRITICAL Method: ${method} | Exception: ${err.message}`);
      return { ok: false, description: err.message };
    }
  }

  getMe() { return this.callApi("getMe", {}); }
  getChat(chatId) { return this.callApi("getChat", { chat_id: chatId }); }
  getChatMember(chatId, userId) { return this.callApi("getChatMember", { chat_id: chatId, user_id: userId }); }
  sendMessage(chatId, text, options) {
    return this.callApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "HTML",
    });
  }
}

function formatTelegramError(description) {
  if (!description) return "Erro desconhecido na API do Telegram";
  if (description.includes("bot was kicked")) return "O bot foi removido do grupo ou canal.";
  if (description.includes("not enough rights")) return "O bot não tem permissões suficientes para postar (precisa ser admin).";
  if (description.includes("chat not found")) return "O grupo ou canal não foi encontrado. Verifique se o bot ainda é membro.";
  if (description.includes("user is deactivated") || description.includes("bot is deactivated")) return "O bot está desativado.";
  if (description.includes("message is too long")) return "A mensagem é muito longa para o Telegram.";
  return `Telegram: ${description}`;
}

async function runTest() {
  const token = process.argv[2];
  const chatId = process.argv[3];

  if (!token) {
    console.log("Uso: node scripts/validate-telegram.mjs <BOT_TOKEN> [CHAT_ID]");
    process.exit(1);
  }

  const client = new TelegramClient(token);
  console.log(`\n--- Testando Bot ID: ${client.botId} ---`);

  const me = await client.getMe();
  if (!me.ok) {
    console.error("❌ Falha na conexão:", me.description);
    return;
  }
  console.log(`✅ Conectado como: ${me.result.first_name} (@${me.result.username})`);

  if (!chatId) {
    console.log("\n⚠️ Chat ID não fornecido. Para testar o envio, execute:");
    console.log(`node scripts/validate-telegram.mjs ${token} <SEU_CHAT_ID>`);
    return;
  }

  console.log(`\n--- Testando Chat: ${chatId} ---`);
  const chat = await client.getChat(chatId);
  if (!chat.ok) {
    console.error("❌ Erro ao buscar chat:", formatTelegramError(chat.description));
    return;
  }
  console.log(`✅ Destino: ${chat.result.title || "Privado"} (${chat.result.type})`);

  const member = await client.getChatMember(chatId, me.result.id);
  if (member.ok) {
    console.log(`✅ Permissão do bot: ${member.result.status}`);
  }

  console.log("\n--- Testando Envio ---");
  const res = await client.sendMessage(chatId, "🧪 *Teste de Integração Manus*\n\nSe você está vendo esta mensagem, o fluxo de publicação está funcionando corretamente!", { parseMode: "Markdown" });
  
  if (res.ok) {
    console.log("✅ Mensagem enviada com sucesso!");
  } else {
    console.error("❌ Falha no envio:", formatTelegramError(res.description));
  }
}

runTest().catch(console.error);
