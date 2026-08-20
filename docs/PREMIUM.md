# Kira Music Bot — Premium Entitlement System

Kira features an enterprise-ready, multi-tier Premium system supporting both **User-level** and **Guild-level** entitlements.

---

## 1. Premium Tiers Overview

| Tier Name | ID | Max Queue Size | Max Playlists | Max Tracks / Playlist | No-Prefix | Autoplay | 24/7 Mode | Filters Supported | Priority Audio |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Free** | `free` | 100 | 3 | 50 | ❌ | ❌ | ❌ | Bass, Night, Vapor | ❌ |
| **Silver** | `silver` | 300 | 10 | 150 | ✅ | ✅ | ❌ | + 8D, Karaoke | ❌ |
| **Gold** | `gold` | 1,000 | 30 | 500 | ✅ | ✅ | ✅ | + Timescale, Tremolo | ✅ |
| **Diamond** | `diamond` | 5,000 | 100 | 2,000 | ✅ | ✅ | ✅ | All Filters | ✅ |

---

## 2. Entitlement Resolution Hierarchy

When checking permissions and limits for a user executing a command in a guild:
1. **Developer & Owner Bypass**: Bot owners and designated developers automatically receive `Diamond` tier perks globally.
2. **Guild Entitlement**: If the server has an active guild-level premium subscription, all members in that guild benefit from the server's tier perks (e.g., 24/7 mode, high queue limits).
3. **User Entitlement**: If the executing user has personal premium, their individual limits (e.g. personal playlists, no-prefix commands across all servers) apply.
4. **Fallback**: Defaults to `Free` tier rules.

---

## 3. Premium Features Explained

### 3.1 Premium No-Prefix System
Users with Silver, Gold, or Diamond tier can execute commands without any prefix:
```
play Interstellar Main Theme
skip
queue
volume 90
```
- **Safety Mechanism**: The command parser strictly checks if the first word matches a registered command name or alias. Normal conversation messages (e.g. `play with me later`) are never falsely parsed as bot commands.

### 3.2 24/7 Persistent Voice Channel Mode
- Prevents the bot from disconnecting when the voice channel becomes empty or the queue ends.
- Saves voice channel and player state to the SQLite database.
- Restores 24/7 voice connections automatically when the bot restarts.

### 3.3 Autoplay Recommendation Engine
- When the queue runs out of songs, the autoplay engine analyzes the last played track, queries related music from the Lavalink node, and seamlessly enqueues recommendations.

---

## 4. Granting and Managing Entitlements

Bot administrators and owners can grant or revoke premium tiers using the `/dev premium` command:

```
# Grant Gold tier to a server for 30 days
/dev premium grant guild 123456789012345678 gold 30

# Grant Diamond tier permanently (lifetime) to a user
/dev premium grant user 987654321098765432 diamond 0

# Revoke premium from a server
/dev premium revoke guild 123456789012345678
```
