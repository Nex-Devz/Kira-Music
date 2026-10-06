const uiTemplates = require('../../ui/templates');

class QueueButtonHandler {
  async handle(interaction, action, param1, player) {
    if (!player) {
      return interaction.reply(uiTemplates.buildErrorMessage('No active music player in this server.'));
    }

    if (action === 'page') {
      const page = parseInt(param1, 10) || 1;
      await interaction.update(uiTemplates.buildQueueView(player, page));
    } else if (action === 'clear') {
      player.queue.clear();
      await interaction.update(uiTemplates.buildQueueView(player, 1));
    } else if (action === 'shuffle') {
      const list = player.queue.tracksList || [];
      const current = player.currentTrack;
      const upcoming = current && list[0] === current ? list.length - 1 : list.length;
      if (upcoming < 2) {
        return interaction.reply(uiTemplates.buildErrorMessage('Need at least 2 upcoming tracks to shuffle.'));
      }
      player.queue.shuffle();
      await interaction.update(uiTemplates.buildQueueView(player, 1));
    } else {
      await interaction.deferUpdate();
    }
  }
}

module.exports = new QueueButtonHandler();
