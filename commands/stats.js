/**
 * commands/stats.js - Slash Command /stats
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

const {
  getStatsLabel,
  isDecorationItem,
  cleanMinecraftText
} = require('../helpers/utils');

const { recordError } = require('../helpers/reportHelper');
const configHelper = require('../helpers/configHelper');
const { renderStatsImage } = require('../helpers/renderHelper');

async function getApplicationEmoji(client, name) {
  if (!name) return '🔹';

  try {
    // Lấy toàn bộ Application Emoji hiện tại
    const emojis = await client.application.emojis.fetch();

    const nameLower = String(name).toLowerCase();

    // Khớp chính xác tên emoji
    const exact = emojis.find(
      emoji => emoji.name?.toLowerCase() === nameLower
    );

    if (exact) {
      return exact.toString();
    }

    // Một số item Minecraft có tên khác với tên emoji
    const aliases = {
      emerald: ['emerald'],
      amethyst_shard: ['amethyst_shard', 'amethyst'],
      netherite_sword: ['netherite_sword', 'sword'],
      diamond_sword: ['netherite_sword', 'diamond_sword'],
      skeleton_skull: ['skeleton_skull'],
      zombie_head: ['zombie_head'],
      clock: ['clockss', 'clock'],
      clockss: ['clockss', 'clock'],
      bricks: ['brickss', 'bricks', 'brick'],
      brick: ['brickss', 'brick'],
      diamond_pickaxe: ['diamond_pickaxe', 'pickaxe'],
      pickaxe: ['diamond_pickaxe', 'pickaxe'],
      chest: ['chest'],
      gold_ingot: ['gold_ingot', 'gold'],
      gold: ['gold_ingot', 'gold'],
      wheat: ['wheat']
    };

    const possibleNames = aliases[nameLower] || [nameLower];

    for (const possibleName of possibleNames) {
      const emoji = emojis.find(
        e => e.name?.toLowerCase() === possibleName.toLowerCase()
      );

      if (emoji) {
        return emoji.toString();
      }
    }

    // Khớp một phần tên
    for (const emoji of emojis.values()) {
      const emojiName = emoji.name?.toLowerCase();

      if (
        emojiName &&
        (
          emojiName.includes(nameLower) ||
          nameLower.includes(emojiName)
        )
      ) {
        return emoji.toString();
      }
    }

  } catch (error) {
    console.error(
      `[Emoji] Không thể lấy Application Emoji "${name}":`,
      error.message
    );
  }

  // Emoji mặc định nếu không tìm thấy
  return '🔹';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Kiểm tra stats (chỉ số) của một người chơi trên KingMC')
    .addStringOption(option =>
      option
        .setName('player')
        .setDescription('Tên người chơi Minecraft cần kiểm tra')
        .setRequired(true)
    ),

  async execute(interaction, queueDispatcher) {
    const targetPlayer =
      interaction.options.getString('player').trim();

    const BOT_CHECK_TIMEOUT =
      parseInt(process.env.BOT_CHECK_TIMEOUT) || 15000;

    await interaction.deferReply();

    try {
      // Gửi tác vụ vào Queue Dispatcher
      const result = await queueDispatcher.enqueueTask(
        'stats',
        targetPlayer,
        BOT_CHECK_TIMEOUT
      );

      // Embed
      const embed = new EmbedBuilder()
        .setTitle(`✨ Thống kê người chơi: **${targetPlayer}** ✨`)
        .setColor('#2b2d31')
        .setThumbnail(
          `https://mc-heads.net/head/${targetPlayer}/3d`
        )
        .setTimestamp()
        .setFooter({
          text: 'KingX • By Kian Nguyen'
        });

      const validItems = (result.items || [])
        .filter(item => !isDecorationItem(item));

      if (validItems.length === 0) {

        embed
          .setDescription(
            `⚠️ **Lưu ý:** Không tìm thấy stats nào hữu ích hoặc người chơi này chưa từng đăng nhập.`
          )
          .setColor('#ef4444');

      } else {

        const formattedItems = [];

        for (const item of validItems) {

          const rawCleanDisplay =
            cleanMinecraftText(item.displayName);

          const label = getStatsLabel(item);

          const displayTitle =
            (rawCleanDisplay || label).trim();

          // FIX EMOJI:
          // Lấy trực tiếp Application Emoji mới nhất
          const emoji =
            await getApplicationEmoji(
              interaction.client,
              item.name
            );

          const cleanLoreLines = (item.lore || [])
            .map(line => cleanMinecraftText(line))
            .filter(line => {

              if (!line) return false;

              if (/^[_\-+=*~]*$/.test(line))
                return false;

              if (
                line.includes('------') ||
                line.includes('======') ||
                line.includes('______')
              ) {
                return false;
              }

              const lower = line.toLowerCase();

              if (
                lower.includes('nhấp') ||
                lower.includes('click') ||
                lower.includes('click chuột')
              ) {
                return false;
              }

              return true;
            });

          const valueText =
            cleanLoreLines.join(', ');

          if (valueText) {

            formattedItems.push(
              `${emoji} **${displayTitle.toUpperCase()}** | \`${valueText}\``
            );

          }
        }

        let descriptionText =
          formattedItems.join('\n');

        if (descriptionText.length > 4096) {
          descriptionText =
            descriptionText.substring(0, 4080) + '...';
        }

        embed.setDescription(descriptionText);
      }

      // Chế độ IMAGE: giữ nguyên dữ liệu /stats, chỉ đổi cách hiển thị
      // thành HTML -> Puppeteer -> PNG rồi gửi ảnh vào Discord.
      if (configHelper.getDisplayMode() === 'image' && validItems.length > 0) {
        try {
          const imageBuffer = await renderStatsImage(targetPlayer, validItems);
          const attachment = new AttachmentBuilder(imageBuffer, {
            name: 'stats.png'
          });

          const imageEmbed = new EmbedBuilder()
            .setImage('attachment://stats.png')
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
            `[Discord-Bot] Render ảnh Stats thất bại cho ${targetPlayer}:`,
            renderError.message
          );
          // Nếu render lỗi, fallback về embed cũ để lệnh vẫn hoạt động.
        }
      }

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {

      console.error(
        `[Discord-Bot] Lỗi khi xử lý lệnh stats cho ${targetPlayer}:`,
        error.message
      );

      recordError(
        'stats',
        targetPlayer,
        error
      );

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Lỗi kiểm tra stats')
        .setDescription(
          `Không thể lấy stats của người chơi **${targetPlayer}**.\n\n` +
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
              `report_error_stats_${targetPlayer}`
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
