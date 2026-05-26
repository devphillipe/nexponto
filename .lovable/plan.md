
# Auditoria de Formulários, Máscaras e Acessibilidade — NexPonto

O escopo solicitado é enorme (20 tópicos, ~15 formulários, criação de ~15 componentes reutilizáveis, auditoria a11y completa). Para entregar com qualidade de SaaS profissional sem quebrar o que já funciona, proponho dividir em **5 fases incrementais**. Cada fase é entregável e testável isoladamente.

## Fase 1 — Fundação: componentes reutilizáveis + validação

Criar a base que todas as telas vão consumir, sem ainda mexer nas telas existentes.

- `src/lib/masks.ts` — máscaras puras: CPF, CNPJ, CPF/CNPJ dinâmico, telefone BR (fixo/celular dinâmico), CEP, data DD/MM/AAAA, hora HH:mm, decimal. Cada uma com `format`, `unformat`, `isValid`.
- `src/lib/validators.ts` — schemas Zod reutilizáveis: `emailSchema`, `cpfSchema`, `cnpjSchema`, `phoneSchema`, `strongPasswordSchema`, `timeSchema`, `dateSchema`, `punchSequenceSchema` (valida ordem entrada → saída-almoço → retorno → saída).
- `src/components/forms/MaskedInput.tsx` — wrapper de `Input` com máscara, `inputMode` correto, valor limpo/formatado separados, `aria-invalid`, `aria-describedby`.
- `src/components/forms/FormField.tsx` — label + input + erro + hint padronizados, todos com `id`/`htmlFor`/`aria-describedby` corretos.
- `src/components/forms/PasswordInput.tsx` — toggle mostrar/ocultar acessível (`aria-pressed`, `aria-label` dinâmico), `autocomplete` configurável.
- `src/components/forms/PasswordStrengthMeter.tsx` — barra + texto ("Fraca/Média/Boa/Forte") + lista de requisitos com `aria-live="polite"`, ícones com texto, não dependente só de cor.
- `src/components/forms/SubmitButton.tsx` — estado loading/disabled, anti-duplo-clique, `aria-busy`.
- Especializações finas em cima de `MaskedInput`: `CpfInput`, `CnpjInput`, `CpfOuCnpjInput`, `PhoneInput`, `CepInput`, `DateInput`, `TimeInput`.

Instalar `react-hook-form` + `@hookform/resolvers` (Zod já está no projeto via `zod`, confirmar).

## Fase 2 — Auth e fluxos de senha

Refatorar usando os novos componentes:

- `src/routes/admin.login.tsx` e `src/routes/funcionario.login.tsx` — RHF + Zod, `autocomplete="email"`/`current-password`, toggle de senha, mensagens em ptBR via `translateAuthError` (já existe), foco visível, sem revelar se o e-mail existe.
- `src/routes/admin.cadastro.tsx` — cadastro de empresa + admin com máscara CNPJ/CPF/telefone, força de senha, requisitos visíveis, `autocomplete="organization"` etc.
- `src/routes/auth.reset-password.tsx` — adicionar `PasswordStrengthMeter`, confirmação de senha, validação de não-igual-ao-e-mail.
- `src/routes/_func.funcionario.perfil.tsx` — alteração de senha com senha atual + nova + confirmar + medidor.

## Fase 3 — Cadastros (empresa e funcionários)

- `src/routes/_admin.admin.funcionarios.tsx` — dialog de cadastro/edição com máscaras CPF, telefone, data de admissão (DD/MM/AAAA), validação Zod, mensagens claras, `autocomplete` adequado.
- `src/routes/_admin.admin.configuracoes.tsx` — dados da empresa (CNPJ, telefone, CEP).

## Fase 4 — Ponto, correções, abonos

- `src/routes/_func.funcionario.meu-ponto.tsx` — auditoria a11y do botão principal: texto dinâmico "Próximo registro: …", confirmação textual após click, `aria-live` para horário registrado, anti-duplo-clique, tamanho de toque ≥ 44px.
- `src/routes/_admin.admin.pontos.tsx` — correção manual com `TimeInput`, justificativa obrigatória, validação de sequência (saída-almoço ≥ entrada, etc.).
- `src/routes/_admin.admin.abonos.tsx` — `DateInput` + motivo obrigatório.

## Fase 5 — Polimento a11y global

- Verificar `<main>` único por rota, headings em ordem, foco visível global em `src/styles.css` (`:focus-visible` tokens).
- Botões icon-only com `aria-label`.
- Toasts (sonner) já são acessíveis; confirmar `richColors` + texto, não só cor.
- Contraste de `text-muted-foreground` sobre `bg-background` (verificar tokens em `styles.css`).
- Skip-link "Pular para conteúdo" no `__root.tsx`.

---

## Como quero proceder

Cada fase é ~1 mensagem minha, com diff focado e testável. Isso evita uma mega-PR de 30+ arquivos que arrisca regressões em login/ponto (fluxos críticos).

**Confirme uma das opções:**

1. **Começar pela Fase 1 + Fase 2** agora (fundação + auth/senha — o que tem maior impacto em segurança/UX imediato).
2. **Outra ordem de prioridade** (ex.: começar pelo registro de ponto que é o uso diário do funcionário).
3. **Fazer tudo em uma única passada** (mais arriscado; vou priorizar correções estruturais e pular detalhes finos).

Qual prefere?
