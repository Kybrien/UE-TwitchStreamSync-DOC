<img src="docs/images/Icon128.png" alt="Twitch StreamSync" width="128">

# Twitch StreamSync

**Every Twitch feature you can dream of, in Unreal Engine.** *OAuth, Chat, EventSub and Helix. Blueprint first. Full C++ source.*

![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Engine](https://img.shields.io/badge/Unreal%20Engine-5.1%20to%205.8-0E1128?style=for-the-badge&logo=unrealengine&logoColor=white)
![Fab](https://img.shields.io/badge/Get%20it%20on-Fab-5865F2?style=for-the-badge)
![Support](https://img.shields.io/badge/Support-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)

**English** · [Documentation en français](README.fr.md)

[Setup](#-setup) · [Quick start](#-quick-start) · [Authentication](#-authentication) · [Chat](#-chat) · [EventSub](#-eventsub) · [Helix](#-helix) · [Dev Simulator](#-dev-simulator) · [Node reference](#-node-reference) · [Troubleshooting](#-troubleshooting)

---

![Twitch StreamSync overview](docs/images/HeroScreenshot.png)

## What it does

Twitch StreamSync connects your Unreal project to Twitch with minimal setup. It wraps four separate Twitch systems into Blueprint-first workflows:

| System | What you get |
|---|---|
| **OAuth 2.0** | Login, token storage, silent refresh, scope management |
| **Chat (IRC)** | Read chat, send messages, register commands, moderation helpers, emotes |
| **EventSub** | Subs, bits, follows, raids, polls, predictions, channel points, Hype Trains, and more |
| **Helix REST** | Change the title, the category, create rewards, polls and predictions |

Plus two things most integrations do not give you: an **offline dev simulator** that feeds the same pipeline as live chat, and an **event timing layer** that fires events when your viewers actually see them rather than when Twitch sends them.

> [!NOTE]
> This documentation covers version **1.5**. If you are coming from an older version, read [What changed in 1.5](#-what-changed-in-15) first, three behaviours moved.

---

## 📦 Setup

### 1. Install the plugin

Copy the `TwitchStreamSync` folder into your project's `Plugins/` folder, then relaunch the editor and accept the compile prompt.

Check **Edit → Plugins** that *Twitch StreamSync* is enabled.

![Plugins window](docs/images/PluginsWindow.png)

### 2. Create your Twitch application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console/apps) and click **Register Your Application**
2. Give it a name. **This is what streamers see on the approval screen**, so use your real game name
3. Under **OAuth Redirect URLs**, add `http://localhost:8080/Auth`
4. Set **Client Type** to **Confidential**, this is what lets you generate a Client Secret
5. Click **Create**, then **Manage** on your new app
6. Copy the **Client ID**, then click **New Secret** and copy the **Client Secret**

![Twitch developer console](docs/images/TwitchDevConsole.png)

> [!CAUTION]
> **Click Save at the bottom of the page after adding a redirect URL.** Twitch shows your new URL on the approval screen even when it has not been saved, then redirects to the old one. This produces an error page on a port you no longer use, with no way to tell what happened.

### 3. Add the components

Add these to a Blueprint that survives your level, typically your Game Mode, your Player Controller or a dedicated manager actor:

| Component | Required |
|---|---|
| **TwitchAuthentication** | Always |
| **TwitchChat** | To read or write chat |
| **TwitchEventSub** | To receive Twitch events |
| **TwitchDevSimulator** | Only for offline testing |

![Components panel](docs/images/ComponentsPanel.png)

> [!WARNING]
> **Components are destroyed on level change.** They take the chat connection, the EventSub socket and the cached account data with them. Re-initialising on every map load is the intended usage pattern, not a workaround. `Initialize Twitch Integration` is cheap and safe to call repeatedly.

### 4. Fill in the credentials

Select the actor carrying `TwitchAuthentication` and fill the **Twitch | OAuth** category in the Details panel:

| Field | Value |
|---|---|
| **Client Id** | From the developer console |
| **Client Secret** | From the developer console |
| **Redirect Uri** | `http://localhost:8080/Auth`, character for character identical to the console |

![Authentication component](docs/images/AuthComponent.png)

> [!IMPORTANT]
> **Set the credentials on the component, not in Project Settings.** The component overrides Project Settings, and `Redirect Uri` ships pre-filled so the project setting is never reached for that field. If the two disagree, the plugin warns you at connection time and names both values.

### 5. Project Settings

**Edit → Project Settings → Plugins → Twitch StreamSync**

| Section | Setting | Default | Purpose |
|---|---|---|---|
| OAuth | `Client Id` / `Client Secret` | *empty* | Fallback when the component is blank |
| OAuth | `Redirect Uri` | `http://localhost:8080/Auth` | Fallback, only used when the component field is cleared |
| OAuth | `Default Scopes` | 19 scopes | Last resort scope string, see [Scopes](#scopes) |
| Persistence | `Persist Tokens` | ✅ | Keeps the session across restarts. Tokens are stored in plain text in `GameUserSettings.ini` |
| Logging | `Redact Secrets` | ✅ | Masks tokens and secrets in all log output. **Leave this on** |
| Logging | `Enable Logging` | ✅ | Toggles the file exporter |
| Logging | `Log Directory` | `Saved/Logs/StreamSync` | Where exported logs go |
| Event Routing | `Prefer Event Sub for Overlaps` | ✅ | When an event can arrive by two paths, keep the EventSub one |
| Event Sub | `Use Web Socket` | ✅ | WebSocket transport. Turn off for [Webhook](#webhook-transport) |
| Event Sub | `Webhook Port` | `8091` | Only editable when WebSocket is off |
| Dev Simulator | `Custom Chat Messages` | *empty* | Your own messages for the simulator |
| Dev Simulator | `Replace Built in Chat Messages` | ❌ | Off means your messages extend the built in pool |

![Project Settings](docs/images/ProjectSettings.png)

---

## 🚀 Quick start

The whole integration is one node. Put it on `Event BeginPlay` in the Blueprint carrying your components.

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

![Quick start graph](docs/images/QuickStartGraph.png)

**What happens:** the browser opens, the streamer approves on Twitch's own page, the browser lands on the plugin's local callback page, the token comes back, the account data is fetched, chat connects and the EventSub socket opens.

Then bind two events:

```
On Token Received      ──► you have a token, but no account data yet
On Twitch Data Ready   ──► display name, avatar, channel and stream data are all in
```

> [!IMPORTANT]
> **Read account data in `On Twitch Data Ready`, not in `On Token Received`.** The fetch is asynchronous. Reading the display name right after the token arrives returns an empty string.

### Step by step, if you prefer control

```
Auto Connect Twitch      ──► OAuth only
Auto Connect Chat        ──► IRC only, call after auth
Auto Connect Event Sub   ──► EventSub only, call after auth
```

Useful when you want the streamer to connect chat and events at different moments, for example behind two separate buttons in a settings menu.

---

## 🔑 Authentication

### The session model

Four situations, and they cover everything the plugin does:

| Situation | What happens |
|---|---|
| Connected, scopes unchanged | The token is reused and refreshed as needed. No browser, no interruption |
| Connected, scopes changed | Re-authentication, and Twitch asks the streamer to approve the new set |
| After `Disconnect From Twitch` | The next connection starts over, approval screen included |
| After the streamer refuses | The session is cleared, and the next connection starts over |

There are no settings behind this. It is the behaviour.

### Scopes

Scopes are **permissions on the token**. Reading chat, managing polls and receiving sub events are three different permissions the streamer approves individually on Twitch's screen.

```
Build OAuth Scope  ──►  Set Custom Scope  ──►  Initialize Twitch Integration
```

`Build OAuth Scope` gives you a checkbox per feature family. `Set Custom Scope` writes the result onto the component. Call both **before** initialising.

![Build OAuth Scope](docs/images/BuildOAuthScope.png)

Three helper nodes:

| Node | What it returns |
|---|---|
| **Log Scope List** | Prints the scopes you are about to request |
| **Get Missing Scopes For Selection** | Compares your checkbox selection against the current token |
| **Get Missing Scopes For Token** | The same, from a token perspective |
| **Get Default OAuth Scope String** | The plugin's built in default, useful as a starting point |

> [!WARNING]
> **A token never gains or loses a scope.** Changing the scope string means a new authorisation. Since 1.5 the plugin detects this and reauthenticates on its own, in both directions: widening **and** narrowing both trigger a fresh approval, because narrowing exists precisely so the game stops holding permissions it no longer needs.
>
> One automatic attempt per session. For a deterministic result, call `Disconnect From Twitch` then `Initialize Twitch Integration`.

### Validate your setup before connecting

```
Validate Twitch Setup From Components
     Auth      : TwitchAuthentication
     Event Sub : TwitchEventSub
        └─► Return Value (bool) + Out Issues (array)
```

Each issue carries a `Message` and a `Hint`. Print them and you have your first support tool. It reports missing credentials, a malformed redirect URL, and a redirect URL set to two different values in two places.

![Validate setup](docs/images/ValidateSetup.png)

### Fetching account data

| Node | What it fetches |
|---|---|
| **Fetch User Info** | Everything below, in one call. **Use this one** |
| Fetch Channel Info | Title, category, tags, delay, moderators, VIPs |
| Fetch Stream Info | Live status, viewer count, language, game id, uptime |
| Fetch Followers | Follower count |
| Fetch Bits Leaderboard | Top cheerers |
| Fetch Extensions | Active extensions |

![Fetch nodes](docs/images/FetchNodes.png)

To update the data as the stream goes on, **do not fetch again**:

| Node | Refreshes |
|---|---|
| **Refresh Stream Data** | Stream, channel and followers, three in one |
| **Refresh All Data** | Everything |

> [!NOTE]
> Calls to `Fetch User Info` within five seconds of each other are coalesced. This is why you may see a log line saying a fetch was skipped, it is intended and it means something already fetched for you.

### Disconnecting

```
Disconnect From Twitch
```

One node, no options. It clears the tokens and every cached field from memory, erases the stored tokens from disk, stops the refresh timer, revokes the access token on Twitch's side, and sets the state to `Disconnected`.

The next connection starts over from scratch, Twitch approval screen included, so a streamer can **switch accounts**.

> [!IMPORTANT]
> **This node used to be called `Clear Persisted Tokens` and it only cleared the disk.** Your existing Blueprint nodes keep their connections and rename themselves, but the behaviour changed. If you were using it to clear the disk while staying connected, turn off `Persist Tokens` in Project Settings instead.

### Token refresh

The plugin checks the expiry stored in the component and calls `Refresh Access Token Silent` before it runs out. No browser, no popup, no interruption.

Two nodes if you want manual control:

| Node | When |
|---|---|
| **Refresh Access Token Silent** | Force a refresh now, for example when resuming after a long pause |
| **Refresh If Expiring** | Refreshes only if the token expires within `Margin Seconds`. Safe to call on a timer |

Since 1.5, a token restored from disk is also **checked against Twitch in the background** at startup. A revoked token is refreshed silently, or the session is cleared with a clear message. `Connected` now means usable.

---

## 💬 Chat

### Connection settings

Drop `TwitchChat` on the same actor. The defaults are the right ones:

| Setting | Recommended | Why |
|---|---|---|
| `Use Web Socket IRC` | ✅ | Firewall friendly, no extra socket code |
| `Use TLS` | ✅ | Encrypts the connection |
| `IRC Web Socket Url` | `wss://irc-ws.chat.twitch.tv:443/` | Only used when WebSocket is on |
| `IRC Server Host` / `Port` | `irc.chat.twitch.tv` / `6697` | Only used when WebSocket is off |
| `Log Raw Irc` | ❌ | Debugging only, very noisy |

![Chat component](docs/images/ChatComponent.png)

### Flood protection

Chat explodes during raids. The plugin queues raw IRC lines and releases a limited number per frame.

| Setting | Default | What it controls |
|---|---|---|
| `Max Queued Messages` | `2000` | How many lines can be buffered. Bigger survives bigger spikes and uses more memory |
| `Max Dispatch per Tick` | `200` | How many lines reach your Blueprint per frame. Bigger means lower latency and more CPU per frame |
| `Drop Oldest on Overflow` | ✅ | On: drop the oldest, stay current, **recommended for live**. Off: drop the newest, keep history, fall behind |

### Sending a message

```
Send Message
     Message          : "Hello chat"
     Send To          : ✔ casual message   ✗ command
     Channel Override : empty for your own channel
```

### Commands

```
Setup Command Characters
     Command Char : "!"
     Options Char : " "

Register Command
     Command Name : "give"        ← no prefix here
     Callback     : your Custom Event
```

The callback receives the command name and an options array, so `!give item=sword qty=2` arrives already split.

| Options Char | Example |
|---|---|
| `" "` (space) | `!give item=sword qty=2` |
| `","` | `!give item=sword,qty=2` |
| `"|"` | `!give item=sword|qty=2` |

![Command nodes](docs/images/CommandNodes.png)

> [!CAUTION]
> **Avoid `/` and `.` as your command character.** Twitch treats both as client commands and your message never reaches chat.

`Unregister Command` removes one.

### Moderation

| Node | Needs |
|---|---|
| **Set Emote Only** | Moderator status |
| **Clear Chat** | Moderator status |
| **Set Follower Only** | Moderator status, takes a duration in minutes |
| **Set Slow Mode** | Moderator status, takes a delay in seconds |
| **Perm Ban User** | Moderator status and the target user id |
| **Temp Ban User** | Same, plus a duration in seconds |

### Reading messages

`On Chat Message Received` gives you a `Twitch Irc Message` struct. Break it and you get 23 outputs.

![Break chat message](docs/images/BreakChatMessage.png)

**Every pin carries a tooltip in the editor since 1.5.** The ones that trip people up:

| Pin | What to know |
|---|---|
| `Badges` | Comma separated `name/version` list, for example `broadcaster/1,subscriber/12`. **The reliable way to detect broadcaster, moderator, VIP, founder or sub tier** |
| `Mod` | `"1"` or `"0"`. **`0` for the broadcaster**, check `Badges` too if you want to include them |
| `Badge Info` | Subscriber tenure only, usually empty. Use `Badges` for the role |
| `Display Name` | To show on screen, keeps the original capitalisation |
| `User IRC Login` | To compare identities, lowercase |
| `User Id` | What you store in a database. A login can change, an id never does |
| `Message` | For your logic |
| `Message For Display` | For your UI |
| `Message Segments` | The message already cut into text and emote pieces. **This is what you loop over to build a chat row**, not the raw `Emotes` tag |
| `Bits` | Empty, not zero, when the message is not a cheer |
| `Message Type` | `PRIVMSG` for someone talking, `USERNOTICE` for a sub, gift or raid announcement |

> [!NOTE]
> **Booleans arrive as the strings `"0"` and `"1"`**, because that is what IRC sends. Compare against `"1"`.

### Emotes

The emote manager resolves Twitch, BetterTTV, FrankerFaceZ and 7TV emotes, downloads the textures and caches them on disk.

| Node | Use |
|---|---|
| **Request Emote Texture** | Pull one emote texture, widget facing |
| **Patch Segment Textures** | Refresh texture pointers on a row you already built |
| `On Emote Texture Ready` | Fires when a texture finishes streaming in |

`Contains Renderable Emotes` on the message struct is a cheap early out before building a rich chat row.

> [!NOTE]
> A `404` from FrankerFaceZ or 7TV in the log simply means your channel has no emotes on that provider. It is not an error.

---

## 📡 EventSub

### Subscribe first, or nothing arrives

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

`Include All Standard Events` covers subs, cheers, bans, moderators, stream online and offline, ad breaks, goals, Hype Trains and chat clears. It does **not** mean everything listed above it.

To unsubscribe, call the same node with fewer boxes ticked.

> [!TIP]
> **Call it once.** Calling it on several events re-sends all subscriptions, and Twitch answers `409 subscription already exists` for each one. Since 1.5 those are informational log lines rather than errors, but they are still noise.

### Reading an event

Every event delivers the **raw JSON as a string**, plus a matching `Try Parse` node:

```
On Gift Sub Event Received
     └─ Json ──► Try Parse Gift Sub ──► Break Pub Sub Gift Sub
                                            Gifter Name
                                            Recipient Name
                                            Tier
                                            Quantity
                                            Anonymous
```

![Event parsing](docs/images/EventParsing.png)

Because you always get the raw JSON, a field the parse node does not expose is still reachable.

### Hype Train

> [!IMPORTANT]
> **Twitch withdrew Hype Train v1 in January 2026.** Version 1.5 requests v2 for all three events. On older versions of this plugin, `On Hype Train Start` and `On Hype Train Progress` could not fire at all.

`Parse Hype Train Begin`, `Progress` and `End` share one struct:

| Field | Meaning |
|---|---|
| `Id` | Train id, the same across begin, progress and end |
| `Level` | Current level |
| `Total` | Total points accumulated |
| `Progress` | Points at the current level. **Pairs with `Goal` for a progress bar** |
| `Goal` | Points needed for the next level |
| `Type` | `golden_kappa`, `treasure`, or the regular train |
| `Is Shared Train` | True during a co-stream train |
| `All Time High Level` / `Total` | The channel's record, useful for a "new record" reaction |
| `Started At` / `Expires At` | Timestamps |
| `Ended At` / `Cooldown Ends At` | End event only |
| `Progress At` | Legacy, always empty. v2 has no progress timestamp |

### Event timing

EventSub notifications reach your game up to 15 to 20 seconds **before** viewers see them on Twitch. `UTwitchEventTimingManager` fixes that.

| Mode | Behaviour |
|---|---|
| **Instant** | Events fire as received. Original behaviour, zero setup |
| **Delayed** | Every event waits a fixed number of seconds |
| **Smart** | The plugin watches IRC in real time and adapts |

**Smart mode** in detail:

- The subscriber clicks *Share in Chat* → the event fires immediately
- The subscriber sends any message within the next few seconds → the plugin measures the real delay and quietly adjusts its internal average
- Nobody says anything → the event fires after an adaptive timeout

Defaults are 10 seconds for subs, 5 for cheers, 3 for follows. Timeouts that fired with no signal are ignored, the plugin only learns from moments it can verify.

Smart mode needs chat connected:

```
Set Chat Component For Smart Mode
     Chat : TwitchChat
```

![Event timing](docs/images/EventTiming.png)

### Webhook transport

By default the plugin uses **WebSocket**, which needs no public IP and works in the editor and in packaged builds. Use **Webhook** only when you run a backend that must receive events even with no client running.

1. Project Settings → Event Sub → `Use Web Socket` = **false**
2. Set `Webhook Port`, the local port to listen on
3. Set a `Webhook Secret`, any random string, Twitch signs each payload with it
4. Set `Public Callback URL` on the component, the public HTTPS URL Twitch will call

For local testing, a tunnel such as [ngrok](https://ngrok.com) exposes your port:

```
ngrok http 8091
```

Paste the printed HTTPS URL into `Public Callback URL`.

The plugin answers Twitch's challenge handshake, verifies the HMAC SHA-256 signature on every payload, and dispatches the event to your Blueprints. If verification fails the message is rejected. If the local server cannot start, the plugin falls back to WebSocket.

---

## 🎛️ Helix

Async nodes that change the stream. Each has `On Success` and `On Error`.

| Node | Required scope |
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

![Helix nodes](docs/images/HelixNodes.png)

**Requirements:** the Client ID must match the app that issued the token, and `broadcaster_id` must equal `token.user_id`. Follow the setup above and both are met automatically.

**Common failures:** a missing scope, the wrong Client ID, or a broadcaster mismatch.

> [!TIP]
> For setting a category, prefer the **Game Id** over a name lookup.

---

## 🧪 Dev Simulator

Trigger Twitch-like events offline to iterate on UI and gameplay without starting a stream.

### Wiring

```
Twitch Dev Simulator
     Set Auth      : TwitchAuthentication
     Set Event Sub : TwitchEventSub
```

Without both, nothing works.

![Dev simulator setup](docs/images/DevSimSetup.png)

### Simulating an event

```
Simulate Twitch Event
     Transport : EventSub
     Type      : Channel Points, Redeem (add)
     Params    : Make Redeem Sim Params
```

There is a `Make <event> Sim Params` node per event family: poll, prediction, redeem, bits, sub, follow, raid.

### Simulating chat

Two nodes, and they do different jobs:

| Node | Use |
|---|---|
| **Simulate Chat Stream** | A continuous random feed. Good for testing flood handling and chat widget layout |
| **Stop Chat Simulation** | Stops an active run immediately |
| **Simulate Chat Message** | One specific message, once. **The way to test a single command** |

`Simulate Chat Stream`:

| Pin | Default | Purpose |
|---|---|---|
| `Chat Component` | *empty* | The `TwitchChat` to inject into |
| `Messages Per Minute` | `120` | Target rate, 1 to 6000, clamped automatically. Push it to 3000 to see what a raid does to your widget |
| `Duration Seconds` | `30` | How long to run. `0` runs until `Stop Chat Simulation` |
| `Include Emotes` | ✅ | Off means **no emote at all**, see below |
| `Emote Frequency` | `0.3` | Chance from 0 to 1 that a message carries at least one emote |

![Simulate chat stream](docs/images/SimulateChatStream.png)

`Simulate Chat Message`:

| Pin | Default | Purpose |
|---|---|---|
| `Chat Component` | *empty* | The `TwitchChat` to inject into |
| `Message Text` | *empty* | Command character included if you want a command |
| `Sender Name` | `viewer` | The IRC login is derived from it |
| `Is Moderator` | ❌ *(Advanced)* | Sets the moderator badge and the mod tag |
| `Is Subscriber` | ❌ *(Advanced)* | Sets the subscriber badge and the tenure tag |
| `Is Broadcaster` | ❌ *(Advanced)* | Sets the broadcaster badge |

![Simulate chat message](docs/images/SimulateChatMessage.png)

> [!NOTE]
> **This is not `Send Message`.** `Send Message` sends a real message to your real channel over a live connection. `Simulate Chat Message` injects locally and touches no network.

**Why it works so well:** the simulator feeds the exact same queue as the live IRC socket. Nothing downstream can tell a simulated message from a real one, so your command callbacks and their gameplay effects fire identically, with no stream and no viewers.

Two limits worth knowing: the channel is always `#simulatedchannel`, so a filter comparing the sender login against your real channel name will not match even with the broadcaster flag set. Use `Badges` instead. And the simulator injects locally built payloads, so it cannot validate that Twitch would have accepted a subscription.

### Your own messages

**Project Settings → Plugins → Twitch StreamSync → Dev Simulator**

- `Custom Chat Messages`: an array of your own lines
- `Replace Built in Chat Messages`: off means yours extend the built in pool, on means yours replace it

Turning `Include Emotes` off on `Simulate Chat Stream` now really means no emotes: built in messages that are themselves emote names are dropped from the pool for that run. Your custom messages are never filtered, they are your own text.

---

## 📝 Log Exporter

A logger you can toggle at runtime, capturing readable lines, key-value metrics and raw JSON from Chat, EventSub and Helix into a text file. Secrets are redacted.

**Setup, one time:**

| Node | What it does |
|---|---|
| `Set Logging Enabled` | Toggles the exporter |
| `Set Log Level` | Minimum severity kept |
| `Set Echo To UE Log` | Duplicates everything into the Unreal Output Log, handy in PIE |
| `Set Redact Secrets` | Masks tokens, client secrets and sensitive ids. **Keep this on** |

**Writing:**

| Node | Use |
|---|---|
| `Log Message` | A plain checkpoint line |
| `Log Warning` | A notable issue that is not fatal, rate limit nearing for example |
| `Log Error` | Something failed |
| `Log Event` | A named event with properties, an analytics style row |
| `Log JSON` | Preserves an original payload, useful for replay |
| `Log KV` | Structured key-values, good for dashboards and diffing runs |

![Log exporter](docs/images/LogExporter.png)

**Presets:**

| Context | Settings |
|---|---|
| Production | `Log Level = Info`, `Redact Secrets = true`, `Echo To UE Log = false` |
| Debug | `Log Level = Verbose`, `Echo To UE Log = true` |

---

## 🧩 Node reference

### Entry points

| Node | Class |
|---|---|
| **Initialize Twitch Integration** | `StreamSyncBlueprintLibrary` |
| **Make TwitchIntegrationSettings** | Struct maker for the above |
| **Validate Twitch Setup From Components** | `StreamSyncBlueprintLibrary` |

### Authentication

| Node | What it does |
|---|---|
| `Auto Connect Twitch` | OAuth only |
| `Disconnect From Twitch` | Full logout, revoke, next connection starts over |
| `Set Custom Scope` | Writes a scope string onto the component |
| `Build OAuth Scope` | Builds one from checkboxes |
| `Get Default OAuth Scope String` | The plugin's built in default |
| `Log Scope List` | Prints what you are about to request |
| `Get Missing Scopes For Selection` | Compares a selection against the token |
| `Get Missing Scopes For Token` | The same from the token side |
| `Fetch User Info` | All account data in one call |
| `Fetch Channel Info` / `Stream Info` / `Followers` / `Bits Leaderboard` / `Extensions` | Individual fetches |
| `Refresh Stream Data` | Stream, channel, followers |
| `Refresh All Data` | Everything |
| `Refresh Access Token Silent` | Force a token refresh |
| `Refresh If Expiring` | Refresh only if within the margin |
| `Get Twitch User Id` | The account id |

### Chat

| Node | What it does |
|---|---|
| `Auto Connect Chat` | Connects IRC |
| `Send Message` | Sends a message or a command |
| `Register Command` / `Unregister Command` | Command handling |
| `Setup Command Characters` | Prefix and options separator |
| `Set Emote Only` / `Clear Chat` / `Set Follower Only` / `Set Slow Mode` | Moderation |
| `Perm Ban User` / `Temp Ban User` | Moderation |
| `Inject Chat Line` | Low level injection primitive |

### EventSub

| Node | What it does |
|---|---|
| `Auto Connect Event Sub` | Opens the transport |
| `Apply EventSub Selection (Bools)` | Subscribe and unsubscribe by family |
| `Subscribe <Type>` | Individual subscription |
| `List Subscriptions` | What is currently active |
| `Set Chat Component For Smart Mode` | Feeds Smart timing with IRC |
| `Try Parse <Event>` | One per event family |

### Dev Simulator

| Node | What it does |
|---|---|
| `Simulate Twitch Event` | Emits a fabricated EventSub payload |
| `Make <Event> Sim Params` | Parameter makers |
| `Simulate Chat Stream` / `Stop Chat Simulation` | Continuous random feed |
| `Simulate Chat Message` | One specific message |

---

## 📡 Events

| Event | Component | Fires when |
|---|---|---|
| `On Token Received` | Authentication | A token arrived. Account data is not in yet |
| `On Twitch Data Ready` | Authentication | Every fetch finished, successfully or not |
| `On Error` | Authentication | Auth failure, with a code and a message |
| `On Chat Connected` | Chat | IRC joined the channel |
| `On Chat Message Received` | Chat | A message arrived |
| `On Emote Texture Ready` | Chat | An emote texture finished downloading |
| `On <Event> Received` | EventSub | One per event family |

> [!IMPORTANT]
> **`On Twitch Data Ready` fires whether the fetch succeeded or not.** Check the per endpoint success flags, or `bFetchTimedOut`, before trusting the data. Before 1.5 this event never fired at all when the first call failed, leaving a UI waiting on something that would never arrive.

---

## ⚙️ Behaviour you should know

**`Initialize Twitch Integration` is idempotent and cheap.** With a valid token it opens no browser and does no round trip. Calling it on every level load is the correct usage pattern.

**Components die on level change.** Chat connection, EventSub socket and cached account data go with them. Re-initialise.

**Tokens are stored in plain text** in `GameUserSettings.ini`. That file sits outside the project folder in packaged builds and is normally gitignored in the editor, so it does not travel with your project, but it is not encrypted.

**The OAuth consent page is Twitch's own.** The only page the plugin controls is the local callback page you land on afterwards.

**The callback server binds the port and path from `RedirectUri`.** If it cannot parse the value it falls back to `8080` and `/Auth` and says so in the log.

**Twitch has no API to withdraw an account's authorisation.** Only the streamer can, from [twitch.tv/settings/connections](https://www.twitch.tv/settings/connections). `Disconnect From Twitch` handles the equivalent for you by forcing the approval screen on the next connection.

**Twitch changes subscription versions without changing scopes.** A dead event is more often a stale version than a missing permission. The plugin now pins an explicit version per type and logs a warning when it meets a type it does not know.

**HTTP 409 from Twitch is not a failure.** `subscription already exists` means the subscription is in place and delivering.

**Packaged builds:** configuration and token persistence behave differently from the editor. Test a packaged build before shipping.

---

## 🔧 Troubleshooting

### Connection

| Symptom | Cause |
|---|---|
| Twitch shows its own error page about the redirect URI | The value in Unreal is not registered in the developer console, or you did not click **Save** after adding it |
| Browser shows a connection error on the callback URL | Nothing is listening. Compare the address bar against the `listening on port` line in the log |
| You land on an old port with no `?code=` in the URL | The new redirect URL was not saved on Twitch, or you clicked an approval page left over in another tab |
| The wrong browser opens | Windows association. Unreal reads the **`http`** association, not `https`. Settings → Apps → Default apps |
| Nothing happens, no browser | A stored token is still valid. That is intended. `Disconnect From Twitch` to force a fresh flow |
| No approval screen, it connects straight through | Your account already authorised this app. `Disconnect From Twitch` forces it back |

### Authentication

| Symptom | Cause |
|---|---|
| `Connected` but the display name is empty | You read it in `On Token Received`. Read it in `On Twitch Data Ready` |
| `Project Settings RedirectUri is being ignored` | The component carries its own value and always wins. Change it on the component, or clear the component field |
| A `401 Invalid OAuth token` right after a disconnect | A fetch that was in flight landed after the session ended. Harmless, and dropped since 1.5 |
| Changing the scope string does nothing | Fixed in 1.5. On older versions the token was reused and your new scopes never reached Twitch |

### EventSub

| Symptom | Cause |
|---|---|
| No events at all | No subscription. Call `Apply EventSub Selection` |
| `4003 connection unused` then a reconnect | The socket opened but no subscription was created within ten seconds. Subscribe after authenticating |
| `403 subscription missing proper authorization` | The token lacks the scope for that type. Since 1.5 the log names it |
| `409 subscription already exists` | Not an error. You applied a selection more than once |
| Hype Train Start and Progress never fire | Older plugin version requesting a version Twitch withdrew. Update to 1.5 |
| Events arrive before viewers see them | Expected. Use Smart or Delayed timing |

### Chat

| Symptom | Cause |
|---|---|
| Cannot send | Missing `chat:edit`, or the channel was never joined. Check server NOTICE for slow, emote or follower only mode |
| `Badges` is always empty | Fixed in 1.5. A parser bug meant it was empty on every message including live chat |
| Frequent drops | Enable TLS and WebSocket, and pace your outgoing messages |
| Commands never trigger | The message must start with your `Command Character`, and the command must be registered without a prefix |

### Helix

| Symptom | Cause |
|---|---|
| `401` or `403` on title or category | Add `channel:manage:broadcast`, use the broadcaster's own token, check the Client ID matches the app |
| Polls or predictions fail | Add `channel:manage:polls` or `channel:manage:predictions` |
| Reward create or update fails | Add `channel:manage:redemptions` |
| `429` | Rate limited. Back off, and log the rate limit headers |

### Verbose logging

Add to `Config/DefaultEngine.ini`:

```ini
[Core.Log]
LogHttpAuth=Verbose
LogTwitchEventSub=Verbose
LogTwitchEmotes=Verbose
TwitchDevSimLog=Verbose
```

**What to capture for a support request:** the HTTP status and route for Helix, the last keepalive and active subscriptions for sockets, and the expected scopes against the actual token scopes using the scope helper nodes.

---

## 🆕 What changed in 1.5

Full list in the [changelog](CHANGELOG.md). Three behaviours moved, and they can surprise an existing project.

**`Clear Persisted Tokens` is now `Disconnect From Twitch` and really disconnects.** It used to erase the stored tokens from disk and leave the user connected for the rest of the session. If you relied on that, turn off `Persist Tokens` in Project Settings instead.

**`Initialize Twitch Integration` can open a browser where it did not before.** This happens only when the scopes you request no longer match the ones the token carries. Make scope changes at a point where a disconnection is acceptable, since a refusal clears the session.

**Your default scopes may not update automatically.** Unreal writes the whole settings block to `DefaultGame.ini` the first time you change anything on that page. If you had ever touched a Twitch StreamSync setting, your old scope list is frozen there and this release will not replace it. Clear the `Default Scopes` field, restart the editor so it reseeds, and authenticate again.

---

## 📋 Scope

**What the plugin does**

| The plugin | Your game |
|---|---|
| Authenticates the streamer | Decides when to ask |
| Delivers chat and events | Decides what they mean |
| Changes the title, runs polls | Decides the content |
| Simulates events offline | Builds the gameplay that reacts |

**Out of scope**

- **Windows only.** Win64 in this version
- **Unreal Engine 5.0.** The HTTPServer module it needs is unavailable there
- **PubSub.** Deprecated by Twitch, EventSub replaces it
- **Twitch Drops, Extensions development, IRC whispers**
- **Hosting your backend.** Webhook mode needs a public HTTPS endpoint you provide

---

## 💬 Support

Found a bug? Need a feature? Have a question?

- **Discord:** [discord.gg/BwhyxQAAUn](https://discord.gg/BwhyxQAAUn)
- **YouTube:** [@AdriensDiscoveries](https://www.youtube.com/@AdriensDiscoveries)
- **Fab:** [Kybrien on Fab](https://www.fab.com/sellers/Kybrien)

**Useful Twitch links**

- [Register an application](https://dev.twitch.tv/console/apps)
- [EventSub subscription types](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types)
- [Scopes reference](https://dev.twitch.tv/docs/authentication/scopes)
- [Twitch Developer Terms of Service](https://dev.twitch.tv/docs/api/terms-of-service)

*Built by Kybrien, also the developer of [Even Richer Discord Presence](https://github.com/Kybrien/Doc-Even-Richer-Discord-Presence).*

---

**TWITCH STREAMSYNC IS AN INDEPENDENT UNREAL ENGINE PLUGIN AND IS NOT AFFILIATED WITH, ENDORSED BY, OR SPONSORED BY TWITCH INTERACTIVE, INC. ALL TWITCH TRADEMARKS, LOGOS AND BRAND NAMES ARE THE PROPERTY OF THEIR RESPECTIVE OWNERS.**

Copyright 2026 Kybrien. All Rights Reserved.
