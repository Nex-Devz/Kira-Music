const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'queue',
  description: 'View, add, remove, move, shuffle, jump, or clear tracks in the queue',
  aliases: ['q'],
  argNames: ['subcommand', 'arg1', 'arg2'],
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Manage the server music queue')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View current queue page')
        .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1))
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a song to the queue')
        .addStringOption(opt => opt.setName('query').setDescription('Song title or URL').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a track at a specific position')
        .addIntegerOption(opt => opt.setName('position').setDescription('Track position number').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub
        .setName('move')
        .setDescription('Move a track from one position to another')
        .addIntegerOption(opt => opt.setName('from').setDescription('Current position').setRequired(true).setMinValue(1))
        .addIntegerOption(opt => opt.setName('to').setDescription('Target position').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub
        .setName('clear')
        .setDescription('Clear all tracks from the queue')
    )
    .addSubcommand(sub =>
      sub
        .setName('shuffle')
        .setDescription('Shuffle all tracks in the queue')
    )
    .addSubcommand(sub =>
      sub
        .setName('jump')
        .setDescription('Jump directly to a song in the queue')
        .addIntegerOption(opt => opt.setName('position').setDescription('Track position to skip to').setRequired(true).setMinValue(1))
    ),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    let subcommand = 'view';

    if (context.isInteraction) {
      subcommand = context.source.options.getSubcommand(false) || 'view';
    } else {
      const sub = context.getString('subcommand');
      if (sub && ['add', 'remove', 'move', 'clear', 'shuffle', 'jump', 'view'].includes(sub.toLowerCase())) {
        subcommand = sub.toLowerCase();
      }
    }

    switch (subcommand) {
      case 'view': {
        const page = context.getInteger('page') || parseInt(context.getString('arg1'), 10) || 1;
        const payload = uiTemplates.buildQueueView(player, page);
        return context.reply(payload);
      }

      case 'add': {
        const query = context.getString('query') || context.getString('arg1');
        if (!query) return context.replyError('Please provide a song to add.');
        const res = await musicManager.search(query, context.user);
        if (!res || !res.tracks?.length) return context.replyError(`No results found for "${query}".`);
        const track = res.tracks[0];
        track.requester = context.user;
        player.queue.enqueue(track);
        return context.replySuccess(`Added **${track.title}** to the queue at position #${player.queue.tracksList.length}.`);
      }

      case 'remove': {
        const pos = context.getInteger('position') || parseInt(context.getString('arg1'), 10);
        if (!pos || pos < 1 || pos > player.queue.tracksList.length) {
          return context.replyError(`Invalid position. Valid range: 1 to ${player.queue.tracksList.length}.`);
        }
        const removed = player.queue.tracksList.splice(pos - 1, 1)[0];
        return context.replySuccess(`Removed **${removed?.title || 'track'}** from position #${pos}.`);
      }

      case 'move': {
        const from = context.getInteger('from') || parseInt(context.getString('arg1'), 10);
        const to = context.getInteger('to') || parseInt(context.getString('arg2'), 10);
        const len = player.queue.tracksList.length;
        if (!from || !to || from < 1 || to < 1 || from > len || to > len) {
          return context.replyError(`Invalid positions. Range must be between 1 and ${len}.`);
        }
        const [moved] = player.queue.tracksList.splice(from - 1, 1);
        player.queue.tracksList.splice(to - 1, 0, moved);
        return context.replySuccess(`Moved **${moved.title}** from #${from} to #${to}.`);
      }

      case 'clear': {
        player.queue.clear();
        return context.replySuccess('Cleared all tracks from the queue.');
      }

      case 'shuffle': {
        player.queue.shuffle();
        return context.replySuccess(`Shuffled **${player.queue.tracksList.length} tracks** in the queue.`);
      }

      case 'jump': {
        const jumpPos = context.getInteger('position') || parseInt(context.getString('arg1'), 10);
        if (!jumpPos || jumpPos < 1 || jumpPos > player.queue.tracksList.length) {
          return context.replyError(`Invalid position. Range must be between 1 and ${player.queue.tracksList.length}.`);
        }
        // Remove tracks before target position
        player.queue.tracksList.splice(0, jumpPos - 1);
        await musicManager.skip(context.guildId);
        return context.replySuccess(`Jumped to track at position #${jumpPos}.`);
      }
    }
  }
};
