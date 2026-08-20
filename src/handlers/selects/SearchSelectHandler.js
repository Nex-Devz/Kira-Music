const musicManager = require('../../managers/MusicManager');
const cacheManager = require('../../managers/CacheManager');
const uiTemplates = require('../../ui/templates');

class SearchSelectHandler {
  async handle(interaction, selectedValue) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply(uiTemplates.buildErrorMessage('You must be in a voice channel.'));
    }

    const index = parseInt(selectedValue, 10);
    const searchRes = cacheManager.getTrackInfo('last_search:' + interaction.user.id);
    const selectedTrack = searchRes?.tracks?.[index];

    if (!selectedTrack) {
      return interaction.reply(uiTemplates.buildErrorMessage('Search session expired. Please run `/search` again.'));
    }

    await musicManager.play(interaction.guildId, voiceChannel.id, interaction.channelId, selectedTrack, interaction.user);
    await interaction.update(uiTemplates.buildSuccessMessage(`Queued **${selectedTrack.title || selectedTrack.info?.title}**`));
  }
}

module.exports = new SearchSelectHandler();
