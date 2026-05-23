// Traduz mensagens de erro do Supabase Auth para pt-BR.
// Faz match por substring (case-insensitive) na mensagem original em inglês.

const MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/invalid email or password/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "E-mail ainda não confirmado. Verifique sua caixa de entrada."],
  [/email rate limit exceeded/i, "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."],
  [/rate limit/i, "Muitas tentativas em pouco tempo. Tente novamente em instantes."],
  [/over.?email.?send.?rate.?limit/i, "Limite de envios de e-mail atingido. Aguarde alguns minutos."],
  [/user not found/i, "Não encontramos uma conta com este e-mail."],
  [/user already registered/i, "Já existe uma conta com este e-mail."],
  [/email address.*invalid/i, "E-mail inválido. Verifique o endereço digitado."],
  [/invalid email/i, "E-mail inválido. Verifique o endereço digitado."],
  [/password.*should be at least/i, "A senha deve ter pelo menos 8 caracteres."],
  [/password.*too short/i, "A senha é muito curta. Use no mínimo 8 caracteres."],
  [/weak password/i, "Senha muito fraca. Use letras, números e símbolos."],
  [/same as.*old password/i, "A nova senha não pode ser igual à atual."],
  [/new password should be different/i, "A nova senha precisa ser diferente da anterior."],
  [/token has expired/i, "O link expirou. Solicite um novo e-mail de recuperação."],
  [/expired/i, "O link expirou. Solicite um novo e-mail de recuperação."],
  [/invalid.*token/i, "Link inválido. Solicite um novo e-mail de recuperação."],
  [/jwt expired/i, "Sua sessão expirou. Faça login novamente."],
  [/network|fetch failed|failed to fetch/i, "Falha de conexão. Verifique sua internet e tente novamente."],
  [/unauthorized/i, "Não autorizado. Verifique suas credenciais."],
];

export function translateAuthError(err: unknown, fallback = "Ocorreu um erro inesperado. Tente novamente."): string {
  const msg =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : "";
  if (!msg) return fallback;
  for (const [re, translated] of MAP) {
    if (re.test(msg)) return translated;
  }
  return fallback;
}
