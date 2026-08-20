CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    dj_role_id TEXT DEFAULT NULL,
    music_channel_id TEXT DEFAULT NULL,
    player_channel_id TEXT DEFAULT NULL,
    player_message_id TEXT DEFAULT NULL,
    default_volume INTEGER DEFAULT 80,
    loop_mode TEXT DEFAULT 'off',
    autoplay INTEGER DEFAULT 0,
    mode_247 INTEGER DEFAULT 0,
    player_theme TEXT DEFAULT 'classic_dark',
    permissions TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    preferences TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    uri TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    artwork_url TEXT,
    source TEXT DEFAULT 'youtube',
    added_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS listening_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    uri TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    played_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_guild ON listening_history(guild_id);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    is_public INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    uri TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    artwork_url TEXT,
    source TEXT DEFAULT 'youtube',
    position INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks ON playlist_tracks(playlist_id);

CREATE TABLE IF NOT EXISTS premium (
    target_id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL, -- 'user' or 'guild'
    tier TEXT NOT NULL, -- 'silver', 'gold', 'diamond'
    granted_by TEXT,
    starts_at INTEGER NOT NULL,
    expires_at INTEGER, -- NULL or 0 for permanent
    features TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT,
    tracks_played INTEGER DEFAULT 0,
    play_time_ms INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_guild_user ON stats(guild_id, user_id);

CREATE TABLE IF NOT EXISTS blacklist (
    target_id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL, -- 'user' or 'guild'
    reason TEXT,
    banned_by TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS persistent_players (
    guild_id TEXT PRIMARY KEY,
    voice_channel_id TEXT,
    text_channel_id TEXT,
    player_message_id TEXT,
    is_247 INTEGER DEFAULT 0,
    volume INTEGER DEFAULT 80,
    loop_mode TEXT DEFAULT 'off',
    autoplay INTEGER DEFAULT 0,
    filters TEXT DEFAULT '[]',
    updated_at INTEGER NOT NULL
);
