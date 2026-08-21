# Kira Music Bot — Command Reference Manual

This manual provides complete documentation for all 41 commands available in Kira.

---

## 🎵 Music & Playback Commands

### `/play`
- **Description:** Play or queue a song or playlist from YouTube, Spotify, SoundCloud, or direct audio link.
- **Aliases:** `!p`, `!play`
- **Options:** `query` (String, Required) — Song title, artist, or URL.
- **Permissions:** In voice channel.

### `/search`
- **Description:** Search for tracks and choose from an interactive Select Menu.
- **Aliases:** `!find`
- **Options:** `query` (String, Required) — Search query.

### `/pause`
- **Description:** Pause the currently playing audio track.
- **Aliases:** `!halt`
- **Permissions:** In voice channel, DJ / Requester.

### `/resume`
- **Description:** Resume paused audio playback.
- **Aliases:** `!unpause`, `!continue`
- **Permissions:** In voice channel, DJ / Requester.

### `/skip`
- **Description:** Skip the currently playing track.
- **Aliases:** `!s`, `!next`
- **Permissions:** In voice channel, DJ / Requester.

### `/previous`
- **Description:** Return to and play the previously played track in history.
- **Aliases:** `!prev`, `!back`
- **Permissions:** In voice channel, DJ / Requester.

### `/stop`
- **Description:** Stop playback, empty the queue, and disconnect from the voice channel.
- **Aliases:** `!leave`, `!disconnect`
- **Permissions:** In voice channel, DJ / Admin.

### `/restart`
- **Description:** Restart the currently playing song from 00:00.
- **Aliases:** `!replay`
- **Permissions:** In voice channel, DJ / Requester.

### `/seek`
- **Description:** Seek to a specific timestamp in the current track.
- **Aliases:** `!jumpto`
- **Options:** `position` (String, Required) — Timestamp (e.g., `1:30`, `90s`, `2m15s`).

### `/forward`
- **Description:** Fast forward the track by a specified number of seconds.
- **Aliases:** `!fwd`, `!ff`
- **Options:** `seconds` (Integer, Optional, Default: 10).

### `/rewind`
- **Description:** Rewind playback by a specified number of seconds.
- **Aliases:** `!rw`
- **Options:** `seconds` (Integer, Optional, Default: 10).

### `/volume`
- **Description:** View or adjust the audio playback volume (0% to 150%).
- **Aliases:** `!vol`, `!v`
- **Options:** `level` (Integer, Optional) — Volume level between 0 and 150.

### `/nowplaying`
- **Description:** Render and send an interactive Skia Canvas player card with playback controls.
- **Aliases:** `!np`, `!current`

### `/loop`
- **Description:** Configure playback repeat mode.
- **Aliases:** `!repeat`
- **Options:** `mode` (String, Optional: `off`, `track`, `queue`).

### `/shuffle`
- **Description:** Randomize the order of all tracks in the queue.
- **Aliases:** `!mix`, `!shuff`

### `/autoplay`
- **Description:** Toggle automatic discovery of related tracks when the queue finishes.
- **Aliases:** `!ap`, `!auto`
- **Requirements:** Silver, Gold, or Diamond Premium tier.

### `/247`
- **Description:** Toggle 24/7 persistent voice channel stay.
- **Aliases:** `!stay`, `!alwayson`
- **Requirements:** Gold or Diamond Premium tier.

### `/lyrics`
- **Description:** View paginated synchronized lyrics for the current track or a specified song.
- **Aliases:** `!ly`
- **Options:** `query` (String, Optional) — Specific song title.

### `/recommend`
- **Description:** Discover and add 3 tracks recommended based on the current playing song.
- **Aliases:** `!rec`, `!suggestions`

### `/related`
- **Description:** Alias for `/recommend`.
- **Aliases:** `!similartracks`

### `/filters`
- **Description:** Open the interactive audio DSP filter tuning panel or apply a specific preset.
- **Aliases:** `!fx`, `!filter`
- **Options:** `preset` (String, Optional: `none`, `bassboost`, `nightcore`, `vaporwave`, `8d`, `karaoke`, `timescale`).

---

## 📑 Queue & Playlist Commands

### `/queue`
- **Subcommands:**
  - `view [page]`: View paginated queue list.
  - `add <query>`: Add track to queue.
  - `remove <pos>`: Remove track by position index.
  - `move <from> <to>`: Move track between positions.
  - `clear`: Clear all upcoming tracks.
  - `shuffle`: Randomize queue order.
  - `jump <pos>`: Skip directly to position index.

### `/playlist`
- **Subcommands:**
  - `create <name> [desc]`: Create custom playlist.
  - `delete <name>`: Delete playlist.
  - `add <name> <track>`: Add track to playlist.
  - `remove <name> <pos>`: Remove track from playlist by index.
  - `play <name>`: Load entire playlist into queue.
  - `list`: View all your saved playlists.
  - `view <name>`: Inspect tracks inside a playlist.
  - `import <name> <url>`: Import playlist from external YouTube/Spotify link.

---

## 📚 Library & Analytics Commands

### `/favorite`
- **Description:** Toggle the current playing track in and out of your personal favorites.
- **Aliases:** `!fav`

### `/favorites`
- **Description:** View, clear, or load all your saved favorites into the playback queue.
- **Aliases:** `!favs`, `!myfavorites`
- **Options:** `action` (String: `view`, `play`, `clear`).

### `/history`
- **Description:** View your recent listening history across all servers.
- **Aliases:** `!recent`, `!played`

### `/profile`
- **Description:** Render a high-resolution Skia Canvas card of your listening statistics, top artists, and top tracks.
- **Aliases:** `!userinfo`, `!musicprofile`
- **Options:** `user` (User, Optional).

### `/stats`
- **Description:** View server and global listening statistics and top listener leaderboard.
- **Aliases:** `!serverstats`, `!leaderboard`

---

## ⚙️ Settings & Configuration Commands

### `/settings`
- **Description:** Interactive Components V2 dashboard for server prefix, DJ role, volume, 24/7 mode, and channel rules.
- **Permissions:** Manage Server / Administrator.

### `/setup`
- **Description:** Interactive 3-step first-time server setup wizard for channels and DJ roles.
- **Permissions:** Manage Server / Administrator.

### `/prefix`
- **Description:** Change or view the server command prefix.
- **Options:** `new_prefix` (String, Optional).

### `/dj`
- **Description:** Set or clear the dedicated DJ role for controlling playback.
- **Options:** `role` (Role, Optional).

### `/player`
- **Description:** Designate a specific text channel for the persistent interactive player card.
- **Options:** `channel` (Channel, Optional).

### `/permissions`
- **Description:** View server playback permission rules.

### `/premium`
- **Description:** View current premium tier status, active entitlements, and unlocked perks.

---

## 🛠️ Utility & Developer Commands

### `/help` / `/helpop`
- **Description:** Interactive Discord Components V2 command browser and minimal dashboard.
- **Aliases:** `helpop`, `commands`, `h`, `helpme`
- **Options:** `category` (`home`, `music`, `queue`, `library`, `settings`, `premium`, `dev`) (String, Optional).

### `/ping`
- **Description:** Measure Discord Gateway and Lavalink node latency.

### `/botinfo`
- **Description:** Display bot version, memory usage, process uptime, and Lavalink cluster health.

### `/invite`
- **Description:** Get the official bot invitation link.

### `/support`
- **Description:** Get an invitation link to the official support server.

### `/dev` (Developer / Owner Only)
- **Subcommands:**
  - `nodes`: Live telemetry for Lavalink CPU, memory, active players, and uptime.
  - `guild <id>`: Inspect server database record and player state.
  - `player <id> <stop|destroy>`: Manage active player in target guild.
  - `premium <grant|revoke> <user|guild> <id> [tier] [days]`: Manage premium entitlements.
  - `cache <inspect|flush>`: Inspect or flush LRU memory caches.
  - `reload`: Hot reload command modules and registry.
  - `sync`: Force global slash command synchronization with Discord REST API.
  - `maintenance`: Toggle global maintenance mode.
  - `blacklist <add|remove> <user|guild> <id> [reason]`: Manage blacklisted entities.
