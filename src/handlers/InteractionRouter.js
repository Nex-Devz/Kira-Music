const musicManager = require('../managers/MusicManager');
const permissionManager = require('../managers/PermissionManager');
const premiumManager = require('../managers/PremiumManager');
const userRepo = require('../database/repositories/UserRepository');
const playlistRepo = require('../database/repositories/PlaylistRepository');
const guildRepo = require('../database/repositories/GuildRepository');
const uiTemplates = require('../ui/templates');
const errorHandler = require('./ErrorHandler');

class InteractionRouter {
  /**
   * Route button, select menu, and modal interactions
   */
  async handle(interaction) {
    try {
      if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.handleStringSelect(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModalSubmit(interaction);
      }
    } catch (err) {
      await errorHandler.handleInteractionError(err, interaction);
    }
  }

  // --- BUTTON ROUTER ---
  async handleButton(interaction) {
    const customId = interaction.customId;
    const [namespace, action, param1, param2] = customId.split(':');
    const guildId = interaction.guildId;
    const player = musicManager.getPlayer(guildId);

    // Playback Controls Check
    const playbackActions = ['pause', 'resume', 'skip', 'previous', 'stop', 'vol', 'seek', 'loop', 'autoplay', 'shuffle'];
    if (namespace === 'player' && playbackActions.includes(action)) {
      if (!permissionManager.canControlPlayback(interaction.member, player)) {
        return interaction.reply(uiTemplates.buildErrorMessage('You do not have permission to control playback.'));
      }
    }

    switch (namespace) {
      case 'player':
        await this.handlePlayerButtons(interaction, action, param1, param2, player);
        break;

      case 'queue':
        await this.handleQueueButtons(interaction, action, param1, player);
        break;

      case 'lyrics':
        await this.handleLyricsButtons(interaction, action, param1, player);
        break;

      case 'playlist':
        await this.handlePlaylistButtons(interaction, action, param1);
        break;

      case 'setup':
        await this.handleSetupButtons(interaction, action, param1);
        break;

      case 'search':
        if (action === 'cancel') {
          await interaction.update(uiTemplates.buildSuccessMessage('Search cancelled.'));
        }
        break;

      case 'premium':
        if (action === 'perks') {
          const tier = premiumManager.getTier(interaction.user.id, guildId);
          await interaction.reply({
            ...uiTemplates.buildPremiumDashboard(tier, premiumManager.getEntitlement(interaction.user.id), premiumManager.getEntitlement(guildId)),
            ephemeral: true
          });
        }
        break;

      default:
        await interaction.reply(uiTemplates.buildErrorMessage('Unknown button action.'));
        break;
    }
  }

  // --- PLAYER BUTTONS ---
  async handlePlayerButtons(interaction, action, param1, param2, player) {
    const guildId = interaction.guildId;

    if (!player && action !== 'help' && action !== 'favorites') {
      return interaction.reply(uiTemplates.buildErrorMessage('No active music player in this server.'));
    }

    switch (action) {
      case 'pause':
        await musicManager.pause(guildId);
        await interaction.deferUpdate();
        break;

      case 'resume':
        await musicManager.resume(guildId);
        await interaction.deferUpdate();
        break;

      case 'skip':
        await musicManager.skip(guildId);
        await interaction.deferUpdate();
        break;

      case 'previous':
        await musicManager.previous(guildId);
        await interaction.deferUpdate();
        break;

      case 'stop':
        await musicManager.stop(guildId);
        await interaction.update(uiTemplates.buildEmptyPlayerView());
        break;

      case 'queue':
        await interaction.reply({
          ...uiTemplates.buildQueueView(player, 1),
          ephemeral: true
        });
        break;

      case 'lyrics':
        const curTrack = player?.currentTrack;
        if (!curTrack) {
          return interaction.reply(uiTemplates.buildErrorMessage('No track currently playing.'));
        }
        const lyricsText = `Lyrics for ${curTrack.title || 'Unknown'}\n\n(Synced lyrics stream is ready.)`;
        await interaction.reply({
          ...uiTemplates.buildLyricsView(curTrack.title || 'Current Song', curTrack.author || 'Artist', lyricsText, 1),
          ephemeral: true
        });
        break;

      case 'favorite':
        if (!player?.currentTrack) {
          return interaction.reply(uiTemplates.buildErrorMessage('No track currently playing.'));
        }
        userRepo.addFavorite(interaction.user.id, {
          title: player.currentTrack.title || player.currentTrack.info?.title,
          author: player.currentTrack.author || player.currentTrack.info?.author,
          uri: player.currentTrack.uri || player.currentTrack.info?.uri,
          duration: player.currentTrack.duration || player.currentTrack.info?.duration
        });
        await interaction.reply({
          ...uiTemplates.buildSuccessMessage(`Added **${player.currentTrack.title}** to your favorites!`),
          ephemeral: true
        });
        break;

      case 'more':
        await interaction.reply(uiTemplates.buildMoreControlsView(player));
        break;

      case 'refresh':
        const refreshed = await uiTemplates.buildPlayerView(player);
        await interaction.update(refreshed);
        break;

      case 'shuffle':
        player.queue.shuffle();
        await interaction.reply({ ...uiTemplates.buildSuccessMessage('Shuffled the queue.'), ephemeral: true });
        break;

      case 'loop':
        const mode = musicManager.setLoop(guildId, param1 || 'off');
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;

      case 'autoplay':
        const apState = musicManager.setAutoplay(guildId, param1 === 'true');
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;

      case 'vol':
        const currentVol = player.volume || 80;
        const newVol = param1 === 'up' ? Math.min(150, currentVol + 10) : Math.max(0, currentVol - 10);
        await musicManager.setVolume(guildId, newVol);
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;

      case 'seek':
        const curPos = player.position || 0;
        const delta = param1 === 'fwd' ? 10000 : -10000;
        const targetPos = Math.max(0, curPos + delta);
        await musicManager.seek(guildId, targetPos);
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;

      case '247':
        const can247 = premiumManager.canUse247(guildId, interaction.user.id);
        if (!can247) {
          return interaction.reply({
            ...uiTemplates.buildErrorMessage('24/7 Mode requires a Gold or Diamond Premium tier. Use `/premium` to upgrade.'),
            ephemeral: true
          });
        }
        player.is247 = !player.is247;
        guildRepo.update(guildId, { mode_247: player.is247 ? 1 : 0 });
        await interaction.reply({
          ...uiTemplates.buildSuccessMessage(`24/7 Mode is now **${player.is247 ? 'Enabled' : 'Disabled'}**.`),
          ephemeral: true
        });
        break;

      case 'favorites':
        const favs = userRepo.getFavorites(interaction.user.id);
        if (favs.length === 0) {
          return interaction.reply({
            ...uiTemplates.buildErrorMessage('You have no favorited songs. Play a song and click "Favorite" to add one!'),
            ephemeral: true
          });
        }
        const favList = favs.slice(0, 10).map((f, i) => `\`${i + 1}.\` **${f.title}** - ${f.author}`).join('\n');
        await interaction.reply({
          ...uiTemplates.buildSuccessMessage(`### Your Favorites\n${favList}`),
          ephemeral: true
        });
        break;

      case 'help':
        await interaction.reply({
          ...uiTemplates.buildHelpMenu('music', permissionManager.isDeveloper(interaction.user.id)),
          ephemeral: true
        });
        break;

      default:
        await interaction.deferUpdate();
        break;
    }
  }

  // --- QUEUE BUTTONS ---
  async handleQueueButtons(interaction, action, param1, player) {
    if (!player) {
      return interaction.reply(uiTemplates.buildErrorMessage('No active music player in this server.'));
    }

    if (action === 'page') {
      const page = parseInt(param1, 10) || 1;
      await interaction.update(uiTemplates.buildQueueView(player, page));
    } else if (action === 'clear') {
      player.queue.clear();
      await interaction.update(uiTemplates.buildQueueView(player, 1));
    }
  }

  // --- LYRICS BUTTONS ---
  async handleLyricsButtons(interaction, action, param1, player) {
    const curTrack = player?.currentTrack;
    const page = parseInt(param1, 10) || 1;
    const title = curTrack?.title || 'Current Song';
    const author = curTrack?.author || 'Artist';
    const lyrics = `Lyrics for ${title}\n\n(Page ${page})`;
    await interaction.update(uiTemplates.buildLyricsView(title, author, lyrics, page));
  }

  // --- PLAYLIST BUTTONS ---
  async handlePlaylistButtons(interaction, action, param1) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (action === 'list') {
      const playlists = playlistRepo.getUserPlaylists(userId);
      await interaction.update(uiTemplates.buildPlaylistListView(playlists));
    } else if (action === 'play') {
      const playlist = playlistRepo.get(param1);
      if (!playlist || playlist.tracks.length === 0) {
        return interaction.reply(uiTemplates.buildErrorMessage('Playlist is empty or does not exist.'));
      }
      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply(uiTemplates.buildErrorMessage('You must be in a voice channel to play this playlist.'));
      }
      await musicManager.play(guildId, voiceChannel.id, interaction.channelId, playlist.tracks, interaction.user);
      await interaction.reply(uiTemplates.buildSuccessMessage(`Loaded **${playlist.tracks.length} tracks** from playlist **${playlist.name}** into the queue.`));
    } else if (action === 'delete') {
      playlistRepo.delete(param1, userId);
      const playlists = playlistRepo.getUserPlaylists(userId);
      await interaction.update(uiTemplates.buildPlaylistListView(playlists));
    }
  }

  // --- SETUP BUTTONS ---
  async handleSetupButtons(interaction, action, param1) {
    const guildId = interaction.guildId;
    if (!permissionManager.isAdmin(interaction.member)) {
      return interaction.reply(uiTemplates.buildErrorMessage('Only administrators can configure setup.'));
    }

    if (action === 'channel') {
      if (param1 === 'current') {
        guildRepo.update(guildId, { music_channel_id: interaction.channelId, player_channel_id: interaction.channelId });
      } else {
        guildRepo.update(guildId, { music_channel_id: null, player_channel_id: null });
      }
      await interaction.update(uiTemplates.buildSetupWizard(2));
    } else if (action === 'dj') {
      if (param1 === 'create') {
        try {
          const role = await interaction.guild.roles.create({
            name: 'DJ',
            color: 0x5865f2,
            reason: 'Kira Music Bot DJ Role'
          });
          guildRepo.update(guildId, { dj_role_id: role.id });
        } catch (e) {}
      } else {
        guildRepo.update(guildId, { dj_role_id: null });
      }
      await interaction.update(uiTemplates.buildSetupWizard(3));
    }
  }

  // --- STRING SELECT ROUTER ---
  async handleStringSelect(interaction) {
    const customId = interaction.customId;
    const selectedValue = interaction.values[0];
    const guildId = interaction.guildId;
    const player = musicManager.getPlayer(guildId);

    if (customId === 'filter:select') {
      if (!player) return interaction.reply(uiTemplates.buildErrorMessage('No active player.'));
      const canFilter = premiumManager.canUseFilter(selectedValue, guildId, interaction.user.id);
      if (!canFilter && selectedValue !== 'none') {
        return interaction.reply({
          ...uiTemplates.buildErrorMessage(`The **${selectedValue}** audio filter requires an upgraded Premium tier. Use \`/premium\` to view plans.`),
          ephemeral: true
        });
      }
      await musicManager.applyFilter(guildId, selectedValue);
      await interaction.update(uiTemplates.buildMoreControlsView(player));
    } else if (customId === 'search:select') {
      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) return interaction.reply(uiTemplates.buildErrorMessage('You must be in a voice channel.'));

      // Retrieve cached search results
      const index = parseInt(selectedValue, 10);
      const searchRes = cacheManager.getTrackInfo('last_search:' + interaction.user.id);
      const selectedTrack = searchRes?.tracks?.[index];

      if (!selectedTrack) {
        return interaction.reply(uiTemplates.buildErrorMessage('Search session expired. Please run `/search` again.'));
      }

      await musicManager.play(guildId, voiceChannel.id, interaction.channelId, selectedTrack, interaction.user);
      await interaction.update(uiTemplates.buildSuccessMessage(`Queued **${selectedTrack.title}**`));
    } else if (customId === 'playlist:select') {
      const playlist = playlistRepo.get(selectedValue);
      if (!playlist) return interaction.reply(uiTemplates.buildErrorMessage('Playlist not found.'));
      await interaction.update(uiTemplates.buildPlaylistDetailsView(playlist));
    } else if (customId === 'help:category') {
      const isDev = permissionManager.isDeveloper(interaction.user.id);
      await interaction.update(uiTemplates.buildHelpMenu(selectedValue, isDev));
    } else if (customId === 'settings:category') {
      await interaction.reply({
        ...uiTemplates.buildSuccessMessage(`To change **${selectedValue}**, use \`/settings\` subcommands or \`/${selectedValue}\`.`),
        ephemeral: true
      });
    }
  }

  // --- MODAL SUBMIT ROUTER ---
  async handleModalSubmit(interaction) {
    await interaction.reply({ ...uiTemplates.buildSuccessMessage('Submitted successfully.'), ephemeral: true });
  }
}

module.exports = new InteractionRouter();
