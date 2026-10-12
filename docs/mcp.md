# Serveur MCP (intégration ChatGPT)

Stage Copilot expose un serveur [MCP](https://modelcontextprotocol.io) sur
`/mcp`, ce qui permet à ChatGPT (ou à un agent de codage) de travailler sur la
recherche de stage depuis l'extérieur : ajouter et lister des offres, mais aussi
**lire une opportunité en entier**, la faire **avancer dans le pipeline**,
consigner une note, et **déclencher la génération du CV et de la lettre** — sans
jamais exposer la base de données.

L'implémentation s'appuie sur le SDK officiel
[`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server)
(v2) et réutilise la logique métier existante (`src/lib/internships.ts`, mêmes
tables `Application` / `Company` / `Country` / `City` que le reste de l'app).

## Outils exposés

| Outil | Rôle |
|---|---|
| `addInternships` | Dépose une ou plusieurs **offres publiées** (URL d'annonce obligatoire) dans la section **Offres** de la boîte de réception Pistes (pas directement dans les opportunités : tu les tries ensuite). Déduplique par URL normalisée, puis par entreprise + intitulé, contre les pistes **et** les opportunités. Retourne pour chaque offre `created`, `skipped` (déjà présente) ou `rejected` (champs invalides). |
| `addSpontaneousTargets` | Dépose une ou plusieurs **candidatures spontanées** dans la section dédiée de Pistes : entreprise + rôle visé obligatoires, avec pays/ville, canal de contact (`EMAIL`, `LINKEDIN`, `WEBSITE`, `CONTACT`, `OTHER`), contact et notes. Déduplique par entreprise + rôle visé, contre les pistes **et** les opportunités. Mêmes statuts `created` / `skipped` / `rejected`. |
| `listInternships` | Liste ce qui existe déjà : pistes en attente (`location: "inbox"`, avec leur `kind` `ADVERTISED` ou `SPONTANEOUS`) et opportunités suivies (`location: "opportunities"`), avec filtres `query` / `status` / `kind` / `limit`. Sert à vérifier les doublons. |
| `convertLead` | Convertit une piste de **Pistes** en opportunité suivie (statut *Sauvegardée*) et renvoie l'`applicationId` créé. |
| `discardLead` | Écarte une piste sans la convertir. |
| `listApplications` | Liste les **opportunités suivies** avec les champs utiles pour choisir sur quoi travailler : `statusKey` stable, entreprise, poste, URL, type, `matchScore`, deadline, prochaine action, et présence d'une lettre / d'un CV généré. Filtres `query` / `status` / `hasCoverLetter` / `hasCv` / `limit`. |
| `getApplicationPack` | Renvoie **tout le nécessaire pour postuler** : l'opportunité, l'analyse de l'offre, le **bloc candidat** prêt pour un formulaire (nom, email, téléphone, liens, formation, langues, disponibilité, autorisation de travail) et les chemins de téléchargement du CV et de la lettre (`/api/cv/<id>/pdf`, `/api/cover-letter/<id>/pdf`). |
| `listPipelineStages` | Liste les statuts valides (clé + libellé), pour choisir une valeur acceptée par `setApplicationStatus`. |
| `setApplicationStatus` | Déplace une opportunité de statut, par **clé** (`SAVED`, `APPLIED`…) ou **libellé** (`Sauvegardée`, `Envoyée`…). Même logique que l'interface (journal d'activité inclus). |
| `markApplicationSent` | Marque comme **Envoyée** : date d'envoi, relance automatique selon `followUpRuleDays`, événement dans la timeline. |
| `appendApplicationNote` | Ajoute une note horodatée et, si fournis, met à jour la prochaine action et sa date. |
| `generateCoverLetter` | Génère / régénère la **lettre de motivation** via l'IA de l'app (`tone`, `language`) et renvoie le contenu + les liens PDF/DOCX. |
| `generateCv` | Génère / régénère le **CV personnalisé** pour l'offre via l'IA de l'app, puis le trie pour tenir sur une page ; renvoie les liens PDF/DOCX. |
| `getCandidateProfile` | Renvoie le profil candidat tel qu'un formulaire externe en a besoin (identité, contact, liens, formation, expériences, compétences, langues, disponibilité, autorisation de travail). Ne contient jamais la lettre de référence ni le texte brut du CV. |

## Suivi sur le site

La page **Pistes** affiche un panneau **Synchro ChatGPT** : dernière activité,
nombre d'offres ajoutées par ChatGPT, en attente de tri, et les 5 derniers
appels (créés / ignorés / rejetés). Chaque appel d'outil MCP est journalisé dans
la table `McpActivity` (best-effort, jamais bloquant). Le sas est scindé en deux
sections aux champs adaptés — **Offres** (lien d'annonce, description) et
**Candidatures spontanées** (rôle visé, canal de contact, contact, notes) —
chacune avec son badge de **source** (`ChatGPT`, `Manuel`, `Recherche`). Il n'y
a plus de collage manuel : tout entre par MCP.

Pour un ajout **quotidien** : crée une *Scheduled Task* ChatGPT qui cherche des
offres et appelle `addInternships`, et/ou qui identifie des entreprises à
contacter et appelle `addSpontaneousTargets`. Tout arrive dans **Pistes**, où tu
convertis ou écartes.

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
