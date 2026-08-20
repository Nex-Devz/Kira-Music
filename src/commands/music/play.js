const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'play',
  description: 'Play a track or playlist from YouTube, Spotify, SoundCloud, or direct link',
  aliases: ['p'],
  argNames: ['query'],
  voiceRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a track or playlist from YouTube, Spotify, SoundCloud, or direct link')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song title, artist name, or direct URL')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(context) {
    const query = context.getString('query');
    if (!query) {
      return context.replyError('Please provide a song title or link to play.');
    }

    await context.deferReply();

    const voiceChannel = context.voiceChannel;
    if (!voiceChannel) {
      return context.replyError('You must be in a voice channel to play music.');
    }

    try {
      const searchResult = await musicManager.search(query, context.user);
      if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
        return context.replyError(`No results found for "${query}".`);
      }

      if (searchResult.loadType === 'playlist' || searchResult.type === 'PLAYLIST') {
        const tracks = searchResult.tracks;
        await musicManager.play(context.guildId, voiceChannel.id, context.channel.id, tracks, context.user);
        return context.reply(
          uiTemplates.buildSuccessMessage(
            `Loaded **${tracks.length} tracks** from playlist **${searchResult.playlistInfo?.name || searchResult.name || 'Playlist'}**`
          )
        );
      }

      const track = searchResult.tracks[0];
      await musicManager.play(context.guildId, voiceChannel.id, context.channel.id, track, context.user);
      return context.reply(
        uiTemplates.buildSuccessMessage(
          `Queued **${track.title || track.info?.title}** - ${track.author || track.info?.author}`
        )
      );
    } catch (err) {
      console.error('[Command: play] Error:', err);
      return context.replyError(`Failed to load track: ${err.message}`);
    }
  }
};
