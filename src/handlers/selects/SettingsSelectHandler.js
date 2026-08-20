const uiTemplates = require('../../ui/templates');

class SettingsSelectHandler {
  async handle(interaction, selectedValue) {
    await interaction.reply({
      ...uiTemplates.buildSuccessMessage(`To configure **${selectedValue}**, use \`/settings\` subcommands or \`/${selectedValue}\`.`),
      ephemeral: true
    });
  }
}

module.exports = new SettingsSelectHandler();
