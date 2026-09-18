const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const OWNER_ID = (process.env.ADMIN_ID || process.env.OWNER_ID || '').trim();
const CHANNEL_NAME = 'kingx-update';

function getFiles(interaction) {
  const files = [];
  for (let i = 1; i <= 10; i++) {
    const a = interaction.options.getAttachment(`anh${i}`);
    if (a) files.push(a.url);
  }
  return files;
}

function statusText(status, files, startedAt, extra = '') {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const done = status === 'Gửi thành công.' ? 1 : 0;
  return [
    '📢 **THÔNG BÁO KINGX**',
    `**Trạng thái:** ${status}`,
    `**Kênh:** #${CHANNEL_NAME}`,
    `**Tiến trình:** ${done}/1 (${done ? 100 : 0}%)`,
    done ? '████████████████████' : '░░░░░░░░░░░░░░░░░░░░',
    `🖼️ Ảnh: **${files.length}/10**`,
    `⏱️ Thời gian: **${elapsed}s**`,
    extra
  ].filter(Boolean).join('\n');
}

async function findOrCreateChannel(guild, client) {
  // Always search by name first.
  const existing = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText &&
         c.name.toLowerCase() === CHANNEL_NAME
  );
  if (existing) return { channel: existing, created: false };

  // Fetch the actual cached objects before putting them into permissionOverwrites.
  // This avoids "Supplied parameter is not a cached User or Role".
  const [botMember, ownerMember, roles] = await Promise.all([
          guild.members.fetch(client.user.id),
          guild.members.fetch(guild.ownerId),
          guild.roles.fetch()
        ]);

        const everyoneRole = roles?.everyone || null;
        const overwrites = [];

        // Có @everyone: ẩn kênh với tất cả thành viên.
        if (everyoneRole) {
          overwrites.push({
            id: everyoneRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });

          // Bot luôn được xem/gửi tin nhắn/ảnh.
          overwrites.push({
            id: botMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });

          // Server Owner được xem kênh.
          overwrites.push({
            id: ownerMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });

          // Role có Manage Server được xem kênh.
          for (const role of roles.values()) {
            if (
              role.id !== everyoneRole.id &&
              role.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
              overwrites.push({
                id: role.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              });
            }
          }
        }

        // Nếu không lấy được @everyone thì KHÔNG làm command crash:
        // tạo public channel theo yêu cầu.
        channel = await guild.channels.create({
          name: "kingx-update",
          type: ChannelType.GuildText,
          ...(overwrites.length ? { permissionOverwrites: overwrites } : {})
        });

  return { channel, created: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thongbao')
    .setDescription('Gửi thông báo vào kênh kingx-update.')
    .addStringOption(o => o.setName('noidung').setDescription('Nội dung thông báo').setRequired(true).setMaxLength(2000))
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
    if (!isOwner(interaction)) {
      return interaction.reply({
        content: "❌ Bạn không có quyền sử dụng lệnh này.",
        ephemeral: true
      });
    }

    const content = interaction.options.getString("noidung", true);
    const attachments = interaction.options.getAttachment("anh");
    const files = attachments ? [attachments] : [];

    // Thu thập tối đa 10 ảnh từ các option anh, anh2...anh10.
    for (let i = 2; i <= 10; i++) {
      const attachment = interaction.options.getAttachment(`anh${i}`);
      if (attachment) files.push(attachment);
    }

    await interaction.reply({
      content: "📢 **THÔNG BÁO KINGX**\nĐang xử lý tất cả server...",
      ephemeral: true
    });

    const startedAt = Date.now();
    const guilds = [...client.guilds.cache.values()];
    let created = 0;
    let existed = 0;
    let sent = 0;
    let failed = 0;

    const update = async (lastError = "") => {
      const done = created + existed + failed;
      const percent = guilds.length ? Math.round((done / guilds.length) * 100) : 100;
      const filled = Math.round(percent / 5);
      const bar = "█".repeat(filled) + "░".repeat(20 - filled);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);

      let status = `📢 **THÔNG BÁO KINGX**
**Trạng thái:** ${done >= guilds.length ? "Hoàn tất." : "Đang gửi..."}
**Server:** **${done}/${guilds.length}** (${percent}%)
${bar}
🆕 Tạo mới: **${created}**
♻️ Đã có: **${existed}**
✅ Gửi thành công: **${sent}**
❌ Lỗi: **${failed}**
🖼️ Ảnh: **${files.length}**
⏱️ Thời gian: **${elapsed}s**`;

      if (lastError) status += `\n\n⚠️ Lỗi gần nhất: ${lastError}`;

      try {
        await interaction.editReply({ content: status });
      } catch (_) {}
    };

    await update();

    for (const guild of guilds) {
      try {
        let channel = guild.channels.cache.find(
          c => c.type === ChannelType.GuildText && c.name === "kingx-update"
        );

        if (channel) {
          existed++;
        } else {
          // Fetch đầy đủ objects để tránh lỗi "not a cached User or Role".
          const [botMember, ownerMember, roles] = await Promise.all([
            guild.members.fetch(client.user.id),
            guild.members.fetch(guild.ownerId),
            guild.roles.fetch()
          ]);

          const everyoneRole = roles?.everyone || null;
          const overwrites = [];

          // Có @everyone => ẩn kênh với member thường.
          if (everyoneRole) {
            overwrites.push({
              id: everyoneRole.id,
              deny: [PermissionFlagsBits.ViewChannel]
            });

            // Bot luôn xem/gửi/đính kèm file.
            overwrites.push({
              id: botMember.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory
              ]
            });

            // Owner luôn xem.
            overwrites.push({
              id: ownerMember.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory
              ]
            });

            // Các role có Manage Server được xem.
            for (const role of roles.values()) {
              if (
                role.id !== everyoneRole.id &&
                role.permissions.has(PermissionFlagsBits.ManageGuild)
              ) {
                overwrites.push({
                  id: role.id,
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                  ]
                });
              }
            }
          }

          // Không có @everyone => tạo public, không crash.
          channel = await guild.channels.create({
            name: "kingx-update",
            type: ChannelType.GuildText,
            ...(overwrites.length
              ? { permissionOverwrites: overwrites }
              : {})
          });

          created++;
        }

        if (!channel.isTextBased()) {
          throw new Error("kingx-update không phải text channel");
        }

        await channel.send({
          content,
          files,
          allowedMentions: { parse: [] }
        });

        sent++;
      } catch (error) {
        failed++;
        await update(String(error?.message || error).slice(0, 180));
      }

      await update();
      // Không spam API, để Discord tự xử lý rate limit.
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    await update();
}
};
