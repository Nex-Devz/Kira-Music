const musicManager = require('../../managers/MusicManager');
const userRepo = require('../../database/repositories/UserRepository');
const guildRepo = require('../../database/repositories/GuildRepository');
const persistentRepo = require('../../database/repositories/PersistentPlayerRepository');
const premiumManager = require('../../managers/PremiumManager');
const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');
const lyricsUtil = require('../../utils/lyrics');

class PlayerButtonHandler {
  async handle(interaction, action, param1, param2, player) {
    const guildId = interaction.guildId;

    if (!player && action !== 'help' && action !== 'favorites') {
      return interaction.reply(uiTemplates.buildErrorMessage('No active music player in this server.'));
    }

    switch (action) {
      case 'pause':
        await musicManager.pause(guildId);
        await interaction.update(await uiTemplates.buildPlayerView(player));
        break;

      case 'resume':
        await musicManager.resume(guildId);
        await interaction.update(await uiTemplates.buildPlayerView(player));
        break;

      case 'skip':
        await musicManager.skip(guildId);
        await interaction.update(await uiTemplates.buildPlayerView(player));
        break;

      case 'previous':
        await musicManager.previous(guildId);
        await interaction.update(await uiTemplates.buildPlayerView(player));
        break;

      case 'stop':
        await musicManager.stop(guildId);
        await interaction.update(uiTemplates.buildEmptyPlayerView());
        break;

      case 'queue':
        await interaction.reply(uiTemplates.buildQueueView(player, 1));
        break;

      case 'lyrics': {
        const curTrack = player?.currentTrack;
        if (!curTrack) {
          return interaction.reply(uiTemplates.buildErrorMessage('No track currently playing.'));
        }
        const title = curTrack.title || curTrack.info?.title || 'Current Song';
        const author = curTrack.author || curTrack.info?.author || '';
        const text = await lyricsUtil.resolveLyrics(player, lyricsUtil.trackQuery(curTrack), true);
        const body = text || `No lyrics are available for **${title}** right now.`;
        await interaction.reply(uiTemplates.buildLyricsView(title, author, body, 1));
        break;
      }

      case 'favorite': {
        if (!player?.currentTrack) {
          return interaction.reply(uiTemplates.buildErrorMessage('No track currently playing.'));
        }
        userRepo.addFavorite(interaction.user.id, {
          title: player.currentTrack.title || player.currentTrack.info?.title,
          author: player.currentTrack.author || player.currentTrack.info?.author,
          uri: player.currentTrack.uri || player.currentTrack.info?.uri,
          duration: player.currentTrack.duration || player.currentTrack.info?.duration
        });
        await interaction.reply(
          uiTemplates.buildSuccessMessage(`Added **${player.currentTrack.title}** to your favorites!`)
        );
        break;
      }

      case 'more':
        await interaction.reply(uiTemplates.buildMoreControlsView(player));
        break;

      case 'refresh': {
        const refreshed = await uiTemplates.buildPlayerView(player);
        await interaction.update(refreshed);
        break;
      }

      case 'shuffle':
        player.queue.shuffle();
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;

      case 'loop': {
        musicManager.setLoop(guildId, param1 || 'off');
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;
      }

      case 'autoplay': {
        musicManager.setAutoplay(guildId, param1 === 'true');
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;
      }

      case 'vol': {
        const currentVol = player.volume || 80;
        const newVol = param1 === 'up' ? Math.min(150, currentVol + 10) : Math.max(0, currentVol - 10);
        await musicManager.setVolume(guildId, newVol);
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;
      }

      case 'seek': {
        const curPos = player.position || 0;
        const delta = param1 === 'fwd' ? 10000 : -10000;
        const targetPos = Math.max(0, curPos + delta);
        await musicManager.seek(guildId, targetPos);
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;
      }

      case '247': {
        const can247 = premiumManager.canUse247(guildId, interaction.user.id);
        if (!can247) {
          return interaction.reply(
            uiTemplates.buildErrorMessage('24/7 Mode requires a Gold or Diamond Premium tier. Use `/premium` to upgrade.')
          );
        }
        player.is247 = !player.is247;
        // Mirror /247: keep the engine in the voice channel and persist the
        // record so the connection is restored after a restart.
        if (typeof player.setStayInVc === 'function') {
          player.setStayInVc(player.is247);
        }
        guildRepo.update(guildId, { mode_247: player.is247 ? 1 : 0 });
        if (player.is247) {
          persistentRepo.save(guildId, {
            voiceChannelId: player.voiceChannelId,
            textChannelId: player.textChannelId || interaction.channelId,
            is247: true,
            volume: player.volume || 80
          });
        } else {
          persistentRepo.delete(guildId);
        }
        await interaction.update(uiTemplates.buildMoreControlsView(player));
        break;
      }

      case 'favorites': {
        const favs = userRepo.getFavorites(interaction.user.id);
        if (favs.length === 0) {
          return interaction.reply(
            uiTemplates.buildErrorMessage('You have no favorited songs. Play a song and click "Favorite" to add one!')
          );
        }
        const favList = favs.slice(0, 10).map((f, i) => `\`${i + 1}.\` **${f.title}** - ${f.author}`).join('\n');
        await interaction.reply(
          uiTemplates.buildSuccessMessage(`### Your Favorites\n${favList}`)
        );
        break;
      }

      case 'help':
        await interaction.reply(
          uiTemplates.buildHelpMenu('home', permissionManager.isDeveloper(interaction.user.id))
        );
        break;

      default:
        await interaction.deferUpdate();
        break;
    }
  }
}

module.exports = new PlayerButtonHandler();
