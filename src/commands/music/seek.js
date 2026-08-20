const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

function parseTimeString(timeStr) {
  if (!timeStr) return null;
  if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr, 10) * 1000;
  }
  const match = timeStr.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (match && (match[1] || match[2] || match[3])) {
    const hours = parseInt(match[1] || 0, 10);
    const minutes = parseInt(match[2] || 0, 10);
    const seconds = parseInt(match[3] || 0, 10);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  const parts = timeStr.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return null;
}

module.exports = {
  name: 'seek',
  description: 'Seek to a specified timestamp in the current track',
  aliases: ['jumpto'],
  argNames: ['position'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a specified timestamp in the current track')
    .addStringOption(option =>
      option
        .setName('position')
        .setDescription('Timestamp (e.g. 1:30, 90, 1m30s)')
        .setRequired(true)
    ),

  async execute(context) {
    const posStr = context.getString('position');
    const ms = parseTimeString(posStr);

    if (ms === null || isNaN(ms)) {
      return context.replyError('Invalid timestamp format. Examples: `1:30`, `90s`, `2m15s`.');
    }

    const player = musicManager.getPlayer(context.guildId);
    const duration = player.currentTrack?.duration || player.currentTrack?.info?.duration || 0;

    if (duration > 0 && ms > duration) {
      return context.replyError('Specified timestamp exceeds track duration.');
    }

    await musicManager.seek(context.guildId, ms);
    return context.replySuccess(`Seeked to **${Math.floor(ms / 1000)}s**.`);
  }
};
