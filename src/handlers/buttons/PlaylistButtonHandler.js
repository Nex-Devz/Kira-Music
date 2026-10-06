const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: DjsActionRow } = require('discord.js');
const playlistRepo = require('../../database/repositories/PlaylistRepository');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

class PlaylistButtonHandler {
  async handle(interaction, action, param1) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (action === 'create') {
      // ModalRouter handles modal:playlist:create — nothing opened it before.
      const modal = new ModalBuilder()
        .setCustomId('modal:playlist:create')
        .setTitle('Create Playlist')
        .addComponents(
          new DjsActionRow().addComponents(
            new TextInputBuilder()
              .setCustomId('playlist_name')
              .setLabel('Playlist name')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(50)
              .setRequired(true)
          ),
          new DjsActionRow().addComponents(
            new TextInputBuilder()
              .setCustomId('playlist_desc')
              .setLabel('Description (optional)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(200)
              .setRequired(false)
          )
        );
      return interaction.showModal(modal);
    }

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
      await interaction.reply(uiTemplates.buildSuccessMessage(`Loaded **${playlist.tracks.length} tracks** from playlist **${playlist.name}** into playback.`));
    } else if (action === 'delete') {
      const deleted = playlistRepo.delete(param1, userId);
      if (!deleted) {
        return interaction.reply(
          uiTemplates.buildErrorMessage('That playlist does not exist or does not belong to you.')
        );
      }
      const playlists = playlistRepo.getUserPlaylists(userId);
      await interaction.update(uiTemplates.buildPlaylistListView(playlists));
    } else {
      await interaction.deferUpdate();
    }
  }
}

module.exports = new PlaylistButtonHandler();
