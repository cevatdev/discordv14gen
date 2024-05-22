const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const fs = require('fs');
const path = require('path');
const { clientId, guildId, token, premiumRoleId, freeRoleId, premiumChannelId, freeChannelId } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder()
        .setName('fgen')
        .setDescription('Bir oyun için ücretsiz hesap oluşturur.')
        .addStringOption(option =>
            option.setName('hesapismi')
                .setDescription('Oyunun adı')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('pgen')
        .setDescription('Bir oyun için premium hesap oluşturur.')
        .addStringOption(option =>
            option.setName('hesapismi')
                .setDescription('Oyunun adı')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Mevcut hesapların listesini ve miktarını gösterir.'),
    new SlashCommandBuilder()
                .setName('help')
                .setDescription('Bot komutları ve bilgileri hakkında yardım gösterir.')
        
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const cooldowns = new Map();
const { freeCooldown, premiumCooldown } = require('./config.json');

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'help') {
        // EmbedBuilder kullanarak yardım mesajı için bir embed oluştur
        const helpEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Gen Bot Yardım Menüsü')
            .setDescription('Gen Bot ile kullanabileceğiniz komutlar ve özellikler aşağıda listelenmiştir.')
            .addFields(
                { name: '/fgen', value: 'Bir oyun için ücretsiz hesap oluşturur.' },
                { name: '/pgen', value: 'Bir oyun için premium hesap oluşturur.' },
                { name: '/stock', value: 'Mevcut hesapların listesini ve miktarını gösterir.' },
                
            )
            .setFooter({ text: 'Gen Bot', iconURL: client.user.avatarURL() })
            .setURL('https://discord.gg/client')
            .setThumbnail('https://cdn.discordapp.com/attachments/1236622634477944862/1237422641489383565/1234.png')
            .setTimestamp()
            .setImage('https://cdn.discordapp.com/attachments/1236622634477944862/1237422641489383565/1234.png?ex=663b9723&is=663a45a3&hm=1210deeaff7008c67707e42b05661b3fb7d7d00ab79d5455b1d75e2da3905566&') // Reklam olarak gösterilecek resim
            .addFields(
                { name: 'GitHub', value: 'https://github.com/cevatdev/discordgenbot/tree/main', inline: true },
                { name: 'YouTube', value: 'https://www.youtube.com/@Kayasin52', inline: true },
                // Diğer sosyal medya linklerinizi buraya ekleyebilirsiniz
                
            );
            

        // Kullanıcıya embedli yardım mesajını gönder
        await interaction.reply({ embeds: [helpEmbed], ephemeral: false });
    }
    if (interaction.commandName === 'pgen') {
        const game = interaction.options.getString('hesapismi'); // Oyun adını al

        // Kullanıcının 'premium' rolüne sahip olup olmadığını kontrol et
        const hasRole = interaction.member.roles.cache.has(premiumRoleId);
        if (!hasRole) {
            return interaction.reply({ content: 'Bu komutu kullanabilmek için gerekli role sahip değilsiniz.', ephemeral: true });
        }

        // Komutun kullanıldığı kanalın doğru olup olmadığını kontrol et
        const isCorrectChannel = interaction.channelId === premiumChannelId;
        if (!isCorrectChannel) {
            return interaction.reply({ content: 'Bu komutu sadece belirli kanallarda kullanabilirsiniz.', ephemeral: true });
        }

        // Cooldown süresini hesapla
        const now = Date.now();
        const userCooldown = cooldowns.get(interaction.user.id) || 0;
        const cooldownAmount = premiumCooldown; // Premium kullanıcılar için cooldown süresi

        if (now < userCooldown) {
            const timeLeft = (userCooldown - now) / 1000;
            return interaction.reply({ content: `Bu komutu tekrar kullanabilmek için lütfen ${timeLeft.toFixed(1)} saniye bekleyin.`, ephemeral: true });
        }

        cooldowns.set(interaction.user.id, now + cooldownAmount);

        // Hesap dosyasını kontrol et ve oku
        const accountFileName = `${game}.txt`;
        const accountFilePath = path.join('./premiumstock', accountFileName);

        if (!fs.existsSync(accountFilePath)) {
            return interaction.reply({ content: 'Bu oyun için premium hesap yok.', ephemeral: true });
        }

        const accounts = fs.readFileSync(accountFilePath, 'utf-8').split('\n');
        if (accounts.length === 0 || !accounts[0]) {
            return interaction.reply({ content: 'Premium hesap yok.', ephemeral: true });
        }

        const accountToSend = accounts.shift(); // Hesabı al ve listeden çıkar
        fs.writeFileSync(accountFilePath, accounts.join('\n')); // Güncellenmiş listeyi dosyaya yaz

        // EmbedBuilder kullanarak embed oluştur
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${game.toUpperCase()} Premium Hesabı`)
            .setDescription(`\`\`\`${accountToSend}\`\`\``)
            .setURL('https://discord.gg/client')
            .setImage('https://cdn.discordapp.com/attachments/1236622634477944862/1237422641489383565/1234.png?ex=663b9723&is=663a45a3&hm=1210deeaff7008c67707e42b05661b3fb7d7d00ab79d5455b1d75e2da3905566&') // Reklam olarak gösterilecek resim
            .setFooter({ text: 'Gen Bot', iconURL: client.user.avatarURL() });

        // Kullanıcıya DM olarak embed gönder
        await interaction.user.send({ embeds: [embed] });

        // Kullanıcıya sadece onun görebileceği bir yanıt gönder
        await interaction.reply({ content: 'Premium hesap bilgileri DM yoluyla gönderildi.', ephemeral: true });
    }
    if (interaction.commandName === 'fgen') {
        const game = interaction.options.getString('hesapismi'); // Oyun adını al

        // Kullanıcının 'free' rolüne sahip olup olmadığını kontrol et
        const hasRole = interaction.member.roles.cache.has(freeRoleId);
        if (!hasRole) {
            return interaction.reply({ content: 'Bu komutu kullanabilmek için gerekli role sahip değilsiniz.', ephemeral: true });
        }

        // Komutun kullanıldığı kanalın doğru olup olmadığını kontrol et
        const isCorrectChannel = interaction.channelId === freeChannelId;
        if (!isCorrectChannel) {
            return interaction.reply({ content: 'Bu komutu sadece belirli kanallarda kullanabilirsiniz.', ephemeral: true });
        }

        // Cooldown süresini hesapla
        const now = Date.now();
        const userCooldown = cooldowns.get(interaction.user.id) || 0;
        const cooldownAmount = freeCooldown; // Free kullanıcılar için cooldown süresi

        if (now < userCooldown) {
            const timeLeft = (userCooldown - now) / 1000;
            return interaction.reply({ content: `Bu komutu tekrar kullanabilmek için lütfen ${timeLeft.toFixed(1)} saniye bekleyin.`, ephemeral: true });
        }

        cooldowns.set(interaction.user.id, now + cooldownAmount);

        // Hesap dosyasını kontrol et ve oku
        const accountFileName = `${game}.txt`;
        const accountFilePath = path.join('./freestock', accountFileName);

        if (!fs.existsSync(accountFilePath)) {
            return interaction.reply({ content: 'Bu oyun için hesap yok.', ephemeral: true });
        }

        const accounts = fs.readFileSync(accountFilePath, 'utf-8').split('\n');
        if (accounts.length === 0 || !accounts[0]) {
            return interaction.reply({ content: 'Hesap yok.', ephemeral: true });
        }

        const accountToSend = accounts.shift(); // Hesabı al ve listeden çıkar
        fs.writeFileSync(accountFilePath, accounts.join('\n')); // Güncellenmiş listeyi dosyaya yaz

        // EmbedBuilder kullanarak embed oluştur
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${game.toUpperCase()} Hesabı`)
            .setDescription(`\`\`\`${accountToSend}\`\`\``)
            .setURL('https://discord.gg/client')
            .setImage('https://cdn.discordapp.com/attachments/1236622634477944862/1237422641489383565/1234.png?ex=663b9723&is=663a45a3&hm=1210deeaff7008c67707e42b05661b3fb7d7d00ab79d5455b1d75e2da3905566&') // Reklam olarak gösterilecek resim
            .setFooter({ text: 'Gen Bot', iconURL: client.user.avatarURL() });

        // Kullanıcıya DM olarak embed gönder
        await interaction.user.send({ embeds: [embed] });

        // Kullanıcıya sadece onun görebileceği bir yanıt gönder
        await interaction.reply({ content: 'Hesap bilgileri DM yoluyla gönderildi.', ephemeral: true });
    } else if (interaction.commandName === 'pgen') {
        const game = interaction.options.getString('hesapismi'); // Oyun adını al
} else if (interaction.commandName === 'stock') {
    const stockFolder = interaction.member.roles.cache.has(premiumRoleId) ? './premiumstock' : './freestock';
    const accountFiles = fs.readdirSync(stockFolder);
    let stockList = '';

    for (const file of accountFiles) {
        const accounts = fs.readFileSync(path.join(stockFolder, file), 'utf-8').split('\n').filter(Boolean);
        stockList += `**${file.replace('.txt', '')}:** ${accounts.length} hesap\n`;
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Stoktaki Hesaplar')
        .setDescription(stockList)
        .setFooter({ text: 'Gen Bot', iconURL: client.user.avatarURL() });

    await interaction.reply({ embeds: [embed], ephemeral: false });
}
});

client.login(token);
