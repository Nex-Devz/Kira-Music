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
    }
  }
}

module.exports = new QueueButtonHandler();
