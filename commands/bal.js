/**
 * commands/bal.js - Slash Command /bal
 * Tự động lấy Application Emoji theo tên
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');

const { recordError } = require('../helpers/reportHelper');
const configHelper = require('../helpers/configHelper');
const { renderBalanceImage } = require('../helpers/renderHelper');

async function getApplicationEmoji(client, name) {
  if (!name) return '🔹';

  try {
    const emojis = await client.application.emojis.fetch();

    const emoji = emojis.find(
      e => e.name?.toLowerCase() === name.toLowerCase()
    );

    if (emoji) {
      return emoji.toString();
    }

  } catch (error) {
    console.error(
      `[Emoji] Không thể lấy Application Emoji "${name}":`,
      error.message
    );
  }

  return '💚';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bal')
    .setDescription('Kiểm tra số dư của một người chơi trên KingMC')
    .addStringOption(option =>
      option
        .setName('player')
        .setDescription('Tên người chơi cần kiểm tra')
        .setRequired(true)
    ),

  async execute(interaction, queueDispatcher) {
    const targetPlayer =
      interaction.options.getString('player').trim();

    const BOT_CHECK_TIMEOUT =
      parseInt(process.env.BOT_CHECK_TIMEOUT) || 15000;

    await interaction.deferReply();

    try {

      // Gửi tác vụ lấy balance
      const balanceText =
        await queueDispatcher.enqueueTask(
          'bal',
          targetPlayer,
          BOT_CHECK_TIMEOUT
        );

      // Lấy emoji emerald mới từ Discord Application
      const emeraldEmoji =
        await getApplicationEmoji(
          interaction.client,
          'emerald'
        );

      let cleanVal = balanceText;

      if (cleanVal.includes('$')) {
        const dollarIndex = cleanVal.indexOf('$');

        cleanVal =
          cleanVal
            .substring(dollarIndex)
            .replace(/balance/gi, '')
            .trim();
      }

      const embed = new EmbedBuilder()
        .setTitle(
          `${emeraldEmoji} Số dư người chơi: **${targetPlayer}**`
        )
        .setColor('#2b2d31')
        .setThumbnail(
          `https://mc-heads.net/head/${targetPlayer}/3d`
        )
        .setDescription(
          `${emeraldEmoji} **SỐ DƯ:** \`${cleanVal}\`\n\n\u200B`
        )
        .setTimestamp()
        .setFooter({
          text: 'KingX • By Kian Nguyen'
        });

      // Chế độ IMAGE: /bal chỉ hiển thị Money trong ảnh.
      if (configHelper.getBalDisplayMode() === 'image') {
        try {
          const imageBuffer = await renderBalanceImage(targetPlayer, cleanVal);
          const attachment = new AttachmentBuilder(imageBuffer, {
            name: 'bal.png'
          });

          const imageEmbed = new EmbedBuilder()
            .setImage('attachment://bal.png')
            .setColor('#2b2d31')
            .setTimestamp()
            .setFooter({
              text: 'KingX • By Kian Nguyen'
            });

          return await interaction.editReply({
            embeds: [imageEmbed],
            files: [attachment]
          });
        } catch (renderError) {
          console.error(
            `[Discord-Bot] Render ảnh Balance thất bại cho ${targetPlayer}:`,
            renderError.message
          );
          // Fallback về Embed cũ nếu Puppeteer/render gặp lỗi.
        }
      }

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {

      console.error(
        `[Discord-Bot] Lỗi khi xử lý lệnh bal cho ${targetPlayer}:`,
        error.message
      );

      recordError(
        'bal',
        targetPlayer,
        error
      );

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Lỗi kiểm tra số dư')
        .setDescription(
          `Không thể lấy số dư của người chơi **${targetPlayer}**.\n\n` +
          `⚠️ Đã có lỗi xảy ra trong quá trình xử lý yêu cầu. ` +
          `Vui lòng thử lại sau hoặc bấm nút **Báo lỗi** bên dưới để gửi thông báo tới Admin!`
        )
        .setColor('#ef4444')
        .setTimestamp()
        .setFooter({
          text: 'KingX • By Kian Nguyen'
        });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `report_error_bal_${targetPlayer}`
            )
            .setLabel('Báo lỗi')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [row]
      });
    }
  }
}
