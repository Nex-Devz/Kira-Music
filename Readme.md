# Kira — Modern Production-Ready Discord Music Bot

> **Engineered with Node.js, YuKumo (Lavalink v4), Discord Components V2, and Skia Canvas.**
> Minimal, clean, dark aesthetic with zero unnecessary emojis and zero legacy embeds.

---

## 🌟 Key Architecture & Highlights

- **100% Discord Components V2**: Every interface (Player, Queue, Search, Playlists, Lyrics, Settings, Setup Wizard, Premium Dashboard, Help Browser, Error Cards) is rendered with Discord Components V2 (`Container`, `Section`, `TextDisplay`, `Separator`, `ActionRow`, `Button`, `StringSelect`, `Modals`) using `flags: 1 << 15`.
- **YuKumo Lavalink v4 Engine**: High-performance audio client layer supporting track caching, audio filter DSPs, playlist resolving, autoplay recommendation algorithms, and 24/7 persistent voice states.
- **Dynamic Skia Canvas Visuals**: Generates dark obsidian player banners with album art, ambient lighting glow, progress bar, audio badges, and requester tags, as well as personalized profile listening cards.
- **Unified Command Execution Layer**: Slash commands, configurable prefix commands (e.g. `!`), and Premium No-Prefix commands share the exact same business logic via `CommandContext`.
- **Comprehensive Premium Tier System**: Supports Free, Silver, Gold, and Diamond tiers with user/guild entitlements, custom limits, 24/7 mode, autoplay, expanded queues, and extra playlists.
- **Namespaced Interaction Routing**: Custom IDs (`player:*`, `queue:*`, `lyrics:*`, `playlist:*`, `filter:*`, `settings:*`, `setup:*`, `premium:*`) are cleanly dispatched through `InteractionRouter`.
- **Pre-execution Middleware Pipeline**: Automated checks for blacklists, maintenance mode, voice channel membership, DJ/Admin roles, bot permissions, premium gating, and rate-limiting cooldowns.

---

## 📁 Directory Structure

```
kira/
├── src/
│   ├── index.js                  # Bot initialization & client lifecycle
│   ├── config/
│   │   ├── index.js              # Environment & Lavalink configuration
│   │   └── constants.js          # UI colors, Component types, Premium tiers
│   ├── database/
│   │   ├── index.js              # SQLite database manager (better-sqlite3)
│   │   ├── schema.sql            # Relational database schema
│   │   └── repositories/         # Guild, User, Playlist, Premium, Stats, Blacklist
│   ├── managers/
│   │   ├── MusicManager.js       # YuKumo Lavalink client & player orchestrator
│   │   ├── PremiumManager.js     # Tier validation, entitlements, feature limits
│   │   ├── PermissionManager.js  # Role checks, DJ logic, Voice permissions
│   │   ├── CooldownManager.js    # Per-user/guild command cooldowns
│   │   └── CacheManager.js       # LRU caches for artwork, lyrics, track info
│   ├── canvas/
│   │   ├── PlayerCanvas.js       # Dark obsidian player banner renderer
│   │   └── ProfileCanvas.js      # User listening statistics card renderer
│   ├── ui/
│   │   ├── componentsV2.js       # Discord Components V2 builder classes
│   │   └── templates.js          # Reusable UI component views & templates
│   ├── middleware/
│   │   └── pipeline.js           # Pre-execution validation pipeline
│   ├── handlers/
│   │   ├── CommandContext.js     # Unified Slash / Message / Interaction wrapper
│   │   ├── CommandHandler.js     # Command loader & registry
│   │   ├── InteractionRouter.js  # Namespaced component & modal router
│   │   └── ErrorHandler.js       # Safe Components V2 error formatter
│   ├── events/                   # Ready, InteractionCreate, MessageCreate, VoiceStateUpdate, etc.
│   └── commands/
│       ├── music/                # Play, Search, Pause, Resume, Skip, Prev, Stop, Seek, Vol, Loop, etc.
│       ├── queue/                # Queue viewer, Add, Remove, Move, Clear, Shuffle, Jump
│       ├── library/              # Favorites, History, Profile card
│       ├── playlist/             # Create, Delete, Add, Remove, Play, List, View, Import
│       ├── settings/             # Settings dashboard, Setup wizard, Prefix, DJ, Player channel
│       ├── premium/              # Premium tier dashboard & perk manager
│       ├── utility/              # Help browser, Stats, Ping, Botinfo, Invite, Support
│       └── dev/                  # Protected developer diagnostics & node controls
├── tests/
│   └── verify.js                 # Complete automated verification suite
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **Lavalink v4**: A running Lavalink v4 server instance

### 2. Installation
```bash
git clone <repository-url>
cd Kira
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
OWNER_IDS=your_discord_user_id
DEV_IDS=your_discord_user_id
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
```

### 4. Running the Bot
```bash
# Run verification test suite
npm test

# Start the bot
npm start
```

---

## 📜 Complete Command Reference

### Music & Playback
| Command | Description |
| :--- | :--- |
| `/play <query>` | Play or queue a song or playlist from YouTube, Spotify, SoundCloud, or URL |
| `/search <query>` | Interactive search menu with select options |
| `/pause` | Pause audio playback |
| `/resume` | Resume paused playback |
| `/skip` | Skip the current track |
| `/previous` | Return to the previously played song |
| `/stop` | Stop playback and clear the queue |
| `/restart` | Restart current track from 00:00 |
| `/seek <time>` | Seek to timestamp (e.g. `1:30`, `90s`, `2m15s`) |
| `/forward <sec>` | Fast forward by specified seconds |
| `/rewind <sec>` | Rewind playback by specified seconds |
| `/volume <0-150>` | Adjust audio playback volume |
| `/nowplaying` | Display current track interactive player card |
| `/loop <off\|track\|queue>` | Set loop repeat mode |
| `/shuffle` | Randomize the order of tracks in the queue |
| `/autoplay` | Toggle automatic related song discovery |
| `/247` | Toggle 24/7 persistent voice channel connection |
| `/lyrics [song]` | Display paginated synchronized lyrics |
| `/recommend` | Queue recommended tracks based on current song |
| `/filters` | Audio tuning panel (Bassboost, Nightcore, Vaporwave, 8D, Karaoke, Timescale) |

### Queue & Playlists
| Command | Description |
| :--- | :--- |
| `/queue view [page]` | Paginated view of upcoming tracks |
| `/queue add <query>` | Append song to queue |
| `/queue remove <pos>` | Remove song at index |
| `/queue move <from> <to>` | Move song between positions |
| `/queue clear` | Empty the queue |
| `/queue jump <pos>` | Jump directly to a track in the queue |
| `/playlist create <name>` | Create a custom playlist |
| `/playlist add <name> <track>` | Add track to playlist |
| `/playlist remove <name> <pos>` | Remove track from playlist |
| `/playlist play <name>` | Enqueue an entire custom playlist |
| `/playlist list` | View all your saved playlists |
| `/playlist view <name>` | Inspect songs in a playlist |
| `/playlist import <url>` | Import playlist from YouTube/Spotify |

### Library & Personal Stats
| Command | Description |
| :--- | :--- |
| `/favorite` | Toggle current song into personal favorites |
| `/favorites` | View, clear, or play all saved favorites |
| `/history` | View recent listening history |
| `/profile [user]` | Render personalized Skia Canvas analytics profile card |
| `/stats` | View server and global listening statistics |

### Settings & Administration
| Command | Description |
| :--- | :--- |
| `/settings` | Interactive server dashboard |
| `/setup` | First-time server setup wizard |
| `/prefix <new_prefix>` | Change the prefix for this server |
| `/dj [role]` | Configure dedicated DJ role |
| `/player [channel]` | Configure dedicated persistent player channel |
| `/permissions` | View server permission rules |
| `/premium` | View active plan, entitlements, and unlockable features |

### Developer & Owner Suite
| Command | Description |
| :--- | :--- |
| `/dev nodes` | Real-time telemetry: Lavalink CPU, memory, uptime, latency |
| `/dev guild <id>` | Inspect server database record and active player |
| `/dev player <id> <action>` | Stop or destroy active player instance |
| `/dev premium <grant\|revoke>` | Grant or revoke premium entitlements |
| `/dev cache <inspect\|flush>` | Inspect or flush LRU memory caches |
| `/dev reload` | Reload command modules and registry |
| `/dev sync` | Force sync application slash commands globally |
| `/dev maintenance` | Toggle global maintenance mode |
| `/dev blacklist <add\|remove>` | Manage blacklisted users and servers |

---

## 🛡️ License & Credits

Built with ❤️ by the Kira Dev Team. Licensed under the MIT License.