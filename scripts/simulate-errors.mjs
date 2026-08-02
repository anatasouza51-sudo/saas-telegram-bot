function formatTelegramError(description) {
  if (!description) return "Erro desconhecido na API do Telegram";
  if (description.includes("bot was kicked")) return "O bot foi removido do grupo ou canal.";
  if (description.includes("not enough rights")) return "O bot não tem permissões suficientes para postar (precisa ser admin).";
  if (description.includes("chat not found")) return "O grupo ou canal não foi encontrado. Verifique se o bot ainda é membro.";
  if (description.includes("user is deactivated")) return "O bot está desativado.";
  if (description.includes("message is too long")) return "A mensagem é muito longa para o Telegram.";
  return `Telegram: ${description}`;
}

const errorsToTest = [
  "Forbidden: bot was kicked from the supergroup chat",
  "Bad Request: not enough rights to send text messages to the chat",
  "Bad Request: chat not found",
  "Bad Request: message is too long",
  "Unauthorized: bot is deactivated"
];

console.log("=== SIMULAÇÃO DE TRADUÇÃO DE ERROS (UX) ===\n");

errorsToTest.forEach(err => {
  console.log(`Erro Original: ${err}`);
  console.log(`Mensagem Amigável: ${formatTelegramError(err)}`);
  console.log("---");
});
