# Auditoria de Formulários, Máscaras e Acessibilidade — NexPonto

## Status

- **Fase 1 — Fundação:** ✅ Concluída.
  - `src/lib/masks.ts`, `src/lib/validators.ts`, `MaskedInput`, `PasswordInput`, `PasswordStrengthMeter` e `src/components/forms/SpecializedInputs.tsx` (CpfInput, CnpjInput, CpfCnpjInput, PhoneInput, CepInput, DateBrInput, TimeInput).
- **Fase 2 — Auth e senha:** ✅ Concluída.
- **Fase 3 — Cadastros:** ✅ Concluída.
  - `funcionarios.tsx` (criar e editar): máscaras CPF, telefone, data BR; validação Zod com mensagens ptBR; `autocomplete` adequado; mensagens `role="alert"` e `aria-invalid`/`aria-describedby`.
  - `configuracoes.tsx`: `CpfCnpjInput` (dinâmico), `PhoneInput`, `CepInput` (com busca ViaCEP ao completar 8 dígitos).
- **Fase 4 — Ponto, correções, abonos:** ✅ Concluída.
  - `meu-ponto.tsx`: `aria-live` no próximo registro e na conclusão, `aria-busy`, `aria-label` com nome da ação, altura mínima 56/64px (touch target), `role="alert"` na conta inativa.
  - `pontos.tsx`: justificativa obrigatória (mín 3 chars) em todo registro/ajuste manual, `DialogDescription` explicando, ids consistentes nos `SelectTrigger`.
  - `abonos.tsx`: justificativa virou `Textarea` obrigatória (mín 3 chars) tanto no criar quanto no editar.
- **Fase 5 — Polimento a11y global:** ✅ Concluída.
  - Skip-link "Pular para o conteúdo principal" no `__root.tsx`.
  - `id="main-content"` nos `<main>` de `_admin.tsx` e `_func.tsx`.
  - `:focus-visible` global (outline ring) + `prefers-reduced-motion` em `styles.css`.

## Pontos pendentes (futuro)

- Migrar `meu-ponto`, `pontos` e `abonos` para `react-hook-form` + `zodResolver` quando refatorarmos com formulários mais ricos.
- Auditar contraste de `text-muted-foreground` sobre `bg-muted/10` (alguns rótulos `[8-10px]` podem ficar abaixo de AA — considerar `text-muted-foreground/80` mínimo).
- Implementar `CommandMenu` (já existe arquivo) com `aria-keyshortcuts`.
- Validar máscara de horário customizada em `pontos.tsx` (hoje usamos `<input type="time">` nativo, que já é acessível; o `TimeInput` mascarado está disponível se um dia trocarmos).
