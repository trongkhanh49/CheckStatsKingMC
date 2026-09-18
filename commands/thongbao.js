const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const MAIN_ANNOUNCEMENT_CHANNEL_ID = "1544703241630261270";
const UPDATE_CHANNEL_NAME = "kingx-update";

function isOwner(interaction) {
  const ownerId = process.env.ADMIN_ID || process.env.OWNER_ID;
  return !!ownerId && interaction.user.id === ownerId;
}

async function getOrCreateUpdateChannel(guild, client) {
  let channel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === UPDATE_CHANNEL_NAME
  );

  if (channel) return { channel, created: false };

  // Theo logic mới: kênh ở mọi server là PUBLIC.
  // Không dùng permissionOverwrites để tránh lỗi cached User/Role.
  channel = await guild.channels.create({
    name: UPDATE_CHANNEL_NAME,
    type: ChannelType.GuildText
  });

  return { channel, created: true };
}

async function followMainAnnouncementChannel(guild, channel, client) {
  if (channel.id === MAIN_ANNOUNCEMENT_CHANNEL_ID) {
    return { ok: true, skipped: true, reason: "source-channel" };
  }

  try {
    // ID này là ID KÊNH thông báo chính, không phải ID server.
    const sourceChannel = await client.channels.fetch(
      MAIN_ANNOUNCEMENT_CHANNEL_ID,
      { force: true }
    );

    if (!sourceChannel) {
      return {
        ok: false,
        reason: `Không tìm thấy kênh thông báo chính ${MAIN_ANNOUNCEMENT_CHANNEL_ID}.`
      };
    }

    if (sourceChannel.type !== ChannelType.GuildAnnouncement) {
      return {
        ok: false,
        reason: "Kênh ID đã cấu hình không phải Announcement Channel."
      };
    }

    if (typeof sourceChannel.addFollower !== "function") {
      return {
        ok: false,
        reason: "discord.js hiện tại không hỗ trợ addFollower()."
      };
    }

    // Chỉ follow nếu kênh đích thuộc server khác.
    if (sourceChannel.guildId === guild.id) {
      return { ok: true, skipped: true, reason: "same-guild" };
    }

    await sourceChannel.addFollower(channel, UPDATE_CHANNEL_NAME);

    return {
      ok: true,
      skipped: false,
      sourceId: sourceChannel.id
    };
  } catch (error) {
    return {
      ok: false,
      reason: String(error?.message || error).slice(0, 250)
    };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("thongbao")
    .setDescription("Quản lý kênh thông báo KINGX trên tất cả server")
    .addStringOption(option =>
      option
        .setName("noidung")
        .setDescription("Nội dung thông báo")
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option
        .setName("anh")
        .setDescription("Ảnh đính kèm")
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh2").setDescription("Ảnh 2").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh3").setDescription("Ảnh 3").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh4").setDescription("Ảnh 4").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh5").setDescription("Ảnh 5").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh6").setDescription("Ảnh 6").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh7").setDescription("Ảnh 7").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh8").setDescription("Ảnh 8").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh9").setDescription("Ảnh 9").setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName("anh10").setDescription("Ảnh 10").setRequired(false)
    ),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({
        content: "❌ Bạn không có quyền sử dụng lệnh này.",
        ephemeral: true
      });
    }

    const content = interaction.options.getString("noidung", true);
    const files = [];

    for (let i = 1; i <= 10; i++) {
      const attachment = interaction.options.getAttachment(
        i === 1 ? "anh" : `anh${i}`
      );
      if (attachment) files.push(attachment);
    }

    await interaction.reply({
      content: "📢 **THÔNG BÁO KINGX**\nĐang chuẩn bị kênh thông báo...",
      ephemeral: true
    });

    const guilds = [...interaction.client.guilds.cache.values()];
    let created = 0;
    let existed = 0;
    let integrated = 0;
    let integrationFailed = 0;
    let sent = 0;
    let failed = 0;

    const update = async () => {
      const done = created + existed;
      const percent = guilds.length
        ? Math.round((done / guilds.length) * 100)
        : 100;
      const filled = Math.round(percent / 5);
      const bar =
        "█".repeat(filled) + "░".repeat(20 - filled);

      await interaction.editReply({
        content:
          `📢 **THÔNG BÁO KINGX**\n` +
          `**Trạng thái:** ${done >= guilds.length ? "Hoàn tất." : "Đang xử lý..."}\n` +
          `**Server:** **${done}/${guilds.length}** (${percent}%)\n` +
          `${bar}\n` +
          `🆕 Kênh tạo mới: **${created}**\n` +
          `♻️ Kênh đã có: **${existed}**\n` +
          `🔗 Đã tích hợp: **${integrated}**\n` +
          `⚠️ Tích hợp lỗi: **${integrationFailed}**\n` +
          `✅ Gửi thành công: **${sent}**\n` +
          `❌ Gửi lỗi: **${failed}**\n` +
          `🖼️ Ảnh: **${files.length}**`
      }).catch(() => {});
    };

    for (const guild of guilds) {
      try {
        const result = await getOrCreateUpdateChannel(
          guild,
          interaction.client
        );

        if (result.created) created++;
        else existed++;

        const integration = await followMainAnnouncementChannel(
          guild,
          result.channel,
          interaction.client
        );

        if (integration.ok) integrated++;
        else integrationFailed++;

        // /thongbao luôn gửi thông báo vào kênh của từng server.
        await result.channel.send({
          content,
          files,
          allowedMentions: { parse: [] }
        });

        sent++;
      } catch (error) {
        failed++;
      }

      await update();
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    await update();
  }
};
