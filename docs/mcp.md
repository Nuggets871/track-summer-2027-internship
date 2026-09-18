# Serveur MCP (intégration ChatGPT)

Stage Copilot expose un serveur [MCP](https://modelcontextprotocol.io) sur
`/mcp`, ce qui permet à ChatGPT d'ajouter et de lister des offres de stage
directement dans l'application, sans exposer la base de données.

L'implémentation s'appuie sur le SDK officiel
[`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server)
(v2) et réutilise la logique métier existante (`src/lib/internships.ts`, mêmes
tables `Application` / `Company` / `Country` / `City` que le reste de l'app).

## Outils exposés

| Outil | Rôle |
|---|---|
| `addInternships` | Ajoute une ou plusieurs offres. Déduplique par URL normalisée, puis par entreprise + intitulé. Retourne pour chaque offre `created`, `skipped` (déjà présente) ou `rejected` (champs invalides). |
| `listInternships` | Liste les offres déjà enregistrées (id, entreprise, poste, url, pays, statut), avec filtres `query` / `status` / `limit`. À utiliser avant d'ajouter, pour vérifier les doublons. |

## 1. Configurer le(s) secret(s)

Générez un secret long :

```bash
openssl rand -hex 32
```

Deux modes d'authentification, activables indépendamment :

- **`MCP_URL_TOKEN`** — clé passée dans l'URL (`?key=…`). C'est le mode utilisé
  par le connecteur web ChatGPT, qui ne propose que `OAuth` / `Aucune` /
  `Mixte` (jamais de header statique).
- **`MCP_AUTH_TOKEN`** — header `Authorization: Bearer …`. Pour les clients qui
  gèrent un header personnalisé (Cursor, Codex CLI, API Responses).

```dotenv
MCP_URL_TOKEN="la-valeur-générée"
# MCP_AUTH_TOKEN="une-autre-valeur"   # optionnel
```

Si aucun des deux n'est défini, `/mcp` répond `503` : le endpoint est
désactivé. Ces secrets ne doivent jamais être commités ni collés dans un prompt.

## 2. Démarrer

En local :

```bash
npm run dev
# URL à renseigner dans ChatGPT : http://localhost:3000/mcp
```

> ChatGPT ne se connecte qu'à une URL **HTTPS publique**. Pour tester en local,
> exposez le port avec un tunnel (`ngrok http 3000`, `cloudflared tunnel`, …).

En production, l'URL est :

```
https://track-internship.christopher-bondier.com/mcp
```

Le routeur Traefik dédié (`track-internship-mcp`) contourne volontairement le
Basic Auth pour `/mcp` : ChatGPT ne peut pas envoyer à la fois le Basic Auth et
son jeton. La protection repose donc entièrement sur `MCP_URL_TOKEN` (clé en
URL) et/ou `MCP_AUTH_TOKEN` (header).

## 3. Connecter ChatGPT

1. **Settings → Apps & Connectors → Advanced Settings** : activez
   **Developer mode**.
2. **Settings → Apps & Connectors → Create** :
   - **Name** : `Stage Copilot`
   - **Connector URL** : `https://track-internship.christopher-bondier.com/mcp?key=<MCP_URL_TOKEN>`
   - **Authentication** : `Aucune`
3. Créez le connecteur, puis activez-le dans une conversation (icône `+` →
   Developer mode → votre connecteur).

> Le connecteur web de ChatGPT ne permet pas de coller un Bearer statique
> (uniquement `OAuth` / `Aucune` / `Mixte`). D'où la clé en URL : c'est le seul
> mode simple compatible. Le secret est donc stocké dans la config ChatGPT et
> peut apparaître dans des logs — voir les notes de sécurité plus bas.

> Selon votre offre, les actions d'écriture peuvent demander une confirmation
> avant l'appel, et les tâches planifiées (`Scheduled Tasks`) ne donnent pas
> toujours accès aux connecteurs MCP personnalisés. Vérifiez le comportement
> côté ChatGPT : l'app, elle, expose bien les deux outils.

## 4. Tester sans ChatGPT

Avec la clé en URL (mode connecteur ChatGPT) :

```bash
curl -sS "https://track-internship.christopher-bondier.com/mcp?key=$MCP_URL_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Avec le header (Cursor, Codex CLI, Claude Code, API Responses) :

```bash
curl -sS https://track-internship.christopher-bondier.com/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Notes de sécurité

- Seuls `addInternships` et `listInternships` sont exposés ; aucune autre
  fonctionnalité du backend n'est atteignable.
- Les champs sont validés (URL `http(s)`, taille des lots limitée) et les
  doublons sont filtrés avant toute écriture.
- L'URL de l'offre n'est **jamais** récupérée par le serveur pendant
  l'ingestion : pas d'appel réseau déclenché par le contenu reçu.
- **Clé en URL** : le trafic est chiffré (HTTPS, serveur à serveur), donc pas
  d'écoute passive ; le risque réel est une fuite **par les logs** (Traefik /
  Next) ou par la config ChatGPT. Mitigations possibles :
  - couper la journalisation des query strings dans Traefik ;
  - restreindre `/mcp` aux plages d'IP sortantes d'OpenAI ;
  - garder le secret long (`openssl rand -hex 32`) et le traiter comme un mot
    de passe partagé.
- Pour révoquer l'accès : changez `MCP_URL_TOKEN` (et mettez à jour l'URL du
  connecteur ChatGPT) et/ou `MCP_AUTH_TOKEN`, puis redéployez.
