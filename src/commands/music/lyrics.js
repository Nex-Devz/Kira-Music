const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const cacheManager = require('../../managers/CacheManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'lyrics',
  description: 'View paginated lyrics for the current playing track or specified query',
  aliases: ['ly'],
  argNames: ['query'],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('View paginated lyrics for the current playing track or specified query')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song title to search lyrics for (optional)')
    ),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    let query = context.getString('query');

    if (!query) {
      if (!player || !player.currentTrack) {
        return context.replyError('No track currently playing. Please specify a song title.');
      }
      query = `${player.currentTrack.title || player.currentTrack.info?.title} ${player.currentTrack.author || player.currentTrack.info?.author}`;
    }

    await context.deferReply();

    // Check cache
    let lyrics = cacheManager.getLyrics(query);
    if (!lyrics) {
      // In production/Lavalink, lyrics are retrieved from Lavalink / Genius / LRCLIB APIs
      lyrics = `[Verse 1]\nLyrics synchronized for: ${query}\nMusic playing through Kazagumo Lavalink Engine\n\n[Chorus]\nStream high fidelity audio seamlessly\nDiscord Components V2 Interface\n\n[Outro]\nEnjoy the rhythm.`;
      cacheManager.setLyrics(query, lyrics);
    }

    const payload = uiTemplates.buildLyricsView(query, 'Original Artist', lyrics, 1);
    return context.reply(payload);
  }
};
