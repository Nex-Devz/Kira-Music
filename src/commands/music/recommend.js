const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'recommend',
  description: 'Find and queue recommended songs based on the current playing track',
  aliases: ['rec', 'suggestions'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Find and queue recommended songs based on the current playing track'),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    const curTrack = player.currentTrack;
    if (!curTrack) {
      return context.replyError('No track currently playing.');
    }

    await context.deferReply();

    const title = curTrack.title || curTrack.info?.title;
    const author = curTrack.author || curTrack.info?.author;
    const query = `${title} ${author} mix`;

    try {
      const searchRes = await musicManager.search(query, context.user);
      if (!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) {
        return context.replyError('No recommendations found.');
      }

      const recTracks = searchRes.tracks.slice(1, 4);
      for (const track of recTracks) {
        track.requester = context.user;
        player.queue.enqueue(track);
      }

      const list = recTracks.map((t, i) => `\`${i + 1}.\` **${t.title}** - ${t.author}`).join('\n');
      return context.reply(
        uiTemplates.buildSuccessMessage(`Added **${recTracks.length} recommended tracks** to the queue:\n${list}`)
      );
    } catch (err) {
      return context.replyError(`Failed to fetch recommendations: ${err.message}`);
    }
  }
};
