# Geolocalização no registro de ponto

## Objetivo

Capturar a localização (GPS) do funcionário no momento da batida do ponto e exibi-la na aba **Pontos** do painel do escritório, através de um botão "Ver localização" que abre um modal com o mapa/endereço.

## Estado atual

- `time_entries` já armazena `ip` e `user_agent`, mas **não** possui coordenadas.
- A batida do funcionário acontece em `src/routes/_func.funcionario.meu-ponto.tsx` (insert direto no `time_entries`).
- A aba Pontos do admin (`src/routes/_admin.admin.pontos.tsx`) lista os registros agrupados por colaborador, sem nenhuma informação de local.
- Não existe nenhum código de geolocalização no projeto.

## Mudanças

### 1. Banco de dados (migração)
- Adicionar colunas `latitude` (numeric) e `longitude` (numeric) em `public.time_entries`, ambas nuláveis (registros antigos e manuais ficam sem localização).
- Ajustar a política de insert do funcionário para **permitir** latitude/longitude, mas mantendo-as opcionais (GPS pode ser negado pelo usuário — a batida não pode falhar por isso).

### 2. Captura no portal do funcionário (`meu-ponto.tsx`)
- Criar helper `src/lib/geolocation.ts` com `getCurrentPosition()` baseado em `navigator.geolocation`, com timeout curto (~5s) e precisão alta.
- No momento da batida, tentar obter as coordenadas **em paralelo** com o insert; se o usuário negar a permissão ou der timeout, registrar o ponto normalmente sem localização (UX não pode travar).
- Solicitar a permissão apenas na primeira batida (o navegador gerencia isso nativamente).

### 3. Exibição no painel do escritório (`_admin.admin.pontos.tsx`)
- Incluir `latitude, longitude` no select da query de `time_entries`.
- Em cada registro com coordenadas, exibir um botão/ícone discreto (ícone `MapPin`) com tooltip "Ver localização".
- Ao clicar, abrir um **Dialog** com:
  - Coordenadas formatadas.
  - Mini-mapa estático: usar um iframe do OpenStreetMap (embed gratuito, sem chave de API) centralizado na coordenada — leve, sem dependência nova e funciona offline-friendly.
  - Botão "Abrir no Google Maps" (`https://www.google.com/maps?q=lat,lng`) abrindo em nova aba.
- Registros sem localização (antigos ou manuais do admin) não exibem o botão.

### 4. Histórico do funcionário (opcional, incluído por consistência)
- Mostrar o mesmo ícone no histórico do funcionário (`_func.funcionario.historico.tsx`) quando houver localização, reutilizando o mesmo componente de modal.

## Componente novo

- `src/components/LocationDialog.tsx`: recebe `latitude`/`longitude`, renderiza botão MapPin + Dialog com iframe OpenStreetMap e link para Google Maps. Reutilizado em admin e funcionário.

## Notas técnicas

- `navigator.geolocation` exige HTTPS — já atendido (Lovable serve em HTTPS) e em PWA instalado funciona normalmente.
- Sem novas dependências de mapa (Leaflet/Mapbox seriam pesados para mobile); iframe do OSM resolve com zero custo de bundle.
- Sem mudanças no relatório PDF nesta etapa (pode ser adicionado depois, se desejado).
