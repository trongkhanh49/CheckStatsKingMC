const { SlashCommandBuilder } = require('discord.js');

const OWNER_ID = (process.env.ADMIN_ID || process.env.OWNER_ID || '').trim();
const PROGRESS_UPDATE_MS = 1500;
const SEND_DELAY_MS = 250;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function buildProgress(done, total, success, failed, startedAt, finished = false) {
  const percent = total ? Math.floor((done / total) * 100) : 100;
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);

  return [
    finished ? '📨 **DMSALL — HOÀN TẤT**' : '📨 **DMSALL — ĐANG GỬI**',
    '',
    `**Tiến trình:** ${done.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`,
    bar,
    '',
    `✅ Thành công: **${success.toLocaleString()}**`,
    `❌ Thất bại: **${failed.toLocaleString()}**`,
    `⏱️ Thời gian: **${elapsed}s**`
  ].join('\n');
}

async function collectUsers(client) {
  const users = new Map();

  for (const guild of client.guilds.cache.values()) {
    try {
      const members = await guild.members.fetch();
      for (const member of members.values()) {
        if (!member.user.bot) users.set(member.id, member.user);
      }
    } catch (error) {
      console.error(`[DMSALL] Không thể lấy member ${guild.id}:`, error.message);
    }
  }

  return [...users.values()];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dmsall')
    .setDescription('Gửi DM tới member trong tất cả server của bot.')
    .addStringOption(o =>
      o.setName('noidung')
        .setDescription('Nội dung tin nhắn')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addAttachmentOption(o => o.setName('anh1').setDescription('Ảnh 1'))
    .addAttachmentOption(o => o.setName('anh2').setDescription('Ảnh 2'))
    .addAttachmentOption(o => o.setName('anh3').setDescription('Ảnh 3'))
    .addAttachmentOption(o => o.setName('anh4').setDescription('Ảnh 4'))
    .addAttachmentOption(o => o.setName('anh5').setDescription('Ảnh 5'))
    .addAttachmentOption(o => o.setName('anh6').setDescription('Ảnh 6'))
    .addAttachmentOption(o => o.setName('anh7').setDescription('Ảnh 7'))
    .addAttachmentOption(o => o.setName('anh8').setDescription('Ảnh 8'))
    .addAttachmentOption(o => o.setName('anh9').setDescription('Ảnh 9'))
    .addAttachmentOption(o => o.setName('anh10').setDescription('Ảnh 10')),

  async execute(interaction) {
    // Hard owner check: only the configured bot owner can run this command.
    if (!OWNER_ID || interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ Chỉ chủ bot mới có thể sử dụng /dmsall.',
        ephemeral: true
      });
    }

    const content = interaction.options.getString('noidung', true);
    const files = [];

    for (let i = 1; i <= 10; i++) {
      const attachment = interaction.options.getAttachment(`anh${i}`);
      if (attachment) files.push(attachment.url);
    }

    await interaction.deferReply({ ephemeral: true });

    const users = await collectUsers(interaction.client);
    const total = users.length;

    if (!total) {
      return interaction.editReply('⚠️ Không tìm thấy member nào để gửi.');
    }

    let done = 0;
    let success = 0;
    let failed = 0;
    const startedAt = Date.now();
    let lastUpdate = 0;

    const updateProgress = async (force = false) => {
      if (!force && Date.now() - lastUpdate < PROGRESS_UPDATE_MS) return;
      lastUpdate = Date.now();

      try {
        await interaction.editReply(
          buildProgress(done, total, success, failed, startedAt)
        );
      } catch (error) {
        console.error('[DMSALL] Cập nhật tiến trình thất bại:', error.message);
      }
    };

    await updateProgress(true);

    for (const user of users) {
      try {
        await user.send({
          content,
          files,
          allowedMentions: { parse: [] }
        });
        success++;
      } catch (error) {
        failed++;
        console.error(
          `[DMSALL] Không gửi được DM tới ${user.id}:`,
          error.code || error.message
        );
      }

      done++;
      await updateProgress();
      await sleep(SEND_DELAY_MS);
    }

    await interaction.editReply(
      buildProgress(done, total, success, failed, startedAt, true)
    );
  }
};
