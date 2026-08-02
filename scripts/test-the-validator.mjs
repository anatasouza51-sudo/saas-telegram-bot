const API_BASE = "https://api.telegram.org/bot";

// Mock do TelegramClient para testes de unidade
class TelegramClientMock {
  constructor(token, mockResponses) {
    this.token = token;
    this.mockResponses = mockResponses;
    this.botId = 123456;
  }

  async callApi(method, payload) {
    const response = this.mockResponses[method] || { ok: false, description: "Mock not found" };
    console.log(`[MOCK] Chamando ${method} com payload:`, JSON.stringify(payload).substring(0, 50));
    
    if (!response.ok) {
      console.log(`[LOG SIMULADO] Method: ${method} | Bot: ${this.botId} | Status: ${response.status || 400} | Error: ${response.description}`);
    }
    return response;
  }

  getMe() { return this.callApi("getMe", {}); }
  getChat(chatId) { return this.callApi("getChat", { chat_id: chatId }); }
  getChatMember(chatId, userId) { return this.callApi("getChatMember", { chat_id: chatId, user_id: userId }); }
  sendMessage(chatId, text, options) {
    return this.callApi("sendMessage", { chat_id: chatId, text });
  }
}

function formatTelegramError(description) {
  if (!description) return "Erro desconhecido na API do Telegram";
  if (description.includes("bot was kicked")) return "O bot foi removido do grupo ou canal.";
  if (description.includes("not enough rights")) return "O bot não tem permissões suficientes para postar (precisa ser admin).";
  if (description.includes("chat not found")) return "O grupo ou canal não foi encontrado. Verifique se o bot ainda é membro.";
  return `Telegram: ${description}`;
}

async function runValidationTests() {
  console.log("=== INICIANDO TESTES DE VALIDAÇÃO DO SCRIPT ===\n");

  // Cenário 1: Sucesso Total
  console.log("CENÁRIO 1: Sucesso Total");
  const successClient = new TelegramClientMock("valid:token", {
    getMe: { ok: true, result: { id: 123456, first_name: "TestBot", username: "test_bot" } },
    getChat: { ok: true, result: { title: "Grupo VIP", type: "supergroup" } },
    getChatMember: { ok: true, result: { status: "administrator" } },
    sendMessage: { ok: true, result: { message_id: 999 } }
  });
  
  const me = await successClient.getMe();
  console.log(`- Conexão: ${me.ok ? "✅ OK" : "❌ Falha"}`);
  const msg = await successClient.sendMessage("-100123", "Olá");
  console.log(`- Envio: ${msg.ok ? "✅ OK" : "❌ Falha"}\n`);

  // Cenário 2: Bot Removido (403 Forbidden)
  console.log("CENÁRIO 2: Bot Removido (403)");
  const kickedClient = new TelegramClientMock("valid:token", {
    getMe: { ok: true, result: { id: 123456, first_name: "TestBot" } },
    getChat: { ok: false, status: 403, description: "Forbidden: bot was kicked from the supergroup chat" }
  });
  
  const chatRes = await kickedClient.getChat("-100123");
  console.log(`- Resposta API: ${chatRes.description}`);
  console.log(`- Mensagem Amigável: ${formatTelegramError(chatRes.description)}\n`);

  // Cenário 3: Sem Permissão de Admin
  console.log("CENÁRIO 3: Sem Permissão de Admin");
  const noRightsClient = new TelegramClientMock("valid:token", {
    getMe: { ok: true, result: { id: 123456, first_name: "TestBot" } },
    sendMessage: { ok: false, status: 400, description: "Bad Request: not enough rights to send text messages to the chat" }
  });
  
  const sendRes = await noRightsClient.sendMessage("-100123", "Olá");
  console.log(`- Resposta API: ${sendRes.description}`);
  console.log(`- Mensagem Amigável: ${formatTelegramError(sendRes.description)}\n`);

  console.log("=== VALIDAÇÃO CONCLUÍDA COM SUCESSO ===");
}

runValidationTests();
