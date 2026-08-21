const { Kazagumo, KazagumoTrack, Events } = require('kazagumo');
const { Connectors } = require('shoukaku');
const config = require('../config');
const guildRepo = require('../database/repositories/GuildRepository');
const userRepo = require('../database/repositories/UserRepository');
const statsRepo = require('../database/repositories/StatsRepository');
const persistentRepo = require('../database/repositories/PersistentPlayerRepository');
const uiTemplates = require('../ui/templates');
const cacheManager = require('./CacheManager');

class MusicManager {
  constructor() {
    this.kazagumo = null;
    this.client = null;
    this.playerMessages = new Map(); // guildId -> messageId
    this.maintenance = false;
  }

  /**
   * Backward compatibility getter for kumo
   */
  get kumo() {
    return this.kazagumo;
  }

  /**
   * Initialize Kazagumo and attach Shoukaku Discord.js connector
   */
  init(client) {
    if (this.kazagumo) return;
    this.client = client;

    const nodes = (config.lavalink.nodes || []).map(n => ({
      name: n.name || 'Default-Node',
      url: `${n.host}:${n.port}`,
      auth: n.password,
      secure: Boolean(n.secure)
    }));

    const shoukakuOptions = {
      moveOnDisconnect: true,
      resumable: true,
      resumableTimeout: 30,
      reconnectTries: 10,
      restTimeout: 10000
    };

    const connector = new Connectors.DiscordJS(client);

    this.kazagumo = new Kazagumo(
      {
        defaultSearchEngine: config.lavalink.defaultSearchEngine || 'youtube',
        send: (guildId, payload) => {
          const guild = client.guilds.cache.get(guildId);
          if (guild) guild.shard.send(payload);
        }
      },
      connector,
      nodes,
      shoukakuOptions
    );

    // If client is already ready, connect to nodes immediately
    if (client.isReady?.() || client.user?.id) {
      try {
        this.kazagumo.shoukaku.connector.ready(nodes);
      } catch (err) {
        console.error('[Kazagumo] Connector ready error:', err?.message || err);
      }
    }

    this.registerEvents();
  }

  /**
   * Register Kazagumo and Shoukaku Node events
   */
  registerEvents() {
    if (!this.kazagumo) return;

    // Shoukaku Node Lifecycle Events
    this.kazagumo.shoukaku.on('ready', (name) => {
      console.log(`[Kazagumo] Lavalink Node "${name}" connected and ready.`);
    });

    this.kazagumo.shoukaku.on('reconnecting', (name, left, interval) => {
      console.log(`[Kazagumo] Lavalink Node "${name}" reconnecting (tries left: ${left}, interval: ${interval}ms)...`);
    });

    this.kazagumo.shoukaku.on('disconnect', (name, count) => {
      console.warn(`[Kazagumo] Lavalink Node "${name}" disconnected. Reconnect count: ${count}`);
    });

    this.kazagumo.shoukaku.on('close', (name, code, reason) => {
      console.warn(`[Kazagumo] Lavalink Node "${name}" closed connection (${code}): ${reason}`);
    });

    this.kazagumo.shoukaku.on('error', (name, error) => {
      console.error(`[Kazagumo] Lavalink Node "${name}" error:`, error?.message || error);
    });

    // Kazagumo Player: Track Start Event
    this.kazagumo.on(Events.PlayerStart, async (player, track) => {
      if (!player || !track) return;

      this.patchPlayer(player);

      const guildId = player.guildId;
      const requesterId = track.requester?.id || track.requesterId;

      // Track statistics & history
      if (requesterId) {
        userRepo.addHistory(requesterId, guildId, {
          title: track.title || track.info?.title,
          author: track.author || track.info?.author,
          uri: track.uri || track.info?.uri,
          duration: track.length || track.duration || track.info?.duration
        });

        statsRepo.recordPlay(guildId, requesterId, track.length || track.duration || 0);
      }

      // Update persistent player UI
      await this.updatePlayerMessage(player);
    });

    // Kazagumo Player: Track End Event
    this.kazagumo.on(Events.PlayerEnd, async (player) => {
      if (!player) return;
      this.patchPlayer(player);
    });

    // Kazagumo Player: Queue Empty Event
    this.kazagumo.on(Events.PlayerEmpty, async (player) => {
      if (!player) return;
      this.patchPlayer(player);

      // Autoplay handler when queue becomes empty
      if (player.autoplay) {
        try {
          await this.triggerAutoplay(player);
        } catch (err) {
          console.error('[MusicManager] Autoplay error:', err);
        }
      }
    });

    // Kazagumo Player: Exception / Error Events
    this.kazagumo.on(Events.PlayerException, async (player, error) => {
      console.error(`[Kazagumo] Track exception in guild ${player?.guildId}:`, error);
    });

    this.kazagumo.on(Events.PlayerError, async (player, error) => {
      console.error(`[Kazagumo] Player error in guild ${player?.guildId}:`, error);
    });

    this.kazagumo.on(Events.PlayerClosed, async (player) => {
      if (!player) return;
      this.patchPlayer(player);
      await this.updatePlayerMessage(player, true);
    });

    this.kazagumo.on(Events.PlayerDestroy, async (player) => {
      if (!player) return;
      this.patchPlayer(player);
    });
  }

  /**
   * Helper to ensure player compatibility aliases
   */
  patchPlayer(player) {
    if (!player) return player;

    if (!player.activeFilters) player.activeFilters = [];
    if (player.autoplay === undefined) player.autoplay = false;
    if (player.is247 === undefined) player.is247 = false;
    if (player.loop === undefined) player.loop = 'off';

    // Current track getter
    if (!Object.getOwnPropertyDescriptor(player, 'currentTrack')) {
      Object.defineProperty(player, 'currentTrack', {
        get() {
          return this.queue?.current || null;
        },
        set(val) {
          if (this.queue) this.queue.current = val;
        },
        configurable: true
      });
    }

    // Voice & Text channel ID compatibility
    if (!Object.getOwnPropertyDescriptor(player, 'voiceChannelId')) {
      Object.defineProperty(player, 'voiceChannelId', {
        get() {
          return this.voiceId;
        },
        set(val) {
          this.voiceId = val;
        },
        configurable: true
      });
    }

    if (!Object.getOwnPropertyDescriptor(player, 'textChannelId')) {
      Object.defineProperty(player, 'textChannelId', {
        get() {
          return this.textId;
        },
        set(val) {
          this.textId = val;
        },
        configurable: true
      });
    }

    // Queue tracks compatibility
    if (player.queue) {
      if (!Object.getOwnPropertyDescriptor(player.queue, 'tracksList')) {
        Object.defineProperty(player.queue, 'tracksList', {
          get() {
            return this;
          },
          configurable: true
        });
      }

      if (typeof player.queue.enqueue !== 'function') {
        player.queue.enqueue = (tracks) => player.queue.add(tracks);
      }

      if (typeof player.queue.dequeue !== 'function') {
        player.queue.dequeue = () => player.queue.shift();
      }

      const origIsEmpty = player.queue.isEmpty;
      if (typeof origIsEmpty !== 'function') {
        player.queue.isEmpty = function() {
          return this.length === 0;
        };
      }
    }

    if (typeof player.setVoice !== 'function') {
      player.setVoice = (voiceId) => player.setVoiceChannel(voiceId);
    }

    return player;
  }

  /**
   * Get existing player or null
   */
  getPlayer(guildId) {
    if (!this.kazagumo) return null;
    const player = this.kazagumo.players.get(guildId) || null;
    if (player) this.patchPlayer(player);
    return player;
  }

  /**
   * Get or create player for guild
   */
  async createPlayer(guildId, voiceChannelId, textChannelId) {
    if (!this.kazagumo) throw new Error('Kazagumo music engine not initialized.');

    let player = this.kazagumo.players.get(guildId);
    if (player) {
      this.patchPlayer(player);
      if (voiceChannelId && player.voiceId !== voiceChannelId) {
        await player.setVoiceChannel(voiceChannelId);
      }
      if (textChannelId && player.textId !== textChannelId) {
        player.setTextChannel(textChannelId);
      }
      return player;
    }

    const guildData = guildRepo.get(guildId) || {};
    const is247 = Boolean(guildData.mode_247);
    const defVol = guildData.default_volume || 80;
    const defLoop = guildData.loop_mode || 'off';
    const autoplay = Boolean(guildData.autoplay);

    player = await this.kazagumo.createPlayer({
      guildId,
      voiceId: voiceChannelId,
      textId: textChannelId,
      volume: defVol,
      deaf: true
    });

    this.patchPlayer(player);

    player.activeFilters = [];
    player.autoplay = autoplay;
    player.is247 = is247;
    player.loop = defLoop;

    if (defLoop !== 'off') {
      player.setLoop(defLoop === 'off' ? 'none' : defLoop);
    }

    return player;
  }

  /**
   * Get an available Lavalink node
   */
  getNode() {
    if (!this.kazagumo?.shoukaku) return null;
    const nodes = [...this.kazagumo.shoukaku.nodes.values()];
    return nodes.find(n => n.state === 1) || nodes[0] || null;
  }

  /**
   * Standardize raw Lavalink load result into formatted structure
   */
  formatLoadResult(raw, requester) {
    if (!raw) return { loadType: 'empty', type: 'SEARCH', tracks: [] };
    const loadType = (raw.loadType || 'empty').toLowerCase();

    let rawTracks = [];
    if (loadType === 'track' && raw.data) {
      rawTracks = [raw.data];
    } else if (loadType === 'playlist' && raw.data) {
      rawTracks = raw.data.tracks || [];
    } else if (loadType === 'search' && Array.isArray(raw.data)) {
      rawTracks = raw.data;
    } else if (Array.isArray(raw.tracks)) {
      rawTracks = raw.tracks;
    }

    const tracks = rawTracks.map(t => {
      const kTrack = new KazagumoTrack(t, requester);
      kTrack.setKazagumo(this.kazagumo);
      kTrack.duration = kTrack.length || t.info?.length || t.info?.duration || 0;
      kTrack.artworkUrl = kTrack.thumbnail || t.info?.artworkUrl || null;
      if (requester) kTrack.requester = requester;
      return kTrack;
    });

    return {
      loadType,
      type: loadType.toUpperCase(),
      tracks,
      playlistInfo: raw.data?.info || raw.playlistInfo || null,
      name: raw.data?.info?.name || raw.playlistName || null,
      exception: raw.exception || null
    };
  }

  /**
   * Search for tracks using Kazagumo with multi-engine fallback
   */
  async search(query, requester = null) {
    if (!this.kazagumo) throw new Error('Kazagumo music engine is not ready.');

    const cached = cacheManager.getTrackInfo(query);
    if (cached) return cached;

    const node = this.getNode();
    if (!node) {
      console.warn('[MusicManager:search] No Lavalink node available.');
      return { loadType: 'empty', type: 'SEARCH', tracks: [] };
    }

    const isUrl = /^https?:\/\//i.test(query);
    const hasPrefix = /^[a-zA-Z0-9]+:/.test(query);

    let result = null;

    if (isUrl || hasPrefix) {
      try {
        const raw = await node.rest.resolve(query);
        result = this.formatLoadResult(raw, requester);
      } catch (err) {
        console.error('[MusicManager:search] Direct resolve error:', err?.message || err);
      }
    } else {
      // Smart Multi-Engine search cascade
      const defaultEngine = process.env.SEARCH_ENGINE || config.lavalink.defaultSearchEngine || 'spsearch';
      const enginePrefixes = {
        spotify: 'spsearch:',
        spsearch: 'spsearch:',
        youtube_music: 'ytmsearch:',
        ytmsearch: 'ytmsearch:',
        youtube: 'ytsearch:',
        ytsearch: 'ytsearch:',
        soundcloud: 'scsearch:',
        scsearch: 'scsearch:',
        deezer: 'dzsearch:',
        dzsearch: 'dzsearch:'
      };

      const primaryPrefix = enginePrefixes[defaultEngine] || 'spsearch:';
      const searchCascade = [
        primaryPrefix,
        'spsearch:',
        'ytmsearch:',
        'ytsearch:',
        'scsearch:',
        'dzsearch:'
      ];
      const uniqueCascade = [...new Set(searchCascade)];

      for (const prefix of uniqueCascade) {
        try {
          const raw = await node.rest.resolve(`${prefix}${query}`);
          const formatted = this.formatLoadResult(raw, requester);
          if (formatted && formatted.tracks && formatted.tracks.length > 0) {
            result = formatted;
            break;
          }
        } catch (err) {
          // Continue to next cascade engine
        }
      }
    }

    if (!result || !result.tracks || result.tracks.length === 0) {
      return { loadType: 'empty', type: 'SEARCH', tracks: [] };
    }

    cacheManager.setTrackInfo(query, result);
    return result;
  }

  /**
   * Connect and start playing or add to queue
   */
  async play(guildId, voiceChannelId, textChannelId, trackOrPlaylist, requester) {
    const player = await this.createPlayer(guildId, voiceChannelId, textChannelId);

    if (requester) {
      if (Array.isArray(trackOrPlaylist)) {
        trackOrPlaylist.forEach(t => {
          t.requester = requester;
          t.duration = t.length || t.duration || 0;
        });
      } else if (trackOrPlaylist) {
        trackOrPlaylist.requester = requester;
        trackOrPlaylist.duration = trackOrPlaylist.length || trackOrPlaylist.duration || 0;
      }
    }

    // Add to queue
    player.queue.add(trackOrPlaylist);

    // If not playing and not paused, start playback
    if (!player.playing && !player.paused) {
      await player.play();
    }

    return player;
  }

  /**
   * Play next track from queue
   */
  async playNext(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return null;

    if (player.queue.length === 0 && !player.queue.current) {
      if (player.autoplay) {
        await this.triggerAutoplay(player);
        return player.currentTrack;
      }
      return null;
    }

    await player.play();
    return player.currentTrack;
  }

  /**
   * Pause playback
   */
  async pause(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    player.pause(true);
    await this.updatePlayerMessage(player);
    return true;
  }

  /**
   * Resume playback
   */
  async resume(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    player.pause(false);
    await this.updatePlayerMessage(player);
    return true;
  }

  /**
   * Skip current track
   */
  async skip(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    await player.skip();
    return true;
  }

  /**
   * Play previous track
   */
  async previous(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');

    const prevTrack = player.getPrevious(true);
    if (!prevTrack) {
      throw new Error('No previous track found in history.');
    }

    if (player.currentTrack) {
      player.queue.unshift(player.currentTrack);
    }

    await player.play(prevTrack);
    return true;
  }

  /**
   * Stop and clear player
   */
  async stop(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return;

    player.queue.clear();

    if (player.shoukaku) {
      await player.shoukaku.stopTrack();
    }

    if (!player.is247) {
      await player.destroy();
    }

    // Update player message to idle state
    await this.updatePlayerMessage(player, true);
  }

  /**
   * Seek position
   */
  async seek(guildId, positionMs) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    await player.seek(positionMs);
    await this.updatePlayerMessage(player);
    return true;
  }

  /**
   * Set volume
   */
  async setVolume(guildId, volume) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    const vol = Math.min(150, Math.max(0, volume));
    await player.setVolume(vol);
    await this.updatePlayerMessage(player);
    return vol;
  }

  /**
   * Set loop mode ('off', 'track', 'queue')
   */
  setLoop(guildId, mode) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');

    const cleanMode = (mode || 'off').toLowerCase(); // off, track, queue
    const kMode = cleanMode === 'off' ? 'none' : cleanMode;

    player.setLoop(kMode);
    player.loop = cleanMode;

    return cleanMode;
  }

  /**
   * Toggle autoplay
   */
  setAutoplay(guildId, enabled) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    player.autoplay = Boolean(enabled);
    return player.autoplay;
  }

  /**
   * Apply audio filter preset via Shoukaku DSP filters
   */
  async applyFilter(guildId, filterPreset) {
    const player = this.getPlayer(guildId);
    if (!player || !player.shoukaku) throw new Error('No active player found.');

    player.activeFilters = [];
    const shoukakuPlayer = player.shoukaku;

    switch (filterPreset.toLowerCase()) {
      case 'none':
      case 'reset':
      case 'clear':
        await shoukakuPlayer.clearFilters();
        player.activeFilters = [];
        break;

      case 'bassboost':
        await shoukakuPlayer.setEqualizer([
          { band: 0, gain: 0.35 },
          { band: 1, gain: 0.30 },
          { band: 2, gain: 0.20 },
          { band: 3, gain: 0.10 }
        ]);
        player.activeFilters = ['Bassboost'];
        break;

      case 'nightcore':
        await shoukakuPlayer.setTimescale({ speed: 1.25, pitch: 1.25, rate: 1.0 });
        player.activeFilters = ['Nightcore'];
        break;

      case 'vaporwave':
        await shoukakuPlayer.setTimescale({ speed: 0.85, pitch: 0.80, rate: 1.0 });
        player.activeFilters = ['Vaporwave'];
        break;

      case '8d':
      case 'rotation':
        await shoukakuPlayer.setRotation({ rotationHz: 0.2 });
        player.activeFilters = ['8D'];
        break;

      case 'karaoke':
        await shoukakuPlayer.setKaraoke({
          level: 1.0,
          monoLevel: 1.0,
          filterBand: 220.0,
          filterWidth: 100.0
        });
        player.activeFilters = ['Karaoke'];
        break;

      case 'timescale':
        await shoukakuPlayer.setTimescale({ speed: 1.15, pitch: 1.15, rate: 1.0 });
        player.activeFilters = ['Timescale'];
        break;

      default:
        throw new Error(`Filter preset "${filterPreset}" is not supported.`);
    }

    await this.updatePlayerMessage(player);
    return player.activeFilters;
  }

  /**
   * Autoplay recommendation engine
   */
  async triggerAutoplay(player) {
    const lastTrack = player.currentTrack || player.getPrevious();
    if (!lastTrack) return;

    const query = `${lastTrack.title || lastTrack.info?.title} ${lastTrack.author || lastTrack.info?.author} related`;
    const searchRes = await this.search(query, { username: 'Autoplay' });

    if (searchRes && searchRes.tracks?.length > 0) {
      const candidate = searchRes.tracks.find(t => t.uri !== lastTrack.uri) || searchRes.tracks[0];
      if (candidate) {
        candidate.requester = { username: 'Autoplay' };
        player.queue.add(candidate);
        if (!player.playing && !player.paused) {
          await player.play();
        }
      }
    }
  }

  /**
   * Updates or sends the persistent player UI message
   */
  async updatePlayerMessage(player, isIdle = false) {
    if (!this.client || !player) return;

    const guildId = player.guildId;
    const guildData = guildRepo.get(guildId) || {};
    const targetChannelId = guildData.player_channel_id || player.textId || player.textChannelId;
    if (!targetChannelId) return;

    const channel = this.client.channels.cache.get(targetChannelId);
    if (!channel || !channel.isTextBased()) return;

    try {
      const payload = isIdle ? uiTemplates.buildEmptyPlayerView() : await uiTemplates.buildPlayerView(player);

      let msgId = this.playerMessages.get(guildId) || guildData.player_message_id;
      let existingMsg = null;

      if (msgId) {
        try {
          existingMsg = await channel.messages.fetch(msgId);
        } catch (e) {
          existingMsg = null;
        }
      }

      if (existingMsg && existingMsg.editable) {
        await existingMsg.edit(payload);
      } else {
        const newMsg = await channel.send(payload);
        this.playerMessages.set(guildId, newMsg.id);
        guildRepo.update(guildId, { player_message_id: newMsg.id });
      }
    } catch (err) {
      console.error(`[MusicManager] Failed to update player message in guild ${guildId}:`, err?.message || err);
    }
  }

  /**
   * Restore 24/7 players on startup
   */
  async restore247Players() {
    const list = persistentRepo.list247();
    for (const record of list) {
      if (record.voice_channel_id && record.guild_id) {
        try {
          const player = await this.createPlayer(record.guild_id, record.voice_channel_id, record.text_channel_id);
          this.patchPlayer(player);
          console.log(`[MusicManager] Restored 24/7 player in guild ${record.guild_id}`);
        } catch (err) {
          console.error(`[MusicManager] Failed to restore 24/7 player in guild ${record.guild_id}:`, err);
        }
      }
    }
  }
}

module.exports = new MusicManager();
