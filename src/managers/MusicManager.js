const { YuKumo, DiscordJSAdapter, EVENT_TYPES } = require('yukumo');
const config = require('../config');
const guildRepo = require('../database/repositories/GuildRepository');
const userRepo = require('../database/repositories/UserRepository');
const statsRepo = require('../database/repositories/StatsRepository');
const persistentRepo = require('../database/repositories/PersistentPlayerRepository');
const uiTemplates = require('../ui/templates');
const cacheManager = require('./CacheManager');

class MusicManager {
  constructor() {
    this.kumo = null;
    this.adapter = null;
    this.client = null;
    this.playerMessages = new Map(); // guildId -> messageId
    this.maintenance = false;
  }

  /**
   * Initialize YuKumo and attach Discord adapter
   */
  init(client) {
    this.client = client;

    this.kumo = new YuKumo({
      nodes: config.lavalink.nodes,
      defaultSearchSource: config.lavalink.defaultSearchEngine || 'ytsearch',
      userId: client.user?.id,
      playerDefaults: {
        autoplay: false,
        minAutoPlayMs: 10000,
        queueEmptyDestroyMs: 120000
      }
    });

    this.adapter = new DiscordJSAdapter(client, this.kumo);
    this.registerEvents();
  }

  registerEvents() {
    if (!this.kumo) return;

    // YuKumo Node Events
    for (const node of this.kumo.nodes.values()) {
      node.ws.eventDispatcher.on('nodeReady', () => {
        console.log(`[YuKumo] Lavalink Node "${node.name}" connected and ready.`);
      });

      node.ws.eventDispatcher.on('nodeReconnected', () => {
        console.log(`[YuKumo] Lavalink Node "${node.name}" reconnected.`);
      });

      node.ws.eventDispatcher.on('nodeDisconnect', (_nodeId, reason) => {
        console.warn(`[YuKumo] Lavalink Node "${node.name}" disconnected. Reason:`, reason);
      });

      node.ws.eventDispatcher.on('nodeError', (_nodeId, error) => {
        console.error(`[YuKumo] Lavalink Node "${node.name}" error:`, error?.message || error);
      });
    }

    // Track Start Event
    this.kumo.events.on(EVENT_TYPES.TRACK_START, async (event) => {
      const { player, track } = event;
      if (!player || !track) return;

      const guildId = player.guildId;
      const requesterId = track.requester?.id || track.requesterId;

      // Track statistics & history
      if (requesterId) {
        userRepo.addHistory(requesterId, guildId, {
          title: track.title || track.info?.title,
          author: track.author || track.info?.author,
          uri: track.uri || track.info?.uri,
          duration: track.duration || track.info?.duration || track.length
        });

        statsRepo.recordPlay(guildId, requesterId, track.duration || track.info?.duration || 0);
      }

      // Update persistent player UI
      await this.updatePlayerMessage(player);
    });

    // Track End Event
    this.kumo.events.on(EVENT_TYPES.TRACK_END, async (event) => {
      const { player, reason } = event;
      if (!player) return;

      // Autoplay handler when queue becomes empty
      if (player.autoplay && player.queue.isEmpty()) {
        try {
          await this.triggerAutoplay(player);
        } catch (err) {
          console.error('[MusicManager] Autoplay error:', err);
        }
      }
    });

    // Track Exception / Error Event
    this.kumo.events.on(EVENT_TYPES.TRACK_EXCEPTION, async (event) => {
      const { player, error } = event;
      console.error(`[YuKumo] Track exception in guild ${player?.guildId}:`, error);
    });
  }

  /**
   * Get existing player or null
   */
  getPlayer(guildId) {
    if (!this.kumo) return null;
    return this.kumo.players.get(guildId) || null;
  }

  /**
   * Get or create player for guild
   */
  createPlayer(guildId, voiceChannelId, textChannelId) {
    if (!this.kumo) throw new Error('YuKumo music engine not initialized.');

    let player = this.kumo.players.get(guildId);
    if (player) {
      if (voiceChannelId && player.voiceChannelId !== voiceChannelId) {
        player.setVoice(voiceChannelId);
      }
      if (textChannelId) {
        player.textChannelId = textChannelId;
      }
      return player;
    }

    const guildData = guildRepo.get(guildId);
    const is247 = Boolean(guildData.mode_247);
    const defVol = guildData.default_volume || 80;
    const defLoop = guildData.loop_mode || 'off';
    const autoplay = Boolean(guildData.autoplay);

    player = this.kumo.players.create({
      guildId,
      voiceChannelId,
      textChannelId,
      volume: defVol
    });

    player.activeFilters = [];
    player.autoplay = autoplay;
    player.is247 = is247;
    player.loop = defLoop;

    if (is247 && typeof player.setStayInVc === 'function') {
      player.setStayInVc(true);
    }

    return player;
  }

  /**
   * Search for tracks using YuKumo
   */
  async search(query, requester = null) {
    if (!this.kumo) throw new Error('Music engine is not ready.');

    const cached = cacheManager.getTrackInfo(query);
    if (cached) return cached;

    const result = await this.kumo.search({
      query,
      requester
    });
    if (result && result.tracks && result.tracks.length > 0) {
      cacheManager.setTrackInfo(query, result);
    }
    return result;
  }

  /**
   * Connect and start playing or add to queue
   */
  async play(guildId, voiceChannelId, textChannelId, trackOrPlaylist, requester) {
    const player = this.createPlayer(guildId, voiceChannelId, textChannelId);

    if (requester) {
      if (Array.isArray(trackOrPlaylist)) {
        trackOrPlaylist.forEach(t => { t.requester = requester; });
      } else if (trackOrPlaylist) {
        trackOrPlaylist.requester = requester;
      }
    }

    if (Array.isArray(trackOrPlaylist)) {
      for (const t of trackOrPlaylist) {
        player.queue.enqueue(t);
      }
    } else if (trackOrPlaylist) {
      player.queue.enqueue(trackOrPlaylist);
    }

    if (!player.connected) {
      await player.setVoice(voiceChannelId);
    }

    if (!player.currentTrack && !player.paused) {
      const nextTrack = player.queue.dequeue();
      if (nextTrack) {
        await player.play(nextTrack);
      }
    }

    return player;
  }

  /**
   * Play next track from queue
   */
  async playNext(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return null;

    if (player.queue.isEmpty()) {
      if (player.autoplay) {
        await this.triggerAutoplay(player);
        return player.currentTrack;
      }
      return null;
    }

    const nextTrack = player.queue.dequeue();
    if (nextTrack) {
      await player.play(nextTrack);
    }
    return nextTrack;
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
    if (typeof player.playPrevious === 'function') {
      await player.playPrevious();
    } else if (player.queue?.historyList?.length > 0) {
      const prevTrack = player.queue.historyList.pop();
      if (prevTrack) {
        if (player.currentTrack) {
          player.queue.tracksList.unshift(player.currentTrack);
        }
        await player.play(prevTrack);
      }
    } else {
      throw new Error('No previous track found in history.');
    }
    return true;
  }

  /**
   * Stop and destroy player
   */
  async stop(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return;

    if (player.queue) {
      player.queue.clear();
    }

    await player.stop();

    if (!player.is247) {
      this.kumo.players.destroy(guildId);
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
   * Set loop mode
   */
  setLoop(guildId, mode) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');

    const cleanMode = mode.toLowerCase(); // off, track, queue
    player.loop = cleanMode;

    if (cleanMode === 'track') {
      player.queue.setRepeatMode?.('track');
    } else if (cleanMode === 'queue') {
      player.queue.setRepeatMode?.('queue');
    } else {
      player.queue.setRepeatMode?.('off');
    }

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
   * Apply audio filter preset
   */
  async applyFilter(guildId, filterPreset) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active player found.');

    player.activeFilters = [];

    switch (filterPreset.toLowerCase()) {
      case 'none':
      case 'reset':
      case 'clear':
        if (typeof player.clearFilters === 'function') {
          await player.clearFilters();
        }
        player.activeFilters = [];
        break;

      case 'bassboost':
        if (typeof player.setBassboost === 'function') {
          await player.setBassboost(true);
        }
        player.activeFilters = ['Bassboost'];
        break;

      case 'nightcore':
        if (typeof player.setNightcore === 'function') {
          await player.setNightcore(true);
        }
        player.activeFilters = ['Nightcore'];
        break;

      case 'vaporwave':
        if (typeof player.setVaporwave === 'function') {
          await player.setVaporwave(true);
        }
        player.activeFilters = ['Vaporwave'];
        break;

      case '8d':
      case 'rotation':
        if (typeof player.setRotation === 'function') {
          await player.setRotation({ rotationHz: 0.2 });
        }
        player.activeFilters = ['8D'];
        break;

      case 'karaoke':
        if (typeof player.setKaraoke === 'function') {
          await player.setKaraoke({ level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 });
        }
        player.activeFilters = ['Karaoke'];
        break;

      case 'timescale':
        if (typeof player.setTimescale === 'function') {
          await player.setTimescale({ speed: 1.15, pitch: 1.15, rate: 1.0 });
        }
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
    const lastTrack = player.currentTrack || player.queue?.historyList?.slice(-1)[0];
    if (!lastTrack) return;

    const query = `${lastTrack.title || lastTrack.info?.title} ${lastTrack.author || lastTrack.info?.author} related`;
    const searchRes = await this.search(query, { username: 'Autoplay Engine' });

    if (searchRes && searchRes.tracks?.length > 0) {
      // Pick first track that isn't the same URI
      const candidate = searchRes.tracks.find(t => t.uri !== lastTrack.uri) || searchRes.tracks[0];
      if (candidate) {
        candidate.requester = { username: 'Autoplay' };
        await player.play(candidate);
      }
    }
  }

  /**
   * Updates or sends the persistent player UI message
   */
  async updatePlayerMessage(player, isIdle = false) {
    if (!this.client || !player) return;

    const guildId = player.guildId;
    const guildData = guildRepo.get(guildId);
    const targetChannelId = guildData.player_channel_id || player.textChannelId;
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
          const player = this.createPlayer(record.guild_id, record.voice_channel_id, record.text_channel_id);
          await player.setVoice(record.voice_channel_id);
          console.log(`[MusicManager] Restored 24/7 player in guild ${record.guild_id}`);
        } catch (err) {
          console.error(`[MusicManager] Failed to restore 24/7 player in guild ${record.guild_id}:`, err);
        }
      }
    }
  }
}

module.exports = new MusicManager();
