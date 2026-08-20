const playlistRepo = require('../../database/repositories/PlaylistRepository');
const uiTemplates = require('../../ui/templates');

class PlaylistSelectHandler {
  async handle(interaction, selectedValue) {
    const playlist = playlistRepo.get(selectedValue);
    if (!playlist) {
      return interaction.reply(uiTemplates.buildErrorMessage('Playlist not found.'));
    }
    await interaction.update(uiTemplates.buildPlaylistDetailsView(playlist));
  }
}

module.exports = new PlaylistSelectHandler();
