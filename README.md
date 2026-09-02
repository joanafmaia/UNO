# UNO — Discord Activity

Activity de UNO em tempo real para Discord, com mesa sincronizada por canal de voz, skins, leaderboard e interface em Português / Inglês.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + `@discord/embedded-app-sdk`
- **Backend:** Node.js + Express + Socket.io
- **Persistência:** MongoDB (`players`) — perfis, skins, estatísticas e ranking

## Arranque rápido (modo local / mock)

Não precisas do Discord para testar a mesa: o cliente cria jogadores mock (um por separador do browser). O mock só funciona em localhost.

A persistência precisa de MongoDB. Escolhe uma:

```bash
# Docker (recomendado em local)
docker compose up -d mongo

# ou MongoDB instalado na máquina, à escuta em 27017
```

No Atlas, copia a connection string para `MONGODB_URI` no `.env` (base `uno`).

```bash
copy .env.example .env
npm install
npm install --prefix client
npm install --prefix server
npm run dev
```

Na primeira arranque, se ainda existir `server/data/players.json` e a colecção estiver vazia, esses perfis são importados para o MongoDB.

Abre **dois** separadores em [http://localhost:5173](http://localhost:5173) e clica **Começar partida**.

Query params úteis:

- `?name=Joana` — nome do jogador mock
- `?channel=sala-2` — outra mesa de canal (como dois canais Discord)
- `?table=K7P2` — entra na mesa com esse código
- `?lang=en` — força inglês no mock

Testes do motor: `npm test`

## Discord Developer Portal

1. Cria uma aplicação em [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Em **OAuth2**, copia o Client ID e o Client Secret para o `.env`
3. Ativa **Activities**
4. URL Mappings (Activities → URL Mappings). **Sem `https://` no Target.** Coloca os prefixos mais longos **acima** de `/`:

| Prefix | Target (dev / túnel) | Target (Render) |
| --- | --- | --- |
| `/socket.io` | `<túnel>/socket.io` | `<serviço>.onrender.com/socket.io` |
| `/api` | `<túnel>/api` | `<serviço>.onrender.com/api` |
| `/` | `<túnel>` (Vite 5173) | `<serviço>.onrender.com` |

5. Scopes OAuth usados: `identify`, `guilds`
6. Comando **`/playuno`** (abre a Activity neste canal):
   1. Em **Bot**, cria o bot e copia o token para `DISCORD_BOT_TOKEN`
   2. Em **General Information**, copia a **Public Key** para `DISCORD_PUBLIC_KEY`
   3. Convida a app ao servidor: `https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot%20applications.commands`
   4. Expõe o backend em HTTPS e em **General Information → Interactions Endpoint URL** mete `https://<serviço>.onrender.com/api/interactions`
   5. Reinicia o servidor — ele regista `/playuno`. No Discord, escreve `/playuno` para abrir a mesa

O SDK:

1. Chama `discordSdk.ready()`
2. Faz `authorize` e envia o `code` + `channelId` para `POST /api/token`
3. Faz `authenticate` com o `access_token` e guarda o `session_token`
4. A sala Socket.io é o `channelId` gravado na sessão (o cliente não escolhe outra mesa)
5. Lê `discordSdk.locale` / `userSettingsGetLocale()` para o idioma

## API

Rotas públicas:

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/token` | Troca o código OAuth (ou mock local) por `access_token` + `session_token` |
| GET | `/api/leaderboard` | Top 10 (vitórias, depois pontos) |
| GET | `/api/avatars` | Catálogo de avatares |
| GET | `/api/cosmetics` | Feltros, versos e molduras |
| GET | `/api/health` | Health check (`mongo: true` se a base responder) |

Rotas autenticadas (`Authorization: Bearer <session_token>`):

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/me` | Perfil da sessão |
| PATCH | `/api/me/avatar` | Equipar skin desbloqueada |
| PATCH | `/api/me/cosmetics` | Apelido, feltro, verso, moldura, título |

O Socket.io exige o mesmo `sessionToken` em `handshake.auth`. A identidade (`discordId`, username, avatar) vem da sessão. A mesa pode ser a do canal Discord ou uma sala com código (`join_room` com `{ code }` / `{ create: true }`).

## Eventos Socket.io

`join_room` (mesa do canal, ou `{ code }` / `{ create: true }`), `start_game`, `set_rules`, `play_card`, `choose_color`, `choose_swap`, `challenge_plus4`, `draw_card`, `pass_turn`, `shout_uno`, `catch_uno`, `react`, `update_cosmetics`, `play_again`, `add_bot`, `remove_bot`

O servidor emite `game_state` **por jogador** (cada um só vê a própria mão). As mensagens de jogo são chaves i18n (`events.played_card`, etc.) para cada cliente traduzir no seu idioma.

## Regras implementadas

Baralho de 108 cartas, cores, Skip, Reverse, +2, Wild e +4.

- Jogadas válidas: mesma cor **ou** mesmo valor; Wild sempre; **+4 é sempre jogável** — o próximo jogador pode **desafiar** (se o +4 era batota, o acusador leva 4; se era legal, o desafiante leva 6). Com Stack ligado o desafio não se aplica
- Reverse com 2 jogadores = Skip
- +2 / +4: o próximo compra e perde o turno (ou empilha, se Stack estiver ligado)
- Jump-in: jogar a mesma carta fora da vez (desligado em coringas e com pilha +2/+4)
- UNO: grita com 2 ou 1 carta; outro jogador pode **Apanhar UNO** (+2)
- Jogador que desliga: a vez passa automaticamente ao fim de ~8 segundos
- Pontos no fim: números = face, ações = 20, coringas = 50

## Render + UptimeRobot

Um único Web Service: o Express serve a API, o Socket.io e o `client/dist`.

1. [Render](https://render.com) → **New → Web Service** → liga o repo `joanafmaia/UNO` (branch `main`)
2. **Build Command:** `npm run build` · **Start Command:** `npm start`
3. **Health Check Path:** `/api/health`
4. Variáveis (Environment):

| Chave | Notas |
| --- | --- |
| `NODE_ENV` | `production` (o Render já mete isto) |
| `ALLOW_DEV_MOCK` | `false` |
| `MONGODB_URI` | string do Atlas (`...mongodb.net/uno`) |
| `DISCORD_CLIENT_ID` | o mesmo Client ID da app |
| `VITE_DISCORD_CLIENT_ID` | **igual** ao Client ID — precisa de existir **no build** |
| `DISCORD_CLIENT_SECRET` | OAuth2 |
| `DISCORD_BOT_TOKEN` | para registar `/playuno` |
| `DISCORD_PUBLIC_KEY` | Interactions Endpoint |

5. No Atlas → **Network Access** → permite `0.0.0.0/0` (os IPs do Render mudam)
6. Depois do deploy, no Discord:
   - URL Mappings para `<serviço>.onrender.com` (tabela acima)
   - **Interactions Endpoint URL:** `https://<serviço>.onrender.com/api/interactions`
7. Se mudares `VITE_DISCORD_CLIENT_ID`, faz **Manual Deploy** (a variável entra no `vite build`)

### Manter acordado (plano Free)

O Render Free adormece ~15 min sem tráfego. No [UptimeRobot](https://uptimerobot.com):

- Monitor: **HTTPS**
- URL: `https://<serviço>.onrender.com/api/health`
- Intervalo: **5 minutos**
- Keyword (opcional): `"ok":true`

Não uses a raiz `/` — devolve o HTML da app. O health confirma Node + Mongo.

## Estrutura

```
client/src/          React (App, mesa, perfil, leaderboard, i18n, SDK)
client/public/assets/avatars/   Skins SVG
shared/cosmetics.js  Catálogo partilhado (IDs + desbloqueios)
server/server.js     Express + Socket.io
server/game/         Motor UNO + salas por channelId
server/store/        MongoDB (perfis / ranking)
server/auth/         Sessões OAuth / mock
```
