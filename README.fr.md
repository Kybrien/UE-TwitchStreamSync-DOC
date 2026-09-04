<img src="docs/images/Icon128.png" alt="Twitch StreamSync" width="128">

# Twitch StreamSync

**Toutes les fonctionnalités Twitch dont vous pouvez rêver, dans Unreal Engine.** *OAuth, Chat, EventSub et Helix. Blueprint d'abord. Source C++ complet.*

![Plateforme](https://img.shields.io/badge/Plateforme-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Moteur](https://img.shields.io/badge/Unreal%20Engine-5.1%20à%205.8-0E1128?style=for-the-badge&logo=unrealengine&logoColor=white)
![Fab](https://img.shields.io/badge/Disponible%20sur-Fab-5865F2?style=for-the-badge)
![Support](https://img.shields.io/badge/Support-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)

[English documentation](README.md) · **Français**

[Installation](#-installation) · [Démarrage rapide](#-démarrage-rapide) · [Authentification](#-authentification) · [Chat](#-chat) · [EventSub](#-eventsub) · [Helix](#-helix) · [Dev Simulator](#-dev-simulator) · [Référence des nodes](#-référence-des-nodes) · [Dépannage](#-dépannage)

---

![Aperçu de Twitch StreamSync](docs/images/HeroScreenshot.png)

## Ce que fait le plugin

Twitch StreamSync connecte votre projet Unreal à Twitch avec un minimum de configuration. Il enveloppe quatre systèmes Twitch distincts dans des workflows pensés pour le Blueprint :

| Système | Ce que vous obtenez |
|---|---|
| **OAuth 2.0** | Connexion, stockage du token, rafraîchissement silencieux, gestion des scopes |
| **Chat (IRC)** | Lire le chat, envoyer des messages, enregistrer des commandes, modération, emotes |
| **EventSub** | Subs, bits, follows, raids, sondages, prédictions, points de chaîne, Hype Trains, etc. |
| **Helix REST** | Changer le titre, la catégorie, créer des récompenses, sondages et prédictions |

Plus deux choses que la plupart des intégrations ne fournissent pas : un **simulateur hors ligne** qui alimente le même pipeline que le chat live, et une **couche de timing** qui déclenche les événements au moment où vos viewers les voient, pas au moment où Twitch les envoie.

> [!NOTE]
> Cette documentation couvre la version **1.5**. Si vous venez d'une version plus ancienne, lisez d'abord [Ce qui change en 1.5](#-ce-qui-change-en-15), trois comportements ont bougé.

---

## 📦 Installation

### 1. Installer le plugin

Copiez le dossier `TwitchStreamSync` dans le dossier `Plugins/` de votre projet, relancez l'éditeur et acceptez la compilation.

Vérifiez dans **Edit → Plugins** que *Twitch StreamSync* est bien activé.

![Fenêtre Plugins](docs/images/PluginsWindow.png)

### 2. Créer votre application Twitch

1. Allez sur la [console développeur Twitch](https://dev.twitch.tv/console/apps) et cliquez sur **Register Your Application**
2. Donnez-lui un nom. **C'est ce que les streamers voient sur l'écran d'approbation**, utilisez donc le vrai nom de votre jeu
3. Dans **OAuth Redirect URLs**, ajoutez `http://localhost:8080/Auth`
4. Mettez **Client Type** sur **Confidential**, c'est ce qui permet de générer un Client Secret
5. Cliquez sur **Create**, puis sur **Manage** sur votre nouvelle application
6. Copiez le **Client ID**, puis cliquez sur **New Secret** et copiez le **Client Secret**

![Console développeur Twitch](docs/images/TwitchDevConsole.png)

> [!CAUTION]
> **Cliquez sur Enregistrer en bas de la page après avoir ajouté une URL de redirection.** Twitch affiche votre nouvelle URL sur l'écran d'approbation même si elle n'a pas été enregistrée, puis redirige vers l'ancienne. Résultat : une page d'erreur sur un port que vous n'utilisez plus, sans aucun moyen de comprendre ce qui s'est passé.

### 3. Ajouter les composants

Ajoutez-les à un Blueprint qui survit à votre niveau, typiquement votre Game Mode, votre Player Controller ou un acteur manager dédié :

| Composant | Nécessaire |
|---|---|
| **TwitchAuthentication** | Toujours |
| **TwitchChat** | Pour lire ou écrire dans le chat |
| **TwitchEventSub** | Pour recevoir les événements Twitch |
| **TwitchDevSimulator** | Uniquement pour les tests hors ligne |

![Panneau Components](docs/images/ComponentsPanel.png)

> [!WARNING]
> **Les composants sont détruits au changement de niveau.** Ils emportent avec eux la connexion chat, le socket EventSub et les données du compte en cache. Réinitialiser à chaque chargement de map est le fonctionnement prévu, pas un contournement. `Initialize Twitch Integration` est peu coûteux et se rappelle sans risque.

### 4. Renseigner les identifiants

Sélectionnez l'acteur portant `TwitchAuthentication` et remplissez la catégorie **Twitch | OAuth** dans le panneau Details :

| Champ | Valeur |
|---|---|
| **Client Id** | Depuis la console développeur |
| **Client Secret** | Depuis la console développeur |
| **Redirect Uri** | `http://localhost:8080/Auth`, identique caractère par caractère à la console |

![Composant Authentication](docs/images/AuthComponent.png)

> [!IMPORTANT]
> **Renseignez les identifiants sur le composant, pas dans les Project Settings.** Le composant a la priorité sur les Project Settings, et `Redirect Uri` est livré pré-rempli, donc le réglage projet n'est jamais atteint pour ce champ. Si les deux divergent, le plugin vous prévient au moment de la connexion et affiche les deux valeurs.

### 5. Project Settings

**Edit → Project Settings → Plugins → Twitch StreamSync**

| Section | Réglage | Défaut | Rôle |
|---|---|---|---|
| OAuth | `Client Id` / `Client Secret` | *vide* | Repli quand le composant est vide |
| OAuth | `Redirect Uri` | `http://localhost:8080/Auth` | Repli, utilisé seulement si le champ du composant est vidé |
| OAuth | `Default Scopes` | 19 scopes | Chaîne de scopes de dernier recours, voir [Scopes](#scopes) |
| Persistence | `Persist Tokens` | ✅ | Conserve la session entre deux lancements. Les tokens sont stockés en clair dans `GameUserSettings.ini` |
| Logging | `Redact Secrets` | ✅ | Masque tokens et secrets dans tous les logs. **Laissez activé** |
| Logging | `Enable Logging` | ✅ | Active l'export en fichier |
| Logging | `Log Directory` | `Saved/Logs/StreamSync` | Où vont les logs exportés |
| Event Routing | `Prefer Event Sub for Overlaps` | ✅ | Quand un événement peut arriver par deux chemins, garder celui d'EventSub |
| Event Sub | `Use Web Socket` | ✅ | Transport WebSocket. Décochez pour le [Webhook](#transport-webhook) |
| Event Sub | `Webhook Port` | `8091` | Éditable seulement quand WebSocket est désactivé |
| Dev Simulator | `Custom Chat Messages` | *vide* | Vos propres messages pour le simulateur |
| Dev Simulator | `Replace Built in Chat Messages` | ❌ | Décoché : vos messages s'ajoutent au pool intégré |

![Project Settings](docs/images/ProjectSettings.png)

---

## 🚀 Démarrage rapide

Toute l'intégration tient en un node. Posez-le sur `Event BeginPlay` dans le Blueprint qui porte vos composants.

```
Event BeginPlay
  └─ Initialize Twitch Integration
       Auth      : TwitchAuthentication
       Chat      : TwitchChat
       Event Sub : TwitchEventSub
       Settings  : Make TwitchIntegrationSettings
                     Connect Auth              ✔
                     Launch OAuth              ✔
                     Connect Chat              ✔
                     Connect Event Sub         ✔
                     Subscribe Event Sub Defaults ✔
```

![Graphe de démarrage](docs/images/QuickStartGraph.png)

**Ce qui se passe :** le navigateur s'ouvre, le streamer approuve sur la page de Twitch, le navigateur atterrit sur la page de callback locale du plugin, le token revient, les données du compte sont récupérées, le chat se connecte et le socket EventSub s'ouvre.

Puis branchez deux événements :

```
On Token Received      ──► vous avez un token, mais pas encore les données du compte
On Twitch Data Ready   ──► pseudo, avatar, chaîne et données de stream sont tous là
```

> [!IMPORTANT]
> **Lisez les données du compte dans `On Twitch Data Ready`, pas dans `On Token Received`.** La récupération est asynchrone. Lire le pseudo juste après l'arrivée du token renvoie une chaîne vide.

### Étape par étape, si vous préférez contrôler

```
Auto Connect Twitch      ──► OAuth uniquement
Auto Connect Chat        ──► IRC uniquement, à appeler après l'auth
Auto Connect Event Sub   ──► EventSub uniquement, à appeler après l'auth
```

Utile quand vous voulez que le streamer connecte le chat et les événements à des moments différents, par exemple derrière deux boutons distincts dans un menu.

---

## 🔑 Authentification

### Le modèle de session

Quatre situations, et elles couvrent tout ce que fait le plugin :

| Situation | Ce qui se passe |
|---|---|
| Connecté, scopes inchangés | Le token est réutilisé et rafraîchi au besoin. Pas de navigateur, pas d'interruption |
| Connecté, scopes changés | Ré-authentification, et Twitch demande au streamer d'approuver le nouveau jeu |
| Après `Disconnect From Twitch` | La connexion suivante repart de zéro, écran d'approbation inclus |
| Après un refus du streamer | La session est effacée, et la connexion suivante repart de zéro |

Il n'y a aucun réglage derrière tout ça. C'est le comportement.

### Scopes

Les scopes sont des **permissions sur le token**. Lire le chat, gérer les sondages et recevoir les événements de sub sont trois permissions différentes que le streamer approuve individuellement sur l'écran de Twitch.

```
Build OAuth Scope  ──►  Set Custom Scope  ──►  Initialize Twitch Integration
```

`Build OAuth Scope` vous donne une case à cocher par famille de fonctionnalités. `Set Custom Scope` écrit le résultat sur le composant. Appelez les deux **avant** d'initialiser.

![Build OAuth Scope](docs/images/BuildOAuthScope.png)

Trois nodes d'aide :

| Node | Ce qu'il renvoie |
|---|---|
| **Log Scope List** | Affiche les scopes que vous êtes sur le point de demander |
| **Get Missing Scopes For Selection** | Compare votre sélection au token actuel |
| **Get Missing Scopes For Token** | La même chose, vu du token |
| **Get Default OAuth Scope String** | Le défaut intégré du plugin, utile comme point de départ |

> [!WARNING]
> **Un token ne gagne ni ne perd jamais un scope.** Changer la chaîne de scopes implique une nouvelle autorisation. Depuis la 1.5 le plugin le détecte et se ré-authentifie tout seul, dans les deux sens : élargir **et** réduire déclenchent une nouvelle approbation, parce que réduire sert justement à ne plus détenir des permissions dont on n'a plus besoin.
>
> Une tentative automatique par session. Pour un résultat déterministe, appelez `Disconnect From Twitch` puis `Initialize Twitch Integration`.

### Valider votre configuration avant de connecter

```
Validate Twitch Setup From Components
     Auth      : TwitchAuthentication
     Event Sub : TwitchEventSub
        └─► Return Value (bool) + Out Issues (array)
```

Chaque issue porte un `Message` et un `Hint`. Affichez-les et vous avez votre premier outil de support. Le node signale les identifiants manquants, une URL de redirection mal formée, et une URL de redirection renseignée à deux endroits avec deux valeurs différentes.

![Validation de la configuration](docs/images/ValidateSetup.png)

### Récupérer les données du compte

| Node | Ce qu'il récupère |
|---|---|
| **Fetch User Info** | Tout ce qui suit, en un appel. **Utilisez celui-là** |
| Fetch Channel Info | Titre, catégorie, tags, délai, modérateurs, VIP |
| Fetch Stream Info | Statut live, nombre de viewers, langue, id du jeu, uptime |
| Fetch Followers | Nombre de followers |
| Fetch Bits Leaderboard | Meilleurs donateurs de bits |
| Fetch Extensions | Extensions actives |

![Nodes de fetch](docs/images/FetchNodes.png)

Pour mettre à jour les données pendant le stream, **ne refaites pas un fetch** :

| Node | Rafraîchit |
|---|---|
| **Refresh Stream Data** | Stream, chaîne et followers, trois en un |
| **Refresh All Data** | Tout |

> [!NOTE]
> Les appels à `Fetch User Info` espacés de moins de cinq secondes sont fusionnés. C'est pour cette raison que vous pouvez voir une ligne de log disant qu'un fetch a été sauté, c'est voulu et cela signifie qu'un autre appel travaille déjà pour vous.

### Se déconnecter

```
Disconnect From Twitch
```

Un node, aucune option. Il efface les tokens et tous les champs en cache de la mémoire, efface les tokens stockés sur le disque, arrête le timer de rafraîchissement, révoque le token d'accès côté Twitch, et passe l'état à `Disconnected`.

La connexion suivante repart de zéro, écran d'approbation Twitch inclus, ce qui permet à un streamer de **changer de compte**.

> [!IMPORTANT]
> **Ce node s'appelait `Clear Persisted Tokens` et il ne nettoyait que le disque.** Vos nodes Blueprint existants gardent leurs connexions et se renomment tout seuls, mais le comportement a changé. Si vous l'utilisiez pour vider le disque tout en restant connecté, décochez plutôt `Persist Tokens` dans les Project Settings.

### Rafraîchissement du token

Le plugin surveille l'expiration stockée dans le composant et appelle `Refresh Access Token Silent` avant qu'elle n'arrive. Pas de navigateur, pas de popup, pas d'interruption.

Deux nodes pour un contrôle manuel :

| Node | Quand |
|---|---|
| **Refresh Access Token Silent** | Forcer un rafraîchissement maintenant, par exemple à la reprise après une longue pause |
| **Refresh If Expiring** | Ne rafraîchit que si le token expire dans moins de `Margin Seconds`. Sûr à appeler sur un timer |

Depuis la 1.5, un token restauré depuis le disque est aussi **vérifié auprès de Twitch en arrière-plan** au démarrage. Un token révoqué est rafraîchi silencieusement, ou la session est effacée avec un message clair. `Connected` signifie maintenant utilisable.

---

## 💬 Chat

### Réglages de connexion

Posez `TwitchChat` sur le même acteur. Les valeurs par défaut sont les bonnes :

| Réglage | Recommandé | Pourquoi |
|---|---|---|
| `Use Web Socket IRC` | ✅ | Compatible pare-feu, pas de code socket supplémentaire |
| `Use TLS` | ✅ | Chiffre la connexion |
| `IRC Web Socket Url` | `wss://irc-ws.chat.twitch.tv:443/` | Utilisé seulement quand WebSocket est actif |
| `IRC Server Host` / `Port` | `irc.chat.twitch.tv` / `6697` | Utilisés seulement quand WebSocket est désactivé |
| `Log Raw Irc` | ❌ | Débogage uniquement, très bruyant |

![Composant Chat](docs/images/ChatComponent.png)

### Protection contre les pics de trafic

Le chat explose pendant les raids. Le plugin met les lignes IRC brutes en file et n'en libère qu'un nombre limité par frame.

| Réglage | Défaut | Ce qu'il contrôle |
|---|---|---|
| `Max Queued Messages` | `2000` | Combien de lignes peuvent être tamponnées. Plus grand encaisse de plus gros pics et consomme plus de mémoire |
| `Max Dispatch per Tick` | `200` | Combien de lignes atteignent votre Blueprint par frame. Plus grand réduit la latence et coûte plus de CPU par frame |
| `Drop Oldest on Overflow` | ✅ | Activé : jeter les plus anciennes, rester à jour, **recommandé en live**. Désactivé : jeter les plus récentes, garder l'historique, prendre du retard |

### Envoyer un message

```
Send Message
     Message          : "Hello chat"
     Send To          : ✔ message normal   ✗ commande
     Channel Override : vide pour votre propre chaîne
```

### Commandes

```
Setup Command Characters
     Command Char : "!"
     Options Char : " "

Register Command
     Command Name : "give"        ← pas de préfixe ici
     Callback     : votre Custom Event
```

Le callback reçoit le nom de la commande et un tableau d'options, donc `!give item=sword qty=2` arrive déjà découpé.

| Options Char | Exemple |
|---|---|
| `" "` (espace) | `!give item=sword qty=2` |
| `","` | `!give item=sword,qty=2` |
| `"|"` | `!give item=sword|qty=2` |

![Nodes de commande](docs/images/CommandNodes.png)

> [!CAUTION]
> **Évitez `/` et `.` comme caractère de commande.** Twitch les traite comme des commandes client et votre message n'atteint jamais le chat.

`Unregister Command` en retire une.

### Modération

| Node | Nécessite |
|---|---|
| **Set Emote Only** | Statut modérateur |
| **Clear Chat** | Statut modérateur |
| **Set Follower Only** | Statut modérateur, prend une durée en minutes |
| **Set Slow Mode** | Statut modérateur, prend un délai en secondes |
| **Perm Ban User** | Statut modérateur et l'id de l'utilisateur ciblé |
| **Temp Ban User** | Idem, plus une durée en secondes |

### Lire les messages

`On Chat Message Received` vous donne une structure `Twitch Irc Message`. Cassez-la et vous obtenez 23 sorties.

![Break du message chat](docs/images/BreakChatMessage.png)

**Chaque pin porte un tooltip dans l'éditeur depuis la 1.5.** Ceux qui piègent le plus :

| Pin | Ce qu'il faut savoir |
|---|---|
| `Badges` | Liste `nom/version` séparée par des virgules, par exemple `broadcaster/1,subscriber/12`. **La façon fiable de détecter broadcaster, modérateur, VIP, founder ou palier d'abonnement** |
| `Mod` | `"1"` ou `"0"`. **`0` pour le broadcaster**, regardez aussi `Badges` si vous voulez l'inclure |
| `Badge Info` | Ancienneté d'abonnement uniquement, souvent vide. Utilisez `Badges` pour le rôle |
| `Display Name` | Pour afficher, conserve la casse d'origine |
| `User IRC Login` | Pour comparer des identités, en minuscules |
| `User Id` | Ce que vous stockez en base. Un login peut changer, un id jamais |
| `Message` | Pour votre logique |
| `Message For Display` | Pour votre interface |
| `Message Segments` | Le message déjà découpé en morceaux texte et emote. **C'est là-dessus que vous bouclez pour construire une ligne de chat**, pas sur le tag `Emotes` brut |
| `Bits` | Vide, pas zéro, quand le message n'est pas un cheer |
| `Message Type` | `PRIVMSG` pour quelqu'un qui parle, `USERNOTICE` pour une annonce de sub, gift ou raid |

> [!NOTE]
> **Les booléens arrivent sous forme de chaînes `"0"` et `"1"`**, parce que c'est ce qu'envoie IRC. Comparez à `"1"`.

### Emotes

Le gestionnaire d'emotes résout les emotes Twitch, BetterTTV, FrankerFaceZ et 7TV, télécharge les textures et les met en cache sur le disque.

| Node | Usage |
|---|---|
| **Request Emote Texture** | Récupérer une texture d'emote, côté widget |
| **Patch Segment Textures** | Rafraîchir les pointeurs de texture sur une ligne déjà construite |
| `On Emote Texture Ready` | Se déclenche quand une texture finit d'arriver |

`Contains Renderable Emotes` sur la structure du message est un test rapide avant de construire une ligne de chat riche.

> [!NOTE]
> Un `404` de FrankerFaceZ ou 7TV dans le log signifie simplement que votre chaîne n'a pas d'emotes chez ce fournisseur. Ce n'est pas une erreur.

---

## 📡 EventSub

### Souscrire d'abord, sinon rien n'arrive

```
Apply EventSub Selection (Bools)
     Channel Points  ✔
     Polls           ✔
     Predictions     ✔
     Follows         ✔
     Raids           ✔
     Shoutouts       ✔
     Charity         ✔
     Shield Mode     ✔
     Include All Standard Events ✔
```

![Apply EventSub Selection](docs/images/ApplyEventSubSelection.png)

`Include All Standard Events` couvre les subs, cheers, bans, modérateurs, stream online et offline, coupures pub, objectifs, Hype Trains et effacements de chat. Cela ne veut **pas** dire tout ce qui est listé au-dessus.

Pour se désabonner, rappelez le même node avec moins de cases cochées.

> [!TIP]
> **Appelez-le une seule fois.** L'appeler sur plusieurs événements renvoie toutes les souscriptions, et Twitch répond `409 subscription already exists` pour chacune. Depuis la 1.5 ce sont des lignes de log informatives et non des erreurs, mais cela reste du bruit.

### Lire un événement

Chaque événement livre le **JSON brut sous forme de chaîne**, plus un node `Try Parse` correspondant :

```
On Gift Sub Event Received
     └─ Json ──► Try Parse Gift Sub ──► Break Pub Sub Gift Sub
                                            Gifter Name
                                            Recipient Name
                                            Tier
                                            Quantity
                                            Anonymous
```

![Parsing d'événement](docs/images/EventParsing.png)

Comme vous récupérez toujours le JSON brut, un champ que le node de parse n'expose pas reste accessible.

### Hype Train

> [!IMPORTANT]
> **Twitch a retiré la v1 du Hype Train en janvier 2026.** La version 1.5 demande la v2 pour les trois événements. Sur les versions antérieures du plugin, `On Hype Train Start` et `On Hype Train Progress` ne pouvaient pas se déclencher du tout.

`Parse Hype Train Begin`, `Progress` et `End` partagent une structure :

| Champ | Signification |
|---|---|
| `Id` | Identifiant du train, identique sur begin, progress et end |
| `Level` | Niveau actuel |
| `Total` | Total de points accumulés |
| `Progress` | Points au niveau actuel. **À associer à `Goal` pour une barre de progression** |
| `Goal` | Points nécessaires pour le niveau suivant |
| `Type` | `golden_kappa`, `treasure`, ou le train classique |
| `Is Shared Train` | Vrai pendant un train partagé en co-stream |
| `All Time High Level` / `Total` | Le record de la chaîne, utile pour une réaction « nouveau record » |
| `Started At` / `Expires At` | Horodatages |
| `Ended At` / `Cooldown Ends At` | Événement end uniquement |
| `Progress At` | Hérité, toujours vide. La v2 n'a pas d'horodatage de progression |

### Timing des événements

Les notifications EventSub atteignent votre jeu jusqu'à 15 ou 20 secondes **avant** que les viewers ne les voient sur Twitch. `UTwitchEventTimingManager` corrige ça.

| Mode | Comportement |
|---|---|
| **Instant** | Les événements se déclenchent dès réception. Comportement d'origine, aucun réglage |
| **Delayed** | Chaque événement attend un nombre de secondes fixe |
| **Smart** | Le plugin surveille l'IRC en temps réel et s'adapte |

Le **mode Smart** en détail :

- L'abonné clique sur *Partager dans le chat* → l'événement se déclenche immédiatement
- L'abonné envoie un message dans les secondes qui suivent → le plugin mesure le délai réel et ajuste discrètement sa moyenne interne
- Personne ne dit rien → l'événement se déclenche après un timeout adaptatif

Les valeurs par défaut sont de 10 secondes pour les subs, 5 pour les cheers, 3 pour les follows. Les timeouts déclenchés sans signal sont ignorés, le plugin n'apprend que des moments qu'il peut vérifier.

Le mode Smart a besoin du chat connecté :

```
Set Chat Component For Smart Mode
     Chat : TwitchChat
```

![Timing des événements](docs/images/EventTiming.png)

### Transport Webhook

Par défaut le plugin utilise le **WebSocket**, qui n'a besoin d'aucune IP publique et fonctionne dans l'éditeur comme en build packagé. N'utilisez le **Webhook** que si vous gérez un backend qui doit recevoir les événements même sans client lancé.

1. Project Settings → Event Sub → `Use Web Socket` = **false**
2. Réglez `Webhook Port`, le port local d'écoute
3. Réglez un `Webhook Secret`, une chaîne aléatoire, Twitch signe chaque payload avec
4. Réglez `Public Callback URL` sur le composant, l'URL HTTPS publique que Twitch appellera

Pour un test local, un tunnel comme [ngrok](https://ngrok.com) expose votre port :

```
ngrok http 8091
```

Collez l'URL HTTPS affichée dans `Public Callback URL`.

Le plugin répond au challenge de Twitch, vérifie la signature HMAC SHA-256 de chaque payload, et distribue l'événement à vos Blueprints. Si la vérification échoue, le message est rejeté. Si le serveur local ne démarre pas, le plugin bascule sur le WebSocket.

---

## 🎛️ Helix

Des nodes asynchrones qui modifient le stream. Chacun a un `On Success` et un `On Error`.

| Node | Scope requis |
|---|---|
| Set Channel Title | `channel:manage:broadcast` |
| Set Channel Game | `channel:manage:broadcast` |
| Create Reward | `channel:manage:redemptions` |
| Update Reward | `channel:manage:redemptions` |
| Create Poll | `channel:manage:polls` |
| End Poll | `channel:manage:polls` |
| Create Prediction | `channel:manage:predictions` |
| Lock Prediction | `channel:manage:predictions` |
| Cancel Prediction | `channel:manage:predictions` |
| Resolve Prediction | `channel:manage:predictions` |

![Nodes Helix](docs/images/HelixNodes.png)

**Prérequis :** le Client ID doit correspondre à l'application qui a émis le token, et `broadcaster_id` doit être égal à `token.user_id`. Suivez l'installation ci-dessus et les deux sont remplis automatiquement.

**Échecs courants :** un scope manquant, un mauvais Client ID, ou un décalage de broadcaster.

> [!TIP]
> Pour définir une catégorie, préférez le **Game Id** à une recherche par nom.

---

## 🧪 Dev Simulator

Déclencher des événements de type Twitch hors ligne pour itérer sur l'interface et le gameplay sans lancer de stream.

### Câblage

```
Twitch Dev Simulator
     Set Auth      : TwitchAuthentication
     Set Event Sub : TwitchEventSub
```

Sans les deux, rien ne fonctionne.

![Configuration du simulateur](docs/images/DevSimSetup.png)

### Simuler un événement

```
Simulate Twitch Event
     Transport : EventSub
     Type      : Channel Points, Redeem (add)
     Params    : Make Redeem Sim Params
```

Il existe un node `Make <événement> Sim Params` par famille : sondage, prédiction, redeem, bits, sub, follow, raid.

### Simuler le chat

Deux nodes, et ils font des choses différentes :

| Node | Usage |
|---|---|
| **Simulate Chat Stream** | Un flux aléatoire continu. Bon pour tester la gestion des pics et la mise en page du widget de chat |
| **Stop Chat Simulation** | Arrête immédiatement une simulation en cours |
| **Simulate Chat Message** | Un message précis, une fois. **La façon de tester une commande précise** |

`Simulate Chat Stream` :

| Pin | Défaut | Rôle |
|---|---|---|
| `Chat Component` | *vide* | Le `TwitchChat` dans lequel injecter |
| `Messages Per Minute` | `120` | Cadence visée, de 1 à 6000, bornée automatiquement. Montez à 3000 pour voir ce qu'un raid fait à votre widget |
| `Duration Seconds` | `30` | Durée d'exécution. `0` tourne jusqu'à `Stop Chat Simulation` |
| `Include Emotes` | ✅ | Décoché signifie **aucune emote du tout**, voir plus bas |
| `Emote Frequency` | `0.3` | Probabilité de 0 à 1 qu'un message porte au moins une emote |

![Simulate chat stream](docs/images/SimulateChatStream.png)

`Simulate Chat Message` :

| Pin | Défaut | Rôle |
|---|---|---|
| `Chat Component` | *vide* | Le `TwitchChat` dans lequel injecter |
| `Message Text` | *vide* | Caractère de commande inclus si vous voulez une commande |
| `Sender Name` | `viewer` | Le login IRC en est dérivé |
| `Is Moderator` | ❌ *(Advanced)* | Pose le badge modérateur et le tag mod |
| `Is Subscriber` | ❌ *(Advanced)* | Pose le badge abonné et le tag d'ancienneté |
| `Is Broadcaster` | ❌ *(Advanced)* | Pose le badge broadcaster |

![Simulate Chat Message](docs/images/SimulateChatMessage.png)

> [!NOTE]
> **Ce n'est pas `Send Message`.** `Send Message` envoie un vrai message sur votre vraie chaîne via une connexion live. `Simulate Chat Message` injecte localement et ne touche à aucun réseau.

**Pourquoi ça marche si bien :** le simulateur alimente exactement la même file que le socket IRC live. Rien en aval ne peut distinguer un message simulé d'un vrai, donc vos callbacks de commande et leurs effets de gameplay se déclenchent à l'identique, sans stream et sans viewers.

Deux limites à connaître : la chaîne est toujours `#simulatedchannel`, donc un filtre qui compare le login de l'expéditeur au nom réel de votre chaîne ne correspondra pas, même avec le flag broadcaster. Utilisez `Badges` à la place. Et le simulateur injecte des payloads construits localement, il ne peut donc pas valider que Twitch aurait accepté une souscription.

### Vos propres messages

**Project Settings → Plugins → Twitch StreamSync → Dev Simulator**

- `Custom Chat Messages` : un tableau de vos propres lignes
- `Replace Built in Chat Messages` : décoché, les vôtres s'ajoutent au pool intégré ; coché, elles le remplacent

Décocher `Include Emotes` sur `Simulate Chat Stream` signifie maintenant vraiment aucune emote : les messages intégrés qui sont eux-mêmes des noms d'emotes sont retirés du pool pour cette exécution. Vos messages personnalisés ne sont jamais filtrés, ce sont vos mots.

---

## 📝 Log Exporter

Un logger activable à l'exécution, qui capture des lignes lisibles, des métriques clé-valeur et du JSON brut depuis le Chat, EventSub et Helix vers un fichier texte. Les secrets sont masqués.

**Configuration, une fois :**

| Node | Ce qu'il fait |
|---|---|
| `Set Logging Enabled` | Active ou désactive l'exporteur |
| `Set Log Level` | Sévérité minimale conservée |
| `Set Echo To UE Log` | Duplique tout dans l'Output Log d'Unreal, pratique en PIE |
| `Set Redact Secrets` | Masque tokens, secrets client et identifiants sensibles. **Gardez activé** |

**Écriture :**

| Node | Usage |
|---|---|
| `Log Message` | Une simple ligne de point de passage |
| `Log Warning` | Un problème notable mais non fatal, approche de rate limit par exemple |
| `Log Error` | Quelque chose a échoué |
| `Log Event` | Un événement nommé avec des propriétés, une ligne de style analytics |
| `Log JSON` | Conserve un payload d'origine, utile pour rejouer |
| `Log KV` | Des clés-valeurs structurées, bon pour les tableaux de bord |

![Log exporter](docs/images/LogExporter.png)

**Préréglages :**

| Contexte | Réglages |
|---|---|
| Production | `Log Level = Info`, `Redact Secrets = true`, `Echo To UE Log = false` |
| Débogage | `Log Level = Verbose`, `Echo To UE Log = true` |

---

## 🧩 Référence des nodes

### Points d'entrée

| Node | Classe |
|---|---|
| **Initialize Twitch Integration** | `StreamSyncBlueprintLibrary` |
| **Make TwitchIntegrationSettings** | Constructeur de structure pour le node ci-dessus |
| **Validate Twitch Setup From Components** | `StreamSyncBlueprintLibrary` |

### Authentification

| Node | Ce qu'il fait |
|---|---|
| `Auto Connect Twitch` | OAuth uniquement |
| `Disconnect From Twitch` | Déconnexion complète, révocation, la connexion suivante repart de zéro |
| `Set Custom Scope` | Écrit une chaîne de scopes sur le composant |
| `Build OAuth Scope` | En construit une à partir de cases à cocher |
| `Get Default OAuth Scope String` | Le défaut intégré du plugin |
| `Log Scope List` | Affiche ce que vous êtes sur le point de demander |
| `Get Missing Scopes For Selection` | Compare une sélection au token |
| `Get Missing Scopes For Token` | La même chose vue du token |
| `Fetch User Info` | Toutes les données du compte en un appel |
| `Fetch Channel Info` / `Stream Info` / `Followers` / `Bits Leaderboard` / `Extensions` | Récupérations individuelles |
| `Refresh Stream Data` | Stream, chaîne, followers |
| `Refresh All Data` | Tout |
| `Refresh Access Token Silent` | Force un rafraîchissement de token |
| `Refresh If Expiring` | Ne rafraîchit que dans la marge |
| `Get Twitch User Id` | L'identifiant du compte |

### Chat

| Node | Ce qu'il fait |
|---|---|
| `Auto Connect Chat` | Connecte l'IRC |
| `Send Message` | Envoie un message ou une commande |
| `Register Command` / `Unregister Command` | Gestion des commandes |
| `Setup Command Characters` | Préfixe et séparateur d'options |
| `Set Emote Only` / `Clear Chat` / `Set Follower Only` / `Set Slow Mode` | Modération |
| `Perm Ban User` / `Temp Ban User` | Modération |
| `Inject Chat Line` | Primitive d'injection bas niveau |

### EventSub

| Node | Ce qu'il fait |
|---|---|
| `Auto Connect Event Sub` | Ouvre le transport |
| `Apply EventSub Selection (Bools)` | Souscrire et se désabonner par famille |
| `Subscribe <Type>` | Souscription individuelle |
| `List Subscriptions` | Ce qui est actuellement actif |
| `Set Chat Component For Smart Mode` | Alimente le timing Smart avec l'IRC |
| `Try Parse <Event>` | Un par famille d'événements |

### Dev Simulator

| Node | Ce qu'il fait |
|---|---|
| `Simulate Twitch Event` | Émet un payload EventSub fabriqué |
| `Make <Event> Sim Params` | Constructeurs de paramètres |
| `Simulate Chat Stream` / `Stop Chat Simulation` | Flux aléatoire continu |
| `Simulate Chat Message` | Un message précis |

---

## 📡 Événements

| Événement | Composant | Se déclenche quand |
|---|---|---|
| `On Token Received` | Authentication | Un token est arrivé. Les données du compte ne sont pas encore là |
| `On Twitch Data Ready` | Authentication | Toutes les récupérations sont terminées, avec ou sans succès |
| `On Error` | Authentication | Échec d'authentification, avec un code et un message |
| `On Chat Connected` | Chat | L'IRC a rejoint la chaîne |
| `On Chat Message Received` | Chat | Un message est arrivé |
| `On Emote Texture Ready` | Chat | Une texture d'emote a fini de se télécharger |
| `On <Event> Received` | EventSub | Un par famille d'événements |

> [!IMPORTANT]
> **`On Twitch Data Ready` se déclenche que la récupération ait réussi ou non.** Vérifiez les drapeaux de succès par endpoint, ou `bFetchTimedOut`, avant de faire confiance aux données. Avant la 1.5 cet événement ne partait jamais quand le premier appel échouait, laissant une interface en attente de quelque chose qui n'arriverait jamais.

---

## ⚙️ Comportements à connaître

**`Initialize Twitch Integration` est idempotent et peu coûteux.** Avec un token valide il n'ouvre aucun navigateur et ne fait aucun aller-retour. L'appeler à chaque chargement de niveau est le fonctionnement correct.

**Les composants meurent au changement de niveau.** Connexion chat, socket EventSub et données en cache partent avec eux. Réinitialisez.

**Les tokens sont stockés en clair** dans `GameUserSettings.ini`. Ce fichier se trouve hors du dossier projet en build packagé et est normalement gitignoré dans l'éditeur, il ne voyage donc pas avec votre projet, mais il n'est pas chiffré.

**La page de consentement OAuth appartient à Twitch.** La seule page que le plugin contrôle est la page de callback locale sur laquelle vous atterrissez ensuite.

**Le serveur de callback prend le port et le chemin depuis `RedirectUri`.** S'il ne parvient pas à analyser la valeur, il revient à `8080` et `/Auth` et le dit dans le log.

**Twitch n'a aucune API pour retirer l'autorisation d'un compte.** Seul le streamer le peut, depuis [twitch.tv/settings/connections](https://www.twitch.tv/settings/connections). `Disconnect From Twitch` s'en occupe à votre place en forçant l'écran d'approbation à la connexion suivante.

**Twitch change les versions de souscription sans changer les scopes.** Un événement muet est plus souvent une version périmée qu'une permission manquante. Le plugin fixe désormais une version explicite par type et prévient quand il rencontre un type qu'il ne connaît pas.

**Un HTTP 409 de Twitch n'est pas un échec.** `subscription already exists` signifie que la souscription est en place et qu'elle livre.

**Builds packagés :** la configuration et la persistance des tokens ne se comportent pas comme dans l'éditeur. Testez un build packagé avant de publier.

---

## 🔧 Dépannage

### Connexion

| Symptôme | Cause |
|---|---|
| Twitch affiche sa propre page d'erreur sur l'URI de redirection | La valeur dans Unreal n'est pas enregistrée dans la console développeur, ou vous n'avez pas cliqué sur **Enregistrer** après l'avoir ajoutée |
| Le navigateur affiche une erreur de connexion sur l'URL de callback | Rien n'écoute. Comparez la barre d'adresse avec la ligne `listening on port` du log |
| Vous atterrissez sur un ancien port sans `?code=` dans l'URL | La nouvelle URL de redirection n'a pas été enregistrée chez Twitch, ou vous avez cliqué sur une page d'approbation restée ouverte dans un autre onglet |
| Le mauvais navigateur s'ouvre | Association Windows. Unreal lit l'association **`http`**, pas `https`. Paramètres → Applications → Applications par défaut |
| Rien ne se passe, pas de navigateur | Un token stocké est encore valide. C'est voulu. `Disconnect From Twitch` pour forcer un flux complet |
| Pas d'écran d'approbation, ça se connecte directement | Votre compte a déjà autorisé cette application. `Disconnect From Twitch` le fait revenir |

### Authentification

| Symptôme | Cause |
|---|---|
| `Connected` mais le pseudo est vide | Vous le lisez dans `On Token Received`. Lisez-le dans `On Twitch Data Ready` |
| `Project Settings RedirectUri is being ignored` | Le composant porte sa propre valeur et gagne toujours. Changez-la sur le composant, ou videz le champ du composant |
| Un `401 Invalid OAuth token` juste après une déconnexion | Une récupération en vol est arrivée après la fin de la session. Sans conséquence, et ignorée depuis la 1.5 |
| Changer la chaîne de scopes ne fait rien | Corrigé en 1.5. Sur les versions antérieures le token était réutilisé et vos nouveaux scopes n'atteignaient jamais Twitch |

### EventSub

| Symptôme | Cause |
|---|---|
| Aucun événement | Aucune souscription. Appelez `Apply EventSub Selection` |
| `4003 connection unused` puis une reconnexion | Le socket s'est ouvert mais aucune souscription n'a été créée en dix secondes. Souscrivez après l'authentification |
| `403 subscription missing proper authorization` | Le token n'a pas le scope pour ce type. Depuis la 1.5 le log le nomme |
| `409 subscription already exists` | Ce n'est pas une erreur. Vous avez appliqué une sélection plusieurs fois |
| Hype Train Start et Progress ne se déclenchent jamais | Ancienne version du plugin demandant une version retirée par Twitch. Passez en 1.5 |
| Les événements arrivent avant que les viewers ne les voient | Normal. Utilisez le timing Smart ou Delayed |

### Chat

| Symptôme | Cause |
|---|---|
| Impossible d'envoyer | `chat:edit` manquant, ou la chaîne n'a jamais été rejointe. Vérifiez les NOTICE serveur pour les modes lent, emote only ou follower only |
| `Badges` est toujours vide | Corrigé en 1.5. Un bug de parseur le laissait vide sur chaque message, y compris en chat live |
| Déconnexions fréquentes | Activez TLS et WebSocket, et espacez vos messages sortants |
| Les commandes ne se déclenchent jamais | Le message doit commencer par votre `Command Character`, et la commande doit être enregistrée sans préfixe |

### Helix

| Symptôme | Cause |
|---|---|
| `401` ou `403` sur le titre ou la catégorie | Ajoutez `channel:manage:broadcast`, utilisez le token du broadcaster, vérifiez que le Client ID correspond à l'application |
| Les sondages ou prédictions échouent | Ajoutez `channel:manage:polls` ou `channel:manage:predictions` |
| La création ou mise à jour de récompense échoue | Ajoutez `channel:manage:redemptions` |
| `429` | Rate limit. Reculez, et loguez les en-têtes de rate limit |

### Logs verbeux

Ajoutez dans `Config/DefaultEngine.ini` :

```ini
[Core.Log]
LogHttpAuth=Verbose
LogTwitchEventSub=Verbose
LogTwitchEmotes=Verbose
TwitchDevSimLog=Verbose
```

**Quoi capturer pour une demande de support :** le statut HTTP et la route pour Helix, le dernier keepalive et les souscriptions actives pour les sockets, et les scopes attendus comparés aux scopes réels du token via les nodes d'aide.

---

## 🆕 Ce qui change en 1.5

Liste complète dans le [changelog](CHANGELOG.md). Trois comportements ont bougé, et ils peuvent surprendre un projet existant.

**`Clear Persisted Tokens` devient `Disconnect From Twitch` et déconnecte vraiment.** Il n'effaçait que les tokens stockés sur le disque en laissant l'utilisateur connecté pour le reste de la session. Si vous vous appuyiez dessus, décochez plutôt `Persist Tokens` dans les Project Settings.

**`Initialize Twitch Integration` peut ouvrir un navigateur là où il ne le faisait pas.** Cela n'arrive que lorsque les scopes demandés ne correspondent plus à ceux du token. Faites vos changements de scope à un moment où une déconnexion est acceptable, puisqu'un refus efface la session.

**Vos scopes par défaut peuvent ne pas se mettre à jour tout seuls.** Unreal écrit tout le bloc de réglages dans `DefaultGame.ini` dès que vous modifiez quoi que ce soit sur cette page. Si vous aviez déjà touché un réglage Twitch StreamSync, votre ancienne liste de scopes y est figée et cette version ne la remplacera pas. Videz le champ `Default Scopes`, relancez l'éditeur pour qu'il se réinitialise, et authentifiez-vous à nouveau.

---

## 📋 Périmètre

**Ce que fait le plugin**

| Le plugin | Votre jeu |
|---|---|
| Authentifie le streamer | Décide quand demander |
| Livre le chat et les événements | Décide de ce qu'ils signifient |
| Change le titre, lance des sondages | Décide du contenu |
| Simule des événements hors ligne | Construit le gameplay qui réagit |

**Hors périmètre**

- **Windows uniquement.** Win64 dans cette version
- **Unreal Engine 5.0.** Le module HTTPServer nécessaire n'y est pas disponible
- **PubSub.** Déprécié par Twitch, EventSub le remplace
- **Twitch Drops, développement d'extensions, whispers IRC**
- **L'hébergement de votre backend.** Le mode Webhook nécessite un endpoint HTTPS public que vous fournissez

---

## 💬 Support

Un bug ? Une fonctionnalité manquante ? Une question ?

- **Discord :** [discord.gg/BwhyxQAAUn](https://discord.gg/BwhyxQAAUn)
- **YouTube :** [@AdriensDiscoveries](https://www.youtube.com/@AdriensDiscoveries)
- **Fab :** [Kybrien sur Fab](https://www.fab.com/sellers/Kybrien)

**Liens Twitch utiles**

- [Enregistrer une application](https://dev.twitch.tv/console/apps)
- [Types de souscription EventSub](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types)
- [Référence des scopes](https://dev.twitch.tv/docs/authentication/scopes)
- [Conditions du programme développeur Twitch](https://dev.twitch.tv/docs/api/terms-of-service)

*Développé par Kybrien, également auteur de [Even Richer Discord Presence](https://github.com/Kybrien/Doc-Even-Richer-Discord-Presence).*

---

**TWITCH STREAMSYNC EST UN PLUGIN UNREAL ENGINE INDÉPENDANT, NON AFFILIÉ À TWITCH INTERACTIVE, INC., NI APPROUVÉ NI SPONSORISÉ PAR CETTE SOCIÉTÉ. TOUTES LES MARQUES, LOGOS ET NOMS TWITCH SONT LA PROPRIÉTÉ DE LEURS DÉTENTEURS RESPECTIFS.**

Copyright 2026 Kybrien. Tous droits réservés.
