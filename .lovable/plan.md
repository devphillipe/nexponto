# Dias de trabalho por funcionário

Hoje o sistema assume que todo mundo trabalha de segunda a sexta. Vamos permitir escolher exatamente quais dias da semana cada colaborador trabalha, mantendo segunda a sexta como padrão.

## O que muda

**Cadastro e edição de colaborador**
- Nova seção "Dias de trabalho" dentro do bloco de jornada, com os sete dias (Seg a Dom) como botões/caixas selecionáveis.
- Segunda a sexta já vêm marcados ao cadastrar alguém novo.
- É obrigatório ter pelo menos um dia marcado.
- Atalhos rápidos: "Seg a Sex", "Todos os dias", "Limpar".
- Na lista de colaboradores, a coluna de jornada passa a mostrar também os dias (ex.: "8 horas · Seg, Ter, Qua, Qui, Sex").

**Cálculos passam a respeitar os dias escolhidos**
- Saldo mensal e resumo semanal do funcionário: dias fora da escala não geram horas esperadas (hoje isso só ignora sábado e domingo).
- Relatório em PDF: dias esperados, faltas e saldo seguem a escala de cada pessoa.
- Registro de ponto em lote e abono em lote: a opção "pular fins de semana" passa a ser "seguir a escala de cada colaborador", gerando datas apenas nos dias em que cada um trabalha.

**Portal do funcionário**
- O resumo mostra a escala dele ("Sua escala: Seg, Ter, Qua, Qui, Sex") e os dias sem expediente aparecem marcados como folga no gráfico semanal.

## Detalhes técnicos

- Migração aditiva em `employees`: coluna `work_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}'` (0 = domingo … 6 = sábado), com `CHECK` de array não vazio e valores entre 0 e 6. Registros existentes herdam o padrão Seg–Sex.
- `src/lib/employees.functions.ts`: `createEmployee` e `updateEmployee` recebem `work_days: number[]` validado por Zod (min 1 item, inteiros 0–6, sem duplicados), persistido na tabela.
- `src/routes/_admin.admin.funcionarios.tsx`: componente `WorkDaysPicker` reutilizado nos dois formulários; estado inicial `[1,2,3,4,5]` no cadastro e valor do banco na edição; coluna da tabela atualizada.
- `src/routes/_func.funcionario.resumo.tsx`: substituir a checagem `isWeekend` por `work_days.includes(d.getDay())`; incluir `work_days` no select do funcionário.
- `src/routes/_admin.admin.relatorios.tsx`: mesma troca no cálculo de `expectedMinutes`; incluir `work_days` no select.
- `src/routes/_admin.admin.pontos.tsx` e `_admin.admin.abonos.tsx`: `buildDateRange` passa a receber os dias válidos por colaborador, gerando a grade de datas por pessoa em vez de uma lista única.
- Fallback em todos os pontos: sem `work_days` definido, usa `[1,2,3,4,5]`.
