const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderCalculatorImage, formatNumber, formatMoney } = require('../helpers/renderHelper');

const DEFAULT_BLAZE_PRICE = 150;
const DEFAULT_BONE_PRICE = 160;
const DEFAULT_BLAZE_PER_SPAWNER = 1;
const DEFAULT_BONE_PER_SPAWNER = 2.589;
const DEFAULT_COST_PER_SPAWNER = 0;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smoker')
    .setDescription('Tính lợi nhuận Blaze + Bone theo số spawner')
    .addIntegerOption(o => o.setName('spawners').setDescription('Số lượng spawner').setRequired(true).setMinValue(1))
    .addNumberOption(o => o.setName('blaze_price').setDescription('Giá bán 1 Que Blaze (mặc định 150)').setMinValue(0))
    .addNumberOption(o => o.setName('bone_price').setDescription('Giá bán 1 Xương (mặc định 160)').setMinValue(0))
    .addNumberOption(o => o.setName('blaze_per_spawner').setDescription('Que Blaze / spawner (mặc định 1)').setMinValue(0))
    .addNumberOption(o => o.setName('bone_per_spawner').setDescription('Xương / spawner (mặc định 2.589)').setMinValue(0))
    .addNumberOption(o => o.setName('cost').setDescription('Chi phí / spawner (mặc định 0)').setMinValue(0)),

  async execute(interaction) {
    const spawners = interaction.options.getInteger('spawners', true);
    const blazePrice = interaction.options.getNumber('blaze_price') ?? DEFAULT_BLAZE_PRICE;
    const bonePrice = interaction.options.getNumber('bone_price') ?? DEFAULT_BONE_PRICE;
    const blazePerSpawner = interaction.options.getNumber('blaze_per_spawner') ?? DEFAULT_BLAZE_PER_SPAWNER;
    const bonePerSpawner = interaction.options.getNumber('bone_per_spawner') ?? DEFAULT_BONE_PER_SPAWNER;
    const costPerSpawner = interaction.options.getNumber('cost') ?? DEFAULT_COST_PER_SPAWNER;

    const blazeQty = spawners * blazePerSpawner;
    const boneQty = spawners * bonePerSpawner;
    const blazeRevenue = blazeQty * blazePrice;
    const boneRevenue = boneQty * bonePrice;
    const revenue = blazeRevenue + boneRevenue;
    const cost = spawners * costPerSpawner;
    const profit = revenue - cost;

    await interaction.deferReply();
    try {
      const image = await renderCalculatorImage({
        title: 'Máy Tính Lợi Nhuận',
        subtitle: 'Blaze + Bone • Tính theo số lượng spawner',
        background: 'stats',
        sections: [
          { title: 'Sản Xuất', rows: [
            { label: 'Spawner', value: formatNumber(spawners, 0), tone: 'gold' },
            { label: 'Que Blaze', value: formatNumber(blazeQty), tone: 'gold' },
            { label: 'Xương', value: formatNumber(boneQty), tone: 'gold' }
          ]},
          { title: 'Giá Thị Trường', rows: [
            { label: 'Giá Que Blaze', value: formatMoney(blazePrice), tone: 'gold' },
            { label: 'Giá Xương', value: formatMoney(bonePrice), tone: 'gold' },
            { label: 'Chi phí', value: formatMoney(cost), tone: cost ? 'red' : 'green' }
          ]},
          { title: 'Tóm Tắt Tài Chính', rows: [
            { label: 'Doanh Thu Blaze', value: formatMoney(blazeRevenue), tone: 'green' },
            { label: 'Doanh Thu Xương', value: formatMoney(boneRevenue), tone: 'green' },
            { label: 'Tổng Doanh Thu', value: formatMoney(revenue), tone: 'green' }
          ]}
        ],
        resultLabel: 'Lợi Nhuận',
        resultValue: formatMoney(profit),
        resultTone: profit > 0 ? 'positive' : profit < 0 ? 'negative' : 'neutral'
      });
      const attachment = new AttachmentBuilder(image, { name: 'smoker.png' });
      return interaction.editReply({ files: [attachment], embeds: [new EmbedBuilder().setImage('attachment://smoker.png').setColor('#2b2d31').setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })] });
    } catch (error) {
      console.error('[Smoker] Render lỗi:', error);
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('Máy Tính Lợi Nhuận').setDescription(`Spawner: **${formatNumber(spawners,0)}**\nDoanh thu: **${formatMoney(revenue)}**\nChi phí: **${formatMoney(cost)}**\nLợi nhuận: **${formatMoney(profit)}**`).setColor(profit >= 0 ? '#10b981' : '#ef4444').setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })] });
    }
  }
};
