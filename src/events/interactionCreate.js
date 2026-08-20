const commandHandler = require('../handlers/CommandHandler');
const interactionRouter = require('../handlers/InteractionRouter');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      await commandHandler.handleInteraction(interaction);
    } else if (
      interaction.isAutocomplete() ||
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isChannelSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isUserSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      await interactionRouter.handle(interaction);
    }
  }
};
