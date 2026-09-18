const { SlashCommandBuilder } = require('discord.js');

const OWNER_ID = (process.env.ADMIN_ID || process.env.OWNER_ID || '').trim();
const UPDATE_MS = 1500;
const SEND_DELAY_MS = 250;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function render(done, total, success, failed, skipped, startedAt, finished = false) {
  const pct = total ? Math.floor(done / total * 100) : 100;
  const width = 20;
  const filled = Math.round(pct / 100 * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);

  return [
    finished ? '📨 **DMSALL — HOÀN TẤT**' : '📨 **DMSALL — ĐANG GỬI**',
    '',
    `**Tiến trình:** ${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`,
    bar,
    '',
    `✅ Thành công: **${success.toLocaleString()}**`,
    `❌ Thất bại: **${failed.toLocaleString()}**`,
    `⏭️ Bỏ qua: **${skipped.toLocaleString()}**`,
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
    } catch (err) {
      console.error(`[DMSALL] fetch ${guild.id}:`, err.message);
    }
  }

  return [...users.values()];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dmsall')
    .setDescription('Gửi DM tới member trong tất cả server của bot.')
    .addStringOption(o => o.setName('noidung').setDescription('Nội dung').setRequired(true).setMaxLength(2000))
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
    if (!OWNER_ID || interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ Chỉ chủ bot mới có thể sử dụng /dmsall.', ephemeral: true });
    }

    const content = interaction.options.getString('noidung', true);
    const files = [];
    for (let i = 1; i <= 10; i++) {
      const a = interaction.options.getAttachment(`anh${i}`);
      if (a) files.push(a.url);
    }

    await interaction.deferReply({ ephemeral: true });

    const users = await collectUsers(interaction.client);
    const total = users.length;
    if (!total) return interaction.editReply('⚠️ Không tìm thấy member nào.');

    let done = 0, success = 0, failed = 0, skipped = 0;
    const startedAt = Date.now();
    let lastUpdate = 0;

    const update = async (force = false) => {
      if (!force && Date.now() - lastUpdate < UPDATE_MS) return;
      lastUpdate = Date.now();
      try {
        await interaction.editReply(render(done, total, success, failed, skipped, startedAt));
      } catch {}
    };

    await update(true);

    for (const user of users) {
      try {
        await user.send({ content, files });
        success++;
      } catch (err) {
        failed++;
        console.error(`[DMSALL] ${user.id}:`, err.code || err.message);
      }
      done++;
      await update();
      await sleep(SEND_DELAY_MS);
    }

    await interaction.editReply(render(done, total, success, failed, skipped, startedAt, true));
  }
};
