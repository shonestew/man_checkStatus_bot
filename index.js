const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const info = JSON.parse(fs.readFileSync('servers_info.json', {
    encoding: "utf-8"
}));

function saveInfo(info) {
    try {
        fs.writeFileSync("servers_info.json", JSON.stringify(info, null, 2));
    } catch (e) {
        console.log(e);
    };
};

async function isAdmin(ctx) {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;
    try {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
        console.error('Error fetching chat member:', error);
        return false;
    };
};

const bot = new Telegraf(process.env.TOKEN);

bot.command('addserver', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const args = ctx.message.text.slice(1).split(' ');
    const ip = args[1];
    const port = args[2];
    const slot = parseInt(args[3], 10) - 1;
    const adminCheck = await isAdmin(ctx);
    if (ctx.message.chat.type == 'private') return;
    if (!adminCheck) return;

    if (!info[chatId]) {
        info[chatId] = [];
    };

    if (slot < 0 || slot > 2) {
        await ctx.telegram.sendMessage(chatId, '❌ Вы указали неверный слот!');
    } else if (!ip || !port || isNaN(slot)) {
        await ctx.telegram.sendMessage(chatId, '❌ Вы не указали один из параметров!');
    } else if (info[chatId][slot]) {
        await ctx.telegram.sendMessage(chatId, '❌ В данном слоте уже записана информация об сервере!');
    } else if (isNaN(port)) {
        await ctx.telegram.sendMessage(chatId, '❌ Порт не является числом.');
    } else {
        info[chatId][slot] = {
            ip,
            port
        };
        saveInfo(info);
        ctx.telegram.sendMessage(chatId, '💾 Информация об сервере сохранена!');
    };
});

bot.command('status', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const args = ctx.message.text.slice(1).split(' ');
    const slot = parseInt(args[1], 10) - 1;
    if (slot > -1 || slot < 3) {
        let ip = info[chatId]?.[slot]?.ip;
        let port = info[chatId]?.[slot]?.port;
        let res_temp = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${ip}:${port}`)
        let res = res_temp.data;
        let stat;
        if (ctx.message.chat.type == 'private') return;

        if (!ip || !port) {
            ctx.telegram.sendMessage(chatId, '😔 В слоте №2 нету добавленного сервера.');
            return;
        };

        if (res.online === true) {
            stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`;
        } else {
            stat = 'отключён.';
        };
        await ctx.telegram.sendMessage(chatId, `🔌Состояние сервера в слоте №${slot + 1} - ${stat}`, {
            parse_mode: 'HTML'
        });
    } else if (!slot) {
        await ctx.telegram.sendMessage(chatId, 'Выберите нужый слот ниже дабы посмотреть его статус:', Markup.inlineKeyboard([
            [Markup.button.callback('Слот №1', 'serv1')],
            [Markup.button.callback('Слот №2', 'serv2')],
            [Markup.button.callback('Слот №3', 'serv3')]
        ]));
    };
});

bot.on("callback_query", async (ctx) => {
    const chatId = ctx.update.callback_query.message.chat.id;
    const callId = ctx.update.callback_query.data;

    if (callId == 'serv1') {
        let ip = info[chatId]?.[0]?.ip;
        let port = info[chatId]?.[0]?.port;
        let res_temp = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${ip}:${port}`)
        let res = res_temp.data;
        let stat;

        if (!ip || !port) {
            ctx.editMessageText('😔 В слоте №1 нету добавленного сервера.');
            return;
        };

        if (res.online === true) {
            stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
        } else {
            stat = 'отключён.'
        };
        await ctx.editMessageText(`🔌Состояние сервера в слоте №1 - ${stat}`, {
            parse_mode: 'HTML'
        });
    } else if (callId == 'serv2') {
        let ip = info[chatId]?.[1]?.ip;
        let port = info[chatId]?.[1]?.port;
        let res_temp = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${ip}:${port}`)
        let res = res_temp.data;
        let stat;

        if (!ip || !port) {
            ctx.editMessageText('😔 В слоте №2 нету добавленного сервера.');
            return;
        };

        if (res.online === true) {
            stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`;
        } else {
            stat = 'отключён.';
        };
        await ctx.editMessageText(`🔌 Состояние сервера в слоте №2 - ${stat}`, {
            parse_mode: 'HTML'
        });
    } else if (callId == 'serv3') {
        let ip = info[chatId]?.[2]?.ip;
        let port = info[chatId]?.[2]?.port;
        let res_temp = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${ip}:${port}`)
        let res = res_temp.data;
        let stat;

        if (!ip || !port) {
            ctx.editMessageText('😔 В слоте №3 нету добавленного сервера.');
            return;
        };

        if (res.online === true) {
            stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`;
        } else {
            stat = 'отключён.';
        };
        await ctx.editMessageText(`🔌Состояние сервера в слоте №3 - ${stat}`, {
            parse_mode: 'HTML'
        });
    };
});

bot.command("deleteserver", async (ctx) => {
    const chatId = ctx.message.chat.id;
    const args = ctx.message.text.slice(1).split(' ')
    const serverInfo = info;
    const slot = parseInt(args[1]) - 1;
    const adminCheck = await isAdmin(ctx);
    if (ctx.message.chat.type == 'private') return;
    if (!adminCheck) return;

    if (slot < 0 || slot > 2) {
        await ctx.telegram.sendMessage(chatId, '❌ Вы указали неверный слот!');
    } else if (!info[chatId][slot]) {
        await ctx.telegram.sendMessage(chatId, '❌ В данном слоте нету информации об сервере!');
    } else {
        delete serverInfo[chatId][slot];
        saveInfo(serverInfo);
        await ctx.telegram.sendMessage(chatId, '🗑 Информация об сервере удалена!');
    };
});

bot.command("help", async (ctx) => {
    await bot.telegram.sendMessage(ctx.message.chat.id, `📋 <b>Доступные команды:</b>\n"<code>/addserver (айпи) (порт) (слот, не больше 3)</code>" - добавляет сервер в список(только для администратора).\nПример использования - "<code>/addserver example.com 19132 1</code>".\n"<code>/status</code>"/status - высвечивает меню с слотами сервера для проверки статус сервера.\n"<code>/deleteserver (слот, не больше 3)</code>" - удаляет хост(только для администратора)\n🆔 Айди чата(если бот не работает): "${ctx.message.chat.id}";`, {
        parse_mode: "HTML"
    });
});

bot.launch();
