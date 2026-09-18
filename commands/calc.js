const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderCalculatorImage, formatNumber, formatMoney } = require('../helpers/renderHelper');

const DEFAULT_BONE_PER_SPAWNER = 2.589;
const DEFAULT_BONE_PRICE = 160;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Máy tính sản lượng spawner')
    .addSubcommand(sub => sub
      .setName('spawners')
      .setDescription('Tính sản lượng xương từ spawner')
      .addIntegerOption(o => o.setName('amount').setDescription('Tổng số spawner').setRequired(true).setMinValue(1))
      .addNumberOption(o => o.setName('bone_per_spawner').setDescription('Xương / spawner (mặc định 2.589)').setMinValue(0))
      .addNumberOption(o => o.setName('bone_price').setDescription('Giá 1 xương (mặc định 160)').setMinValue(0))
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);
    const bonePerSpawner = interaction.options.getNumber('bone_per_spawner') ?? DEFAULT_BONE_PER_SPAWNER;
    const bonePrice = interaction.options.getNumber('bone_price') ?? DEFAULT_BONE_PRICE;
    const boneQty = amount * bonePerSpawner;
    const revenue = boneQty * bonePrice;

    await interaction.deferReply();
    try {
      const image = await renderCalculatorImage({
        title: 'Máy Tính Xương',
        subtitle: 'Tính sản lượng từ hệ thống spawner',
        background: 'market',
        sections: [
          { title: 'Thông Số Spawner', rows: [
            { label: 'Tổng Số Spawner', value: formatNumber(amount, 0), tone: 'gold' },
            { label: 'Đồng', value: formatNumber(amount, 0), tone: 'gold' },
            { label: 'Spawner / Đồng', value: '1', tone: 'gold' }
          ]},
          { title: 'Sản Lượng', rows: [
            { label: 'Xương / Spawner', value: formatNumber(bonePerSpawner, 3), tone: 'gold' },
            { label: 'Xương Thu Được', value: formatNumber(boneQty, 0), tone: 'green' },
            { label: 'Giá 1 Xương', value: formatMoney(bonePrice), tone: 'gold' }
          ]}
        ],
        resultLabel: 'Doanh Thu Xương',
        resultValue: formatMoney(revenue),
        resultTone: revenue > 0 ? 'positive' : 'neutral'
      });
      const attachment = new AttachmentBuilder(image, { name: 'calc-spawners.png' });
      return interaction.editReply({ files: [attachment], embeds: [new EmbedBuilder().setImage('attachment://calc-spawners.png').setColor('#2b2d31').setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })] });
    } catch (error) {
      console.error('[Calc Spawners] Render lỗi:', error);
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('Máy Tính Xương').setDescription(`Spawner: **${formatNumber(amount,0)}**\nXương: **${formatNumber(boneQty,0)}**\nDoanh thu: **${formatMoney(revenue)}**`).setColor('#10b981').setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })] });
    }
  }
};
