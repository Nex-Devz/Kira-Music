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
        .addIntegerOption(opt => opt.setName('position').setDescription('Track position to skip to').setRequired(true).setMinValue(1).setAutocomplete(true))
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
        const isCurrentInTracks = Boolean(player.currentTrack && player.queue.tracks[0] === player.currentTrack);
        const upcomingCount = isCurrentInTracks ? Math.max(0, player.queue.tracks.length - 1) : player.queue.tracks.length;
        return context.replySuccess(`Added **${track.title}** to the queue at position #${upcomingCount}.`);
      }

      case 'remove': {
        const isCurrentInTracks = Boolean(player.currentTrack && player.queue.tracks[0] === player.currentTrack);
        const upcomingCount = isCurrentInTracks ? Math.max(0, player.queue.tracks.length - 1) : player.queue.tracks.length;
        const pos = context.getInteger('position') || parseInt(context.getString('arg1'), 10);
        if (!pos || pos < 1 || pos > upcomingCount) {
          return context.replyError(`Invalid position. Valid range: 1 to ${upcomingCount}.`);
        }
        const targetIdx = isCurrentInTracks ? pos : (pos - 1);
        const removed = player.queue.remove(targetIdx, 1)[0];
        return context.replySuccess(`Removed **${removed?.title || 'track'}** from position #${pos}.`);
      }

      case 'move': {
        const isCurrentInTracks = Boolean(player.currentTrack && player.queue.tracks[0] === player.currentTrack);
        const upcomingCount = isCurrentInTracks ? Math.max(0, player.queue.tracks.length - 1) : player.queue.tracks.length;
        const from = context.getInteger('from') || parseInt(context.getString('arg1'), 10);
        const to = context.getInteger('to') || parseInt(context.getString('arg2'), 10);
        if (!from || !to || from < 1 || to < 1 || from > upcomingCount || to > upcomingCount) {
          return context.replyError(`Invalid positions. Range must be between 1 and ${upcomingCount}.`);
        }
        const targetFrom = isCurrentInTracks ? from : (from - 1);
        const targetTo = isCurrentInTracks ? to : (to - 1);
        const moved = player.queue.tracks[targetFrom];
        player.queue.move(targetFrom, targetTo);
        return context.replySuccess(`Moved **${moved?.title || 'track'}** from #${from} to #${to}.`);
      }

      case 'clear': {
        if (typeof player.queue.clearExceptCurrent === 'function' && player.currentTrack) {
          player.queue.clearExceptCurrent();
        } else {
          player.queue.clear();
        }
        return context.replySuccess('Cleared all tracks from the queue.');
      }

      case 'shuffle': {
        const isCurrentInTracks = Boolean(player.currentTrack && player.queue.tracks[0] === player.currentTrack);
        const upcomingCount = isCurrentInTracks ? Math.max(0, player.queue.tracks.length - 1) : player.queue.tracks.length;
        if (upcomingCount < 2) {
          return context.replyError('Need at least 2 upcoming tracks in the queue to shuffle.');
        }
        player.queue.shuffle();
        return context.replySuccess(`Shuffled **${upcomingCount} tracks** in the queue.`);
      }

      case 'jump': {
        const isCurrentInTracks = Boolean(player.currentTrack && player.queue.tracks[0] === player.currentTrack);
        const upcomingCount = isCurrentInTracks ? Math.max(0, player.queue.tracks.length - 1) : player.queue.tracks.length;
        const jumpPos = context.getInteger('position') || parseInt(context.getString('arg1'), 10);
        if (!jumpPos || jumpPos < 1 || jumpPos > upcomingCount) {
          return context.replyError(`Invalid position. Range must be between 1 and ${upcomingCount}.`);
        }
        const targetJump = isCurrentInTracks ? jumpPos : (jumpPos - 1);
        player.queue.skipTo(targetJump);
        await musicManager.skip(context.guildId);
        return context.replySuccess(`Jumped to track at position #${jumpPos}.`);
      }
    }
  }
};
