const { SlashCommandBuilder } = require('discord.js');
const userRepo = require('../../database/repositories/UserRepository');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'favorites',
  description: 'View your saved favorites or play all of them into the queue',
  aliases: ['favs', 'myfavorites'],
  argNames: ['action'],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('favorites')
    .setDescription('View your saved favorites or play all of them into the queue')
    .addStringOption(opt =>
      opt
        .setName('action')
        .setDescription('Action to perform')
        .addChoices(
          { name: 'View List', value: 'view' },
          { name: 'Play All in Voice Channel', value: 'play' },
          { name: 'Clear All', value: 'clear' }
        )
    ),

  async execute(context) {
    const action = context.getString('action') || 'view';
    const favs = userRepo.getFavorites(context.userId);

    if (action === 'clear') {
      userRepo.clearFavorites(context.userId);
      return context.replySuccess('Cleared all tracks from your favorites.');
    }

    if (favs.length === 0) {
      return context.replyError('You have no saved favorites yet. Play a song and use `/favorite` to add one.');
    }

    if (action === 'play') {
      const voiceChannel = context.voiceChannel;
      if (!voiceChannel) {
        return context.replyError('You must be in a voice channel to play your favorites.');
      }
      await context.deferReply();
      await musicManager.play(context.guildId, voiceChannel.id, context.channel.id, favs, context.user);
      return context.reply(uiTemplates.buildSuccessMessage(`Loaded **${favs.length} favorited tracks** into the queue.`));
    }

    // View list
    const list = favs.slice(0, 15).map((f, i) => `\`${i + 1}.\` **${f.title}** - ${f.author} \`[${uiTemplates.formatDuration(f.duration)}]\``).join('\n');
    return context.reply(uiTemplates.buildSuccessMessage(`### Your Saved Favorites (${favs.length})\n${list}`));
  }
};
