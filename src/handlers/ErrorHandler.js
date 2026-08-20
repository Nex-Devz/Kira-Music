const uiTemplates = require('../ui/templates');

class ErrorHandler {
  /**
   * Handle error inside command execution
   */
  async handleCommandError(err, context, commandName) {
    console.error(`[ErrorHandler] Error in command "/${commandName}":`, err);

    const userMessage = err.userMessage || err.message || 'An unexpected error occurred while executing this command.';

    try {
      if (context.replied || context.deferred) {
        await context.editReply(uiTemplates.buildErrorMessage(userMessage));
      } else {
        await context.reply(uiTemplates.buildErrorMessage(userMessage));
      }
    } catch (sendErr) {
      console.error('[ErrorHandler] Failed to send error message to user:', sendErr?.message || sendErr);
    }
  }

  /**
   * Handle error in interaction component router
   */
  async handleInteractionError(err, interaction) {
    console.error(`[ErrorHandler] Interaction error on customId "${interaction.customId}":`, err);
    const userMessage = err.message || 'An error occurred while processing this interaction.';

    try {
      const payload = uiTemplates.buildErrorMessage(userMessage);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (e) {}
  }
}

module.exports = new ErrorHandler();
