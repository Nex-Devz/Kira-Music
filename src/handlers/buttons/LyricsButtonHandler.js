const uiTemplates = require('../../ui/templates');
const lyricsUtil = require('../../utils/lyrics');

class LyricsButtonHandler {
  async handle(interaction, action, param1, player) {
    const curTrack = player?.currentTrack;
    const page = parseInt(param1, 10) || 1;
    const title = curTrack?.title || curTrack?.info?.title || 'Current Song';
    const author = curTrack?.author || curTrack?.info?.author || '';

    const text = await lyricsUtil.resolveLyrics(player, lyricsUtil.trackQuery(curTrack), true);
    const body = text || `No lyrics are available for **${title}** right now.`;

    await interaction.update(uiTemplates.buildLyricsView(title, author, body, page));
  }
}

module.exports = new LyricsButtonHandler();
