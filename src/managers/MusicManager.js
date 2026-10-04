const { YuKumo, DiscordJSAdapter, LOAD_RESULT_TYPE, LoopMode } = require('yukumo');
const config = require('../config');
const guildRepo = require('../database/repositories/GuildRepository');
const userRepo = require('../database/repositories/UserRepository');
const statsRepo = require('../database/repositories/StatsRepository');
const persistentRepo = require('../database/repositories/PersistentPlayerRepository');
const uiTemplates = require('../ui/templates');
const cacheManager = require('./CacheManager');
const logger = require('../utils/logger');

class MusicManager {
  constructor() {
    this.kumo = null;
    this.client = null;
    this.adapter = null;
    this.playerMessages = new Map(); // guildId -> messageId
    this.maintenance = false;
  }

  /**
   * Backward compatibility getter for kazagumo / yukumo
   */
  get kazagumo() {
    return this.kumo;
  }

  get yukumo() {
    return this.kumo;
  }

  /**
   * Initialize YuKumo and attach DiscordJSAdapter
   */
  async init(client) {
    if (this.kumo) return;
    this.client = client;

    const nodes = (config.lavalink.nodes || []).map(n => ({
      name: n.name || 'Default-Node',
      host: n.host,
      port: Number(n.port),
      password: n.password,
      secure: Boolean(n.secure)
    }));

    const defaultSearch = config.lavalink.defaultSearchEngine === 'youtube' ? 'ytsearch' : 'spsearch';

    const sendGatewayPayload = (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild?.shard) {
        guild.shard.send(payload);
        return;
      }
      if (client.ws?.shards) {
        const shard = client.ws.shards.first?.() || client.ws.shards.get(0);
        if (shard) shard.send(payload);
      }
    };

    this.kumo = new YuKumo({
      userId: client.user?.id || config.client.clientId || '',
      send: sendGatewayPayload,
      nodes,
      defaultSearchSource: defaultSearch,
      onDisconnect: {
        destroyPlayer: false, // Managed by Kira-Music so 24/7 stays connected
        autoReconnect: true
      },
      playerDefaults: {
        maxErrorsPerTime: { threshold: 35000, maxAmount: 3 },
        minAutoPlayMs: 10000,
        queueEmptyDestroyMs: 0,
        autoplay: false
      },
      resuming: {
        enabled: true,
        timeout: 60,
        persistPlayers: true
      }
    });

    this.kumo.sendGatewayPayload = sendGatewayPayload;
    if (client.user?.id) {
      this.kumo.setUserId(client.user.id);
    }

    // Attach Discord.js gateway adapter
    this.adapter = new DiscordJSAdapter(client, this.kumo);

    this.registerEvents();

    try {
      await this.kumo.init();
    } catch (err) {
      logger.error('YuKumo initialization error:', err);
    }
  }

  /**
   * Register YuKumo Node and Player lifecycle events
   */
  registerEvents() {
    if (!this.kumo) return;

    // Node Lifecycle Events
    this.kumo.on('nodeReady', (nodeId) => {
      logger.ready(`Lavalink "${nodeId}" connected.`);
    });

    this.kumo.on('nodeDisconnected', (nodeId, code, reason) => {
      logger.warn(`Lavalink "${nodeId}" disconnected (${code}): ${reason}`);
    });

    this.kumo.on('nodeReconnected', (nodeId) => {
      logger.ready(`Lavalink "${nodeId}" connected.`);
    });

    this.kumo.on('nodeError', (nodeId, error) => {
      logger.error(`Lavalink "${nodeId}" error:`, error);
    });

    // Player Lifecycle Events
    this.kumo.on('playerCreate', (guildId) => {
      const guild = this.client?.guilds.cache.get(guildId);
      const name = guild?.name || 'Unknown Server';
      logger.log(`Player Create in ${name} [ ${guildId} ]`);
    });

    // Player: Track Start Event
    this.kumo.on('trackStart', async (guildId, track) => {
      if (!guildId || !track) return;
      const player = this.getPlayer(guildId);
      if (!player) return;

      const requesterId = track.requester?.id || track.requesterId;

      // Track statistics & history
      if (requesterId) {
        userRepo.addHistory(requesterId, guildId, {
          title: track.title || track.info?.title,
          author: track.author || track.info?.author,
          uri: track.uri || track.info?.uri,
          duration: track.duration || track.length || track.info?.length || 0
        });

        statsRepo.recordPlay(guildId, requesterId, track.duration || track.length || track.info?.length || 0);
      }

      // Update persistent player UI
      await this.updatePlayerMessage(player);
    });

    // Player: Track End Event
    this.kumo.on('trackEnd', async (guildId, track, reason) => {
      const player = this.getPlayer(guildId);
      if (player) {
        this.patchPlayer(player);
      }
    });

    // Player: Queue Empty / End Event
    this.kumo.on('queueEnd', async (guildId) => {
      const player = this.getPlayer(guildId);
      if (!player) return;

      if (player.autoplay) {
        try {
          await this.triggerAutoplay(player);
        } catch (err) {
          console.error('[MusicManager] Autoplay error:', err);
        }
      } else {
        await this.updatePlayerMessage(player, true);
      }
    });

    this.kumo.on('playerEmpty', async (guildId) => {
      const player = this.getPlayer(guildId);
      if (!player) return;

      if (player.autoplay) {
        try {
          await this.triggerAutoplay(player);
        } catch (err) {
          console.error('[MusicManager] Autoplay error on playerEmpty:', err);
        }
      } else {
        await this.updatePlayerMessage(player, true);
      }
    });

    // Player: Track Exception Event
    this.kumo.on('trackException', async (guildId, track, exception) => {
      console.error(`[YuKumo] Track exception in guild ${guildId}:`, exception);
    });

    // Player: Track Stuck Event
    this.kumo.on('trackStuck', async (guildId, track, thresholdMs) => {
      console.warn(`[YuKumo] Track stuck in guild ${guildId} (${thresholdMs}ms), skipping...`);
      try {
        await this.skip(guildId);
      } catch (e) {
        // Ignore
      }
    });

    // Player: Destroy Event
    this.kumo.on('playerDestroy', async (guildId, reason) => {
      const guild = this.client?.guilds.cache.get(guildId);
      const name = guild?.name || 'Unknown Server';
      logger.log(`Player Destroy in ${name} [ ${guildId} ]`);
      const msgId = this.playerMessages.get(guildId);
      if (msgId) {
        this.playerMessages.delete(guildId);
      }
    });

    // Autoplay Track Added Event
    this.kumo.on('autoplayTrackAdded', async (guildId, track) => {
      const player = this.getPlayer(guildId);
      if (player) {
        await this.updatePlayerMessage(player);
      }
    });
  }

  /**
   * Helper to ensure player compatibility aliases across all commands & UI
   */
  patchPlayer(player) {
    if (!player) return player;

    if (!player.activeFilters) player.activeFilters = [];
    if (player.autoplay === undefined) player.autoplay = false;
    if (player.is247 === undefined) player.is247 = false;
    if (player.loop === undefined) player.loop = 'off';

    // Playing state getter
    if (!Object.getOwnPropertyDescriptor(player, 'playing')) {
      Object.defineProperty(player, 'playing', {
        get() {
          return this.status === 'playing';
        },
        configurable: true
      });
    }

    // Voice channel ID compatibility (voiceId <-> voiceChannelId)
    if (!Object.getOwnPropertyDescriptor(player, 'voiceId')) {
      Object.defineProperty(player, 'voiceId', {
        get() {
          return this.voiceChannelId;
        },
        set(val) {
          this._voiceChannelId = val;
        },
        configurable: true
      });
    }

    // Text channel ID compatibility (textId <-> textChannelId)
    if (!Object.getOwnPropertyDescriptor(player, 'textId')) {
      Object.defineProperty(player, 'textId', {
        get() {
          return this.textChannelId;
        },
        set(val) {
          this._textChannelId = val;
        },
        configurable: true
      });
    }

    if (typeof player.setTextChannel !== 'function') {
      player.setTextChannel = (channelId) => {
        player._textChannelId = channelId;
      };
    }

    const origSetVoice = typeof player.setVoice === 'function' ? player.setVoice.bind(player) : null;
    player.setVoice = function (voiceIdOrOptions) {
      if (typeof voiceIdOrOptions === 'string') {
        return this.setVoiceChannel(voiceIdOrOptions);
      }
      return origSetVoice ? origSetVoice(voiceIdOrOptions) : this.setVoiceChannel(voiceIdOrOptions?.voiceId);
    };

    // Previous track helper
    if (typeof player.getPrevious !== 'function') {
      player.getPrevious = (consume = false) => {
        if (!player.queue || !player.queue.history) return null;
        if (consume) {
          return player.queue.history.pop() || null;
        }
        return player.queue.history[player.queue.history.length - 1] || null;
      };
    }

    // Shoukaku backwards-compatibility bridge for filters & legacy calls
    if (!player.shoukaku) {
      player.shoukaku = {
        stopTrack: async () => player.stop(),
        clearFilters: async () => player.clearFilters(),
        setEqualizer: async (bands) => player.setEqualizer(bands),
        setTimescale: async (settings) => player.setTimescale(settings),
        setRotation: async (settings) => player.setRotation(settings),
        setKaraoke: async (settings) => player.setKaraoke(settings)
      };
    }

    // Queue methods patch to safely handle arrays in enqueue/add and tracksList access
    if (player.queue) {
      // Patch enqueue to handle array of tracks
      if (!player.queue._originalEnqueue) {
        player.queue._originalEnqueue = player.queue.enqueue.bind(player.queue);
        player.queue.enqueue = function (tracks, index) {
          if (Array.isArray(tracks)) {
            for (const t of tracks) {
              this._originalEnqueue(t);
            }
            return this;
          }
          return this._originalEnqueue(tracks, index);
        };
      }

      // Patch add to handle array of tracks
      if (!player.queue._originalAdd) {
        player.queue._originalAdd = player.queue.add.bind(player.queue);
        player.queue.add = function (tracks, index) {
          if (Array.isArray(tracks)) {
            for (const t of tracks) {
              this.enqueue(t);
            }
            return this;
          }
          return this.enqueue(tracks, index);
        };
      }

      if (typeof player.queue.dequeue !== 'function') {
        player.queue.dequeue = () => player.queue.next();
      }

      if (typeof player.queue.isEmpty !== 'function') {
        const q = player.queue;
        const checkEmpty = () => q.tracks.length === 0 && !q.currentTrack;
        Object.defineProperty(q, 'isEmpty', {
          get() {
            const fn = () => checkEmpty();
            fn[Symbol.toPrimitive] = () => checkEmpty();
            fn.valueOf = () => checkEmpty();
            return fn;
          },
          configurable: true
        });
      }
    }

    return player;
  }

  /**
   * Get existing player or null
   */
  getPlayer(guildId) {
    if (!this.kumo) return null;
    const player = this.kumo.getPlayer(guildId) || null;
    if (player) this.patchPlayer(player);
    return player;
  }

  /**
   * Get or create player for guild
   */
  async createPlayer(guildId, voiceChannelId, textChannelId) {
    if (!this.kumo) throw new Error('YuKumo music engine not initialized.');

    if (this.client?.user?.id && !this.kumo.userId) {
      this.kumo.setUserId(this.client.user.id);
    }

    let player = this.kumo.getPlayer(guildId);
    if (player) {
      this.patchPlayer(player);
      if (voiceChannelId && player.voiceChannelId !== voiceChannelId) {
        await player.setVoiceChannel(voiceChannelId);
      } else if (!player.hasVoiceCredentials && voiceChannelId) {
        player.connect();
      }
      if (textChannelId && player.textChannelId !== textChannelId) {
        player.setTextChannel(textChannelId);
      }
      return player;
    }

    const guildData = guildRepo.get(guildId) || {};
    const is247 = Boolean(guildData.mode_247);
    const defVol = guildData.default_volume || 80;
    const defLoop = guildData.loop_mode || 'off';
    const autoplay = Boolean(guildData.autoplay);

    player = await this.kumo.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true
    });

    this.patchPlayer(player);

    player.activeFilters = [];
    player.autoplay = autoplay;
    player.is247 = is247;
    player.loop = defLoop;

    if (typeof player.setStayInVc === 'function') {
      player.setStayInVc(is247);
    }

    if (defVol !== 100) {
      await player.setVolume(defVol);
    }

    if (defLoop !== 'off') {
      const mode = defLoop === 'off' ? LoopMode.NONE : (defLoop === 'track' ? LoopMode.TRACK : LoopMode.QUEUE);
      player.setLoop(mode);
    }

    return player;
  }

  /**
   * Get an available Lavalink node
   */
  getNode() {
    if (!this.kumo?.nodes) return null;
    const connected = this.kumo.nodes.getConnected();
    if (connected && connected.length > 0) return connected[0];
    const all = this.kumo.nodes.getAll();
    return all && all.length > 0 ? all[0] : null;
  }

  /**
   * Standardize search results for UI & commands
   */
  formatSearchResult(res, requester) {
    if (!res) return { loadType: 'empty', type: 'SEARCH', tracks: [] };
    const loadType = (res.loadType || 'empty').toLowerCase();

    const tracks = (res.tracks || []).map(t => {
      t.duration = t.duration || t.length || t.info?.length || t.info?.duration || 0;
      t.artworkUrl = t.artworkUrl || t.thumbnail || t.info?.artworkUrl || null;
      if (requester) t.requester = requester;
      return t;
    });

    return {
      loadType,
      type: loadType.toUpperCase(),
      tracks,
      playlistInfo: res.playlistInfo || null,
      name: res.playlistInfo?.name || res.name || null,
      exception: res.exception || null
    };
  }

  /**
   * Search for tracks using YuKumo with multi-engine fallback
   */
  async search(query, requester = null) {
    if (!this.kumo) throw new Error('YuKumo music engine is not ready.');

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
        const raw = await this.kumo.search({ query, requester });
        result = this.formatSearchResult(raw, requester);
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
          const raw = await this.kumo.search({ query: `${prefix}${query}`, requester });
          const formatted = this.formatSearchResult(raw, requester);
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
          t.duration = t.duration || t.length || t.info?.length || 0;
        });
      } else if (trackOrPlaylist) {
        trackOrPlaylist.requester = requester;
        trackOrPlaylist.duration = trackOrPlaylist.duration || trackOrPlaylist.length || trackOrPlaylist.info?.length || 0;
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

    if (player.queue.tracks.length === 0 && !player.currentTrack) {
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
    await player.pause();
    await this.updatePlayerMessage(player);
    return true;
  }

  /**
   * Resume playback
   */
  async resume(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    await player.resume();
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
      player.queue.tracks.unshift(player.currentTrack);
    }

    await player.playTrack(prevTrack);
    return true;
  }

  /**
   * Stop and clear player
   */
  async stop(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return;

    player.queue.clear();

    await player.stop();

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

    const cleanMode = (mode || 'off').toLowerCase();
    const modeMap = {
      off: LoopMode.NONE,
      none: LoopMode.NONE,
      track: LoopMode.TRACK,
      queue: LoopMode.QUEUE
    };

    const yMode = modeMap[cleanMode] || LoopMode.NONE;
    player.setLoop(yMode);
    player.loop = cleanMode;

    return cleanMode;
  }

  /**
   * Toggle autoplay
   */
  setAutoplay(guildId, enabled) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');
    const val = Boolean(enabled);
    player.autoplay = val;
    player.setAutoplay(val);
    return val;
  }

  /**
   * Apply audio filter preset via YuKumo DSP filters
   */
  async applyFilter(guildId, filterPreset) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');

    player.activeFilters = [];

    switch (filterPreset.toLowerCase()) {
      case 'none':
      case 'reset':
      case 'clear':
        await player.clearFilters();
        player.activeFilters = [];
        break;

      case 'bassboost':
        await player.setEqualizer([
          { band: 0, gain: 0.35 },
          { band: 1, gain: 0.30 },
          { band: 2, gain: 0.20 },
          { band: 3, gain: 0.10 }
        ]);
        player.activeFilters = ['Bassboost'];
        break;

      case 'nightcore':
        await player.setTimescale({ speed: 1.25, pitch: 1.25, rate: 1.0 });
        player.activeFilters = ['Nightcore'];
        break;

      case 'vaporwave':
        await player.setTimescale({ speed: 0.85, pitch: 0.80, rate: 1.0 });
        player.activeFilters = ['Vaporwave'];
        break;

      case '8d':
      case 'rotation':
        await player.setRotation({ rotationHz: 0.2 });
        player.activeFilters = ['8D'];
        break;

      case 'karaoke':
        await player.setKaraoke({
          level: 1.0,
          monoLevel: 1.0,
          filterBand: 220.0,
          filterWidth: 100.0
        });
        player.activeFilters = ['Karaoke'];
        break;

      case 'timescale':
        await player.setTimescale({ speed: 1.15, pitch: 1.15, rate: 1.0 });
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

    // Check if YuKumo can resolve candidate natively
    if (typeof player.resolveAutoplayTrack === 'function') {
      try {
        const candidate = await player.resolveAutoplayTrack(lastTrack);
        if (candidate) {
          candidate.requester = { username: 'Autoplay' };
          player.queue.add(candidate);
          if (!player.playing && !player.paused) {
            await player.play();
          }
          return;
        }
      } catch (err) {
        // Fall back to title query recommendation
      }
    }

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
    logger.log('Auto Reconnect Collecting player 24/7 data');
    const list = persistentRepo.list247();
    logger.ready(`Auto Reconnect found ${list.length} queue`);
    for (const record of list) {
      if (record.voice_channel_id && record.guild_id) {
        try {
          const player = await this.createPlayer(record.guild_id, record.voice_channel_id, record.text_channel_id);
          this.patchPlayer(player);
        } catch (err) {
          logger.error(`Failed to restore 24/7 player in guild ${record.guild_id}:`, err);
        }
      }
    }
  }
}

module.exports = new MusicManager();
