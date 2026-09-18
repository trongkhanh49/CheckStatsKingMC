/**
 * commands/bounty.js - /bounty check
 */
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderBountyImage } = require('../helpers/renderHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bounty')
    .setDescription('Tra cứu bảng bounty KingMC')
    .addSubcommand(sub =>
      sub
        .setName('check')
        .setDescription('Xem Top 1-10 bounty')
    ),

  async execute(interaction, queueDispatcher) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply();

    if (subcommand !== 'check') {
      return interaction.editReply({ content: '❌ Subcommand bounty không hợp lệ.' });
    }

    const timeoutMs = parseInt(process.env.BOT_CHECK_TIMEOUT, 10) || 20000;

    try {
      const result = await queueDispatcher.enqueueTask('bounty', 'check', timeoutMs);
      const entries = Array.isArray(result?.entries) ? result.entries.slice(0, 10) : [];

      if (entries.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎯 Bounty')
              .setDescription('⚠️ Không đọc được Top 1-10 bounty từ server.')
              .setColor('#ef4444')
              .setTimestamp()
              .setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })
          ]
        });
      }

      try {
        const imageBuffer = await renderBountyImage(entries);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'bounty.png' });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setImage('attachment://bounty.png')
              .setColor('#2b2d31')
              .setTimestamp()
              .setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })
          ],
          files: [attachment]
        });
      } catch (renderError) {
        console.error(`[Discord-Bot] Render bounty thất bại: ${renderError.message}`);
        const lines = entries.map((entry, index) =>
          `**#${index + 1}** ${entry.player || 'Unknown'} — **${entry.value || 'N/A'}**`
        );
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎯 Bounty')
              .setDescription(lines.join('\n'))
              .setColor('#2b2d31')
              .setTimestamp()
              .setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })
          ]
        });
      }
    } catch (error) {
      console.error(`[Discord-Bot] Lỗi bounty:`, error.message);
      return interaction.editReply({
        content: `❌ Không thể lấy bounty: ${error.message}`
      });
    }
  }
};
