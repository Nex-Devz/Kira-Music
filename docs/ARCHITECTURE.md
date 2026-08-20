# Kira Music Bot — Architecture Specification

This document details the architectural design, component interactions, data flows, and state management of Kira.

---

## 1. High-Level Architecture Overview

Kira is structured into decoupled, single-responsibility layers:

```
+-------------------------------------------------------------+
|                      Discord Gateway                        |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Event Dispatcher                        |
|   (ready, interactionCreate, messageCreate, voiceState)     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              Command & Interaction Router                   |
|     - Slash Command Router                                  |
|     - Prefix & No-Prefix Message Command Parser             |
|     - Namespaced Custom ID Router (player:*, queue:*, etc.) |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 Pre-Execution Middleware                    |
|   [Blacklist -> Maint -> Voice -> Perms -> Prem -> Cooldown]|
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  Unified Command Execution                  |
|                 (CommandContext Abstraction)                |
+-------------------------------------------------------------+
           |                                       |
           v                                       v
+-----------------------+              +-----------------------+
|     MusicManager      |              |   Database Services   |
|   (YuKumo Lavalink)   |              | (SQLite Repositories) |
+-----------------------+              +-----------------------+
           |                                       |
           +-------------------+-------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   Presentation Layer                        |
|   - Skia Canvas Card Generator (Player, Profile)            |
|   - Discord Components V2 Templates (Containers, Sections)  |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Discord REST API                       |
+-------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Discord Components V2 System (`src/ui/componentsV2.js`)
Instead of legacy embed objects, Kira uses native Discord Components V2 structures with the `IS_COMPONENTS_V2` message flag (`flags: 32768`):
- **Container (`type: 17`)**: Holds children with optional accent borders and spoiler flags.
- **Section (`type: 9`)**: Groups markdown text with optional accessory components.
- **TextDisplay (`type: 10`)**: Formats markdown content without traditional embed field limits.
- **Separator (`type: 14`)**: Renders visual dividing lines with customizable spacing.
- **ActionRow (`type: 1`) & Interactive Elements**: Buttons (`type: 2`), String Selects (`type: 3`), Channel Selects (`type: 8`), and Role Selects (`type: 6`).

### 2.2 Audio Client Layer (`src/managers/MusicManager.js`)
- Uses **YuKumo** to communicate with Lavalink v4 nodes over WebSockets and REST.
- Subscribes to Discord gateway raw voice events via `DiscordJSAdapter`.
- Manages player instances, audio queues, and active DSP filters.
- Tracks player state persistence for 24/7 restoration after process restarts.
- Autoplay candidate resolver: searches related tracks when queues finish.

### 2.3 Command & Context Unification (`src/handlers/CommandContext.js`)
- Normalizes `ChatInputCommandInteraction`, `Message` (prefix commands), and `Message` (premium no-prefix commands).
- Unified methods: `context.reply()`, `context.deferReply()`, `context.editReply()`, `context.getString()`, `context.getInteger()`, `context.getChannel()`, `context.getRole()`.
- Guarantees identical execution logic across all input methods.

### 2.4 Middleware Pipeline (`src/middleware/pipeline.js`)
Pre-execution gatekeeper executing ordered checks:
1. **Blacklist Check**: Rejects blocked users and guilds.
2. **Developer / Owner Check**: Protects `/dev` command suite.
3. **Maintenance Check**: Rejects normal commands during maintenance.
4. **Voice Channel Check**: Verifies requester is in voice, bot is in same voice, and bot has Connect/Speak permissions.
5. **DJ / Admin Check**: Validates configured DJ roles and bypass permissions.
6. **Premium Entitlement Check**: Validates tier requirements for gated features.
7. **Cooldown Check**: Rate limits commands per-user and per-guild.

### 2.5 Relational Database Layer (`src/database/`)
- Uses `better-sqlite3` with Write-Ahead Logging (`WAL`) mode enabled.
- Tables:
  - `guilds`: Server settings, prefix, DJ role, music channels, volume, loop mode, 24/7 state.
  - `users`: User preferences.
  - `favorites`: Personal favorited tracks.
  - `listening_history`: Historical plays per user and guild.
  - `playlists` & `playlist_tracks`: Custom multi-track playlists.
  - `premium`: Entitlements, plans, expiration dates.
  - `stats`: Aggregate track plays and listening duration.
  - `blacklist`: Blocked entity records.
  - `persistent_players`: Live player state for 24/7 recovery.

---

## 3. Namespaced Interaction Routing

All interactive components utilize structured custom IDs in the format `namespace:action:param1:param2`:
- `player:pause`, `player:resume`, `player:skip`, `player:previous`, `player:stop`, `player:favorite`, `player:more`, `player:refresh`
- `player:loop:<mode>`, `player:autoplay:<bool>`, `player:vol:<up|down>`, `player:seek:<fwd|back>`, `player:247:toggle`
- `queue:page:<number>`, `queue:clear`, `queue:remove:<pos>`, `queue:jump:<pos>`
- `lyrics:page:<number>`
- `playlist:select`, `playlist:play:<id>`, `playlist:delete:<id>`, `playlist:list`
- `setup:channel:<any|current>`, `setup:dj:<none|create>`
- `filter:select`
- `help:category`

This pattern eliminates massive switch statements in event listeners and routes actions directly to dedicated handlers.
