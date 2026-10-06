const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');
const lyricsUtil = require('../../utils/lyrics');

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
    const userQuery = context.getString('query');
    let query = userQuery;

    if (!query) {
      if (!player || !player.currentTrack) {
        return context.replyError('No track currently playing. Please specify a song title.');
      }
      query = lyricsUtil.trackQuery(player.currentTrack);
    }

    await context.deferReply();

    // Node lyrics always describe the current track, so only ask for them
    // when the query came from that track instead of a user-supplied title.
    const lyrics = await lyricsUtil.resolveLyrics(player, query, !userQuery);

    if (!lyrics) {
      return context.reply(
        uiTemplates.buildLyricsView(
          userQuery || player?.currentTrack?.title || query,
          userQuery ? 'Unknown Artist' : player?.currentTrack?.author || '',
          `No lyrics found for \`${query}\`. Try \`/lyrics <title> <artist>\` with a more specific query.`,
          1
        )
      );
    }

    const payload = uiTemplates.buildLyricsView(
      userQuery || player?.currentTrack?.title || query,
      userQuery ? '' : player?.currentTrack?.author || '',
      lyrics,
      1
    );
    return context.reply(payload);
  }
};
