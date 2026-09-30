/**
 * commands/donate.js - Slash Command /donate
 * Hiển thị thông tin & mã QR ủng hộ kinh phí duy trì bot KingMC.
 */

const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getDonationConfig } = require('../helpers/mongoHelper');
const { getCustomEmoji } = require('../helpers/utils');
const { v2Payload, v2Text } = require('../helpers/componentsV2');

const LOCAL_QR_PATH = path.join(__dirname, '../public/images/donate_qr.jpg');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Xem thông tin & mã QR ủng hộ kinh phí duy trì bot KingMC'),

  async execute(interaction) {
    if (interaction.deferReply) {
      await interaction.deferReply();
    }

    try {
      // Vẫn đọc cấu hình Donate từ MongoDB để giữ nguyên dữ liệu tùy chỉnh hiện có.
      const donationData = await getDonationConfig('donate_qr');
      let rawBuffer = null;
      let fileName = 'donate_qr.jpg';

      // Ưu tiên ảnh QR được đóng gói cùng bot để luôn dùng đúng mã QR mới.
      if (fs.existsSync(LOCAL_QR_PATH)) {
        rawBuffer = fs.readFileSync(LOCAL_QR_PATH);
      } else if (donationData?.imageBuffer) {
        rawBuffer = donationData.imageBuffer;
        fileName = donationData.fileName || fileName;
      }

      if (!Buffer.isBuffer(rawBuffer)) {
        if (rawBuffer && rawBuffer.buffer) {
          rawBuffer = Buffer.from(rawBuffer.buffer);
        } else if (rawBuffer) {
          rawBuffer = Buffer.from(rawBuffer);
        }
      }

      if (!rawBuffer || !Buffer.isBuffer(rawBuffer)) {
        const barrierEmoji = getCustomEmoji('barrier');
        const errorMsg = `${barrierEmoji} Hiện chưa tìm thấy dữ liệu mã QR quyên góp trên hệ thống. Vui lòng liên hệ Admin!`;
        return await interaction.editReply(v2Text(errorMsg, { ephemeral: true }));
      }

      const qrAttachment = new AttachmentBuilder(rawBuffer, { name: fileName });
      const netherStarEmoji = getCustomEmoji('nether_star');
      const emeraldEmoji = getCustomEmoji('emerald');
      const diamondEmoji = getCustomEmoji('diamond');

      const donationDescription = (donationData?.description ||
        `Cảm ơn bạn đã luôn tin tưởng và sử dụng Bot CheckStatsKingMC!\n` +
        `Mọi đóng góp dù lớn hay nhỏ đều là nguồn hỗ trợ quý báu.\n\n` +
        `${emeraldEmoji} **Money KingSMP:**\n` +
        `└ IGN: \`ntkhanh\`\n\n` +
        `${diamondEmoji} **VND:**\n` +
        `└ Quét mã QR đính kèm bên dưới`).replace(/lhbinh001/gi, 'ntkhanh');

      const embed = new EmbedBuilder()
        .setTitle(`${netherStarEmoji} **Ủng hộ tôi**`)
        .setColor('#2b2d31')
        .setDescription(donationDescription)
        .setFooter({ text: 'kingmc.vn・axolotl stats・ntkhanh' })
        .setTimestamp();

      await interaction.editReply(v2Payload({
        embed,
        files: [qrAttachment],
        imageAttachmentName: fileName
      }));
    } catch (err) {
      console.error('[DonateCommand] Lỗi khi xử lý lệnh /donate:', err);
      const barrierEmoji = getCustomEmoji('barrier');
      await interaction.editReply(v2Text(
        `${barrierEmoji} Đã xảy ra lỗi khi tải dữ liệu quyên góp: \`${err.message}\``,
        { ephemeral: true }
      ));
    }
  }
};
