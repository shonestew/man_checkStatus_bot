// Импорт файла ниже нужен чтобы поднимать бота, и обходить ограничения хостингов по типу Render по времени бездействия.
const keep_alive = require('./keep_alive.js');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const MongoClient = require("mongodb").MongoClient;
require('dotenv').config();

async function isAdmin(ctx) {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;
    try {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
        console.error('проблемки при проверке на админа:', error);
        return false;
    };
};

async function serverStatus(ip, port) {
    try {
        const res_java = await (await axios.get(`http://api.mcsrvstat.us/3/${ip}:${port}`)).data;
        const res_be = await (await axios.get(`http://api.mcsrvstat.us/bedrock/3/${ip}:${port}`)).data;
        if (res_java.online === true) {
            return res_java;
        } else if (res_be.online === true) {
            return res_be;
        } else {
            return false;
        };
    } catch (e) {
        console.log(e);
    };
};

const bot = new Telegraf(process.env.TOKEN);

const mdb = new MongoClient(process.env.URL);

bot.command('addserver', async (ctx) => {
    try {
        await mdb.connect();
        const chatId = ctx.message.chat.id.toString();
        const args = ctx.message.text.slice(1).split(' ');
        const ip = args[1];
        const port = args[2];
        const slot = parseInt(args[3], 10);
        const adminCheck = await isAdmin(ctx);
        const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
        const findColl = await coll.find({ chatId }).toArray();

        if (ctx.message.chat.type === 'private') return;

        if (!adminCheck) return;

        if (slot < 1 || slot > 3) {
            await ctx.telegram.sendMessage(chatId, '❌ Вы указали неверный слот!');
        } else if (!ip || !port || isNaN(slot)) {
            await ctx.telegram.sendMessage(chatId, '❌ Вы не указали один из параметров!');
        } else if (findColl.length >= 1) {
            await ctx.telegram.sendMessage(chatId, '❌ В данном слоте уже записана информация об сервере!');
        } else {
            await coll.insertOne({chatId, ip, port});
            ctx.telegram.sendMessage(chatId, '💾 Информация об сервере сохранена!');
        };
    } catch (e) {
        console.log(e);
    } finally {
        await mdb.close();
    };
});

bot.command('status', async (ctx) => {
    try {
        await mdb.connect();
        const chatId = ctx.message.chat.id.toString();
        const args = ctx.message.text.slice(1).split(' ');
        const slot = parseInt(args[1], 10);
        const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
        const findColl = await coll.find({ chatId }).toArray();

        if (ctx.message.chat.type === 'private') return;

        if (slot > -1 || slot < 3) {
            const ip = findColl[0].ip;
            const port = findColl[0].port;
            const res = await serverStatus(ip, port);
            let stat;

            if (!ip || !port) {
                ctx.editMessageText(`😔 В слоте №${slot} нету добавленного сервера.`);
                return;
            };

            if (res.online === false) {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`
            } else {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
            };

            await ctx.telegram.sendMessage(chatId, `🔌 Состояние сервера в слоте №${slot} - ${stat}`, {
                parse_mode: 'HTML'
            });
        } else if (!slot) {
            await ctx.telegram.sendMessage(chatId, '🗂 Выберите нужный слот ниже дабы посмотреть его статус:', Markup.inlineKeyboard([
                [Markup.button.callback('📂 Слот №1', 'serv1')],
                [Markup.button.callback('📂 Слот №2', 'serv2')],
                [Markup.button.callback('📂 Слот №3', 'serv3')]
            ]));
        };
    } catch (e) {
        console.log(e);
    } finally {
        await mdb.close();
    };
});

bot.command("deleteserver", async (ctx) => {
    try {
        await mdb.connect();
        const chatId = ctx.message.chat.id.toString();
        const args = ctx.message.text.slice(1).split(' ');
        const slot = parseInt(args[1]);
        const adminCheck = await isAdmin(ctx);
        const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
        const findColl = await coll.find({ chatId }).toArray();

        if (ctx.message.chat.type === 'private') return;

        if (!adminCheck) return;

        if (isNaN(slot) || slot < 1 || slot > 3) {
            await ctx.telegram.sendMessage(chatId, '❌ Вы указали неверный слот!');
        } else if (findColl.length > 1) {
            await ctx.telegram.sendMessage(chatId, '❌ В данном слоте нету информации об сервере!');
        } else {
            await coll.deleteMany({ chatId });
            await ctx.telegram.sendMessage(chatId, '🗑 Информация об сервере удалена!');
        };
    } catch (e) {
        console.log(e);
    } finally {
        await mdb.close();
    };
});

bot.command("help", async (ctx) => {
    await ctx.telegram.sendMessage(ctx.message.chat.id, '📄 Выберите нужную команду дабы посмотреть инструкцию на него:', Markup.inlineKeyboard([
        [Markup.button.callback('🔌 /status', 'status')],
        [Markup.button.callback('💾 /addserver', 'addserver')],
        [Markup.button.callback('🗑 /deleteserver', 'deleteserver')]
    ]));
});

bot.on("callback_query", async (ctx) => {
    try {
        await mdb.connect();
        const chatId = ctx.update.callback_query.message.chat.id.toString();
        const callId = ctx.update.callback_query.data;

        // Ниже реагирование на слоты.
        if (callId === 'serv1') {
            const coll = mdb.db(process.env.DB).collection('servers1');
            const findColl = await coll.find({ chatId }).toArray();

            if (!findColl[0].ip && !findColl[0].port) {
                await ctx.editMessageText('😔 В слоте №1 нету добавленного сервера.');
            };

            const ip = findColl[0].ip;
            const port = findColl[0].port;
            const res = await serverStatus(ip, port);
            let stat;

            if (res.online === false) {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`
            } else {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
            };

            await ctx.editMessageText(`🔌 Состояние сервера в слоте №1 - ${stat}`, {
                parse_mode: 'HTML'
            });
        } else if (callId === 'serv2') {
            const coll = mdb.db(process.env.DB).collection('servers2');
            const findColl = await coll.find({ chatId }).toArray();

            if (!findColl[0].ip && !findColl[0].port) {
                await ctx.editMessageText('😔 В слоте №2 нету добавленного сервера.');
            };

            const ip = findColl[0].ip;
            const port = findColl[0].port;
            const res = await serverStatus(ip, port);
            let stat;

            if (res.online === false) {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`
            } else {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
            };

            await ctx.editMessageText(`🔌 Состояние сервера в слоте №2 - ${stat}`, {
                parse_mode: 'HTML'
            });
        } else if (callId === 'serv3') {
            const coll = mdb.db(process.env.DB).collection('servers3');
            const findColl = await coll.find({ chatId }).toArray();

            if (!findColl[0].ip && !findColl[0].port) {
                await ctx.editMessageText('😔 В слоте №3 нету добавленного сервера.');
            };

            const ip = findColl[0].ip;
            const port = findColl[0].port;
            const res = await serverStatus(ip, port);
            let stat;

            if (res.online === false) {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`
            } else {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
            };

            await ctx.editMessageText(`🔌 Состояние сервера в слоте №3 - ${stat}`, {
                parse_mode: 'HTML'
            });
        // Ниже туторы на команды.
        } else if (callId === 'status') {
            await ctx.editMessageText('Команда \/status выводит список слотов, в которых хранятся данные об сервере.\nАргументом можно вставить слот от 1 до 3, например: \"/status 2\".', Markup.inlineKeyboard([
                [Markup.button.callback('💾 /addserver', 'addserver')],
                [Markup.button.callback('🗑 /deleteserver', 'deleteserver')],
                [Markup.button.callback('🔙 Назад', 'back')],
            ]));
        } else if (callId === 'addserver') {
            await ctx.editMessageText('Команда /addserver добавляет новый сервер в указанный слот.\nИспользование: /addserver \<ip> \<port> \<slot>.\nПример использования: /addserver play.hypixel.net 25565 1.', Markup.inlineKeyboard([
                [Markup.button.callback('🔌 /status', 'status')],
                [Markup.button.callback('🗑 /deleteserver', 'deleteserver')],
                [Markup.button.callback('🔙 Назад', 'back')],
            ]));
        } else if (callId === 'deleteserver') {
            await ctx.editMessageText('Команда /deleteserver удаляет айпи-адрес и порт сервера в указанном слоту.\nАргументом можно вставить слот от 1 до 3, например: \"/deleteserver 3\".', Markup.inlineKeyboard([
                [Markup.button.callback('🔌 /status', 'status')],
                [Markup.button.callback('💾 /addserver', 'addserver')],
                [Markup.button.callback('🔙 Назад', 'back')],
            ]));
        } else if (callId === 'back') {
            await ctx.editMessageText('📄 Выберите нужную команду дабы посмотреть инструкцию на него:', Markup.inlineKeyboard([
                [Markup.button.callback('🔌 /status', 'status')],
                [Markup.button.callback('💾 /addserver', 'addserver')],
                [Markup.button.callback('🗑 /deleteserver', 'deleteserver')]
            ]));
        }
    } catch (e) {
        console.log(e);
    } finally {
        await mdb.close();
    };
});

bot.on('inline_query', async (ctx) => {
    try {
        const text = ctx.inlineQuery.query.trim().split(' ');
        const results = [];

        if (text.length < 0) {
            results.push({
                type: 'article',
                id: 'without_text',
                title: 'Проверка статуса',
                description: "Пожалуйста, введите айпи адрес и порт в формате: \"@username example.com 19132\".",
                input_message_content: {
                    message_text: '❌ Введите айпи адрес и порт в формате: \"@username example.com 19132\".',
                },
            });
        } else {
            const ip = text[0];
            const port = text[1];
            const res = await serverStatus(ip, port);
            let stat;

            if (res.online === true) {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`;
            } else {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`;
            };

            results.push({
                type: 'article',
                id: 'with_text',
                title: 'Нажмите на меня!',
                description: "Нажми на меня, чтобы узнать статус сервера!",
                input_message_content: {
                    message_text: `🔌 Состояние сервера - ${stat}`,
                    parse_mode: 'HTML',
                },
            });
        };

        await ctx.answerInlineQuery(results);
    } catch (e) {
        console.log(e);
    };
});

bot.launch();
