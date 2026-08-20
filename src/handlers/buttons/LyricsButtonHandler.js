const uiTemplates = require('../../ui/templates');

class LyricsButtonHandler {
  async handle(interaction, action, param1, player) {
    const curTrack = player?.currentTrack;
    const page = parseInt(param1, 10) || 1;
    const title = curTrack?.title || 'Current Song';
    const author = curTrack?.author || 'Artist';
    const lyrics = `Lyrics for ${title}\n\n(Page ${page})`;
    await interaction.update(uiTemplates.buildLyricsView(title, author, lyrics, page));
  }
}

module.exports = new LyricsButtonHandler();
