# Music Bot

> A modern, high-performance Discord music bot built with Node.js, YuKumo, Lavalink and Discord Components V2.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Lavalink-v4-5865F2?style=for-the-badge" />
  <img src="https://img.shields.io/badge/YuKumo-Latest-8B5CF6?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Discord-Components%20V2-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
</p>

<p align="center">
  Clean UI · Fast Playback · Interactive Controls · Scalable Architecture
</p>

---

## Overview

Music Bot is a modern Discord music application designed around a clean and minimal user experience.

The entire interface is built using Discord Components V2 instead of traditional embed-based interfaces. Music playback is powered by YuKumo and Lavalink, while Canvas is used to generate dynamic player artwork.

The goal is to provide a native-feeling music experience directly inside Discord.

---

## Core Features

### Music

- `/play`
- `/search`
- `/pause`
- `/resume`
- `/skip`
- `/previous`
- `/stop`
- `/restart`
- `/seek`
- `/forward`
- `/rewind`
- `/volume`
- `/nowplaying`

### Queue

- Interactive queue
- Pagination
- Track removal
- Track movement
- Queue jumping
- Queue shuffle
- Queue clearing
- Queue duration
- Track positions

### Playback

- Loop
- Shuffle
- Autoplay
- 24/7 mode
- Volume control
- Persistent player

### Discovery

- Interactive search
- Lyrics
- Related tracks
- Recommendations
- Autoplay recommendations

### Library

- Favorites
- Listening history
- Personal playlists
- Music profile
- Listening statistics

### Playlists

- Create playlists
- Delete playlists
- Add tracks
- Remove tracks
- Play playlists
- View playlists
- Import playlists

### Audio Filters

- Bass Boost
- Nightcore
- Karaoke
- 8D
- Vaporwave
- Timescale
- Custom filters
- Filter reset

### Server Management

- Server setup wizard
- Custom prefix
- DJ role
- Player channel
- Music channel
- Permission management
- Player configuration
- Server settings

### Premium

- No-prefix commands
- 24/7 playback
- Advanced filters
- Larger queues
- Additional playlists
- Custom player themes
- Premium Canvas designs
- Autoplay
- Priority playback
- Additional premium features

### Developer

- Lavalink node monitoring
- Player inspection
- Guild inspection
- Premium management
- Cache management
- Command synchronization
- Maintenance mode
- Blacklist management
- System diagnostics

---

## Player

The player is the core of the application.

Each server can have one persistent music player that is updated instead of creating new messages.

```text
+------------------------------------------------+
|                                                |
|                  ALBUM ART                     |
|                                                |
|  NOW PLAYING                                   |
|  Blinding Lights                               |
|  The Weeknd                                    |
|                                                |
|  01:42  =====================  03:20           |
|                                                |
|  Requested by Ansh                             |
|                                                |
|  [ Previous ] [ Pause ] [ Next ]               |
|                                                |
|  [ Queue ] [ Lyrics ] [ More ]                 |
|                                                |
+------------------------------------------------+