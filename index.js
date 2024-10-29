// Импорт файла ниже нужен чтобы поднимать бота, и обходить ограничения хостингов по типу Render по времени бездействия.
const keep_alive = require('./keep_alive.js');
// Импорт нужных библиотек и фреймворков для работы бота.
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const MongoClient = require("mongodb").MongoClient;
require('dotenv').config();
// В файле ".env" надо вписать следующие параметры:
// TOKEN - токен бота,
// URL - ссылку на базу данных, типо такого: "mongodb://username:password@example.com/dbname",
// DB - название базы данных.

// Проверка на администратора, путём сравнения айди отправителя команды с айди администраторов чата/группы.
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

// Проверка статуса сервера по API mcsrvstat. Проверяется сразу на 2 изданиях, если не получилось вычислить состояние сервера по обеим изданиям - выдается false.
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

// Вход в бота и в базу данных.
const bot = new Telegraf(process.env.TOKEN);
const mdb = new MongoClient(process.env.URL);

// Добавление сервера.
bot.command('addserver', async (ctx) => {
    try {
        // Входим в базу данных.
        await mdb.connect();
        // Объявляем нужные переменные.
        const chatId = ctx.message.chat.id.toString();
        const args = ctx.message.text.slice(1).split(' ');
        const ip = args[1];
        const port = args[2];
        const slot = parseInt(args[3], 10);
        const adminCheck = await isAdmin(ctx);
        // Обращаемся в базе данных по коллекции. Если не будет коллекции с соответствующим именем - создается новая.
        const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
        const findColl = await coll.find({ chatId }).toArray();

        // Проверка на тип чата.
        if (ctx.message.chat.type === 'private') return;

        // Проверка на администратора.
        if (!adminCheck) return;

        // Если введённый слот больше 3 или меньше 1 - то это неверно указанный слот.
        if (slot < 1 || slot > 3) {
            await ctx.telegram.sendMessage(chatId, '❌ Вы указали неверный слот!');
        // Если забыли ввести айпи-адрес и порт, или слот не является числом.
        } else if (!ip || !port || isNaN(slot)) {
            await ctx.telegram.sendMessage(chatId, '❌ Вы не указали один из параметров!');
        // Если уже есть информация об сервере в введённом слоту.
        } else if (findColl.length > 0) {
            await ctx.telegram.sendMessage(chatId, '❌ В данном слоте уже записана информация об сервере!');
        // Если все условия миновали - то добавляется сервер в коллекцию.
        } else {
            // Добавляем в коллекцию JSON-файл.
            await coll.insertOne({chatId, ip, port});
            // Отправляем соообщение об успешном добавлении сервера в коллекцию.
            ctx.telegram.sendMessage(chatId, '💾 Информация об сервере сохранена!');
        };
    } catch (e) {
        // Ловим ошибки.
        console.log(e);
    } finally {
        // Закрываем подключение к базе данных.
        await mdb.close();
    };
});

// Проверка статуса по слотам.
bot.command('status', async (ctx) => {
    try {
        // Входим в базу данных.
        await mdb.connect();
        // Объявляем нужные переменные.
        const chatId = ctx.message.chat.id.toString();
        const args = ctx.message.text.slice(1).split(' ');
        const slot = parseInt(args[1], 10);
        // Обращаемся в базе данных по коллекции. Если не будет коллекции с соответствующим именем - создается новая.
        const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
        const findColl = await coll.find({ chatId }).toArray();

        // Проверка на тип чата.
        if (ctx.message.chat.type === 'private') return;

        // Если введённый слот не больше 3 или больше 1 - то это верно указанный слот.
        if (slot && slot > 1 || slot <= 3) {
            // Объявляем нужные переменные.
            const ip = findColl[0].ip;
            const port = findColl[0].port;
            // Получаем статус сервера в JSON-строке.
            const res = await serverStatus(ip, port);
            let stat;

            // Если в слоте нету сервера.
            if (findColl.length < 0) {
                await ctx.telegram.sendMessage(chatId, `😔 В слоте №${slot} нету добавленного сервера.`);
                return;
            };

            // Если сервер отключён.
            if (res.online === false || res.motd.clean == 'Offline') {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`
            // Если сервер включён.
            } else {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
            };

            // Отправляем соообщение об статусе сервера в указанном слоту.
            await ctx.telegram.sendMessage(chatId, `🔌 Состояние сервера в слоте №${slot} - ${stat}`, {
                parse_mode: 'HTML'
            });
        } else if (!slot) {
            // Отрпавляем сообщение с инлайн-кнопками слотов.
            await ctx.telegram.sendMessage(chatId, '🗂 Выберите нужный слот ниже дабы посмотреть его статус:', Markup.inlineKeyboard([
                [Markup.button.callback('📂 Слот №1', 'serv1')],
                [Markup.button.callback('📂 Слот №2', 'serv2')],
                [Markup.button.callback('📂 Слот №3', 'serv3')]
            ]));
        };
    } catch (e) {
        // Ловим ошибки.
        console.log(e);
    } finally {
        // Закрываем подключение к базе данных.
        await mdb.close();
    };
});

// Удаление сервера с коллекцию.
bot.command("deleteserver", async (ctx) => {
    try {
        // Входим в базу данных.
        await mdb.connect();
        // Объявляем нужные переменные.
        const chatId = ctx.message.chat.id.toString();
        const args = ctx.message.text.slice(1).split(' ');
        const slot = parseInt(args[1]);
        const adminCheck = await isAdmin(ctx);
        // Обращаемся в базе данных по коллекции. Если не будет коллекции с соответствующим именем - создается новая.
        const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
        const findColl = await coll.find({ chatId }).toArray();

        // Проверка на тип чата.
        if (ctx.message.chat.type === 'private') return;

        // Проверка на администратора.
        if (!adminCheck) return;

        // Если введённый слот больше 3 или меньше 1 - то это неверно указанный слот.
        if (slot < 1 || slot > 3) {
            await ctx.telegram.sendMessage(chatId, '❌ Вы указали неверный слот!');
        // Если забыли ввести айпи-адрес и порт, или слот не является числом.
        } else if (findColl.length > 1) {
            await ctx.telegram.sendMessage(chatId, '❌ В данном слоте нету информации об сервере!');
        // Если все условия миновали - то удаляем сервер из коллекции.
        } else {
            // Удаляем сервер из коллекции по айди чата.
            await coll.deleteMany({ chatId });
            // Отправляем соообщение об успешном удалении сервера из коллекции.
            await ctx.telegram.sendMessage(chatId, '🗑 Информация об сервере удалена!');
        };
    } catch (e) {
        // Ловим ошибки.
        console.log(e);
    } finally {
        // Закрываем подключение к базе данных.
        await mdb.close();
    };
});

// Помощь по командам.
bot.command("help", async (ctx) => {
    // Отправляем сообщение с инлайн-кнопками, чтобы по ним переключаться по разделу помощи.
    await ctx.telegram.sendMessage(ctx.message.chat.id, '📄 Выберите нужную команду дабы посмотреть инструкцию на него:', Markup.inlineKeyboard([
        [Markup.button.callback('🔌 /status', 'status')],
        [Markup.button.callback('💾 /addserver', 'addserver')],
        [Markup.button.callback('🗑 /deleteserver', 'deleteserver')]
    ]));
});

bot.on("callback_query", async (ctx) => {
    try {
        // Входим в базу данных.
        await mdb.connect();
        // Объявляем нужные переменные.
        const chatId = ctx.update.callback_query.message.chat.id.toString();
        const callId = ctx.update.callback_query.data;

        // Ниже реагирование на слоты.
        if (callId.startsWith('serv')) {
            // Объявляем нужные переменные.
            const slot = callId.slice(4);
            const coll = mdb.db(process.env.DB).collection(`servers${slot}`);
            const findColl = await coll.find({ chatId }).toArray();

            // Если в слоте нету сервера.
            if (findColl.length < 1) {
                await ctx.editMessageText(`😔 В слоте №${slot} нету добавленного сервера.`);
                return;
            };

            // Продолжается обьявление нужных переменных.
            const ip = findColl[0].ip;
            const port = findColl[0].port;
            // Получаем статус сервера в JSON-строке.
            const res = await serverStatus(ip, port);
            let stat;

            // Если сервер отключён.
            if (res.online === false) {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`
            // Если сервер включён.
            } else {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`
            };

            // Отправляем соообщение об статусе сервера в указанном слоту.
            await ctx.editMessageText(`🔌 Состояние сервера в слоте №${slot} - ${stat}`, {
                parse_mode: 'HTML'
            });
        // Ниже туторы на команды.
        } else if (callId === 'status') {
            await ctx.editMessageText('Команда /status выводит список слотов, в которых хранятся данные об сервере.\nАргументом можно вставить слот от 1 до 3, например: \"/status 2\".', Markup.inlineKeyboard([
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
        // Ловим ошибки.
        console.log(e);
    } finally {
        // Закрываем подключение к базе данных.
        await mdb.close();
    };
});

bot.on('inline_query', async (ctx) => {
    try {
        // Объявляем нужные переменные.
        const text = ctx.inlineQuery.query.trim().split(' ');
        const results = [];

        // Проверяем, введён ли текст в инлайн-режиме.
        if (!text[0] || !text[1]) {
            // Отправляем в массив объект, который отобразиться в инлайн-режиме.
            results.push({
                type: 'article',
                id: 'without_text',
                title: 'Проверка статуса',
                description: "Пожалуйста, введите айпи адрес и порт в формате: \"@man_checkStatus_bot play.hypixel.net 25565\".",
                input_message_content: {
                    message_text: '❌ Введите айпи адрес и порт в формате: \"<code>@man_checkStatus_bot play.hypixel.net 25565</code>\".',
                    parse_mode: 'HTML',
                },
            });
        } else {
            // Объявляем нужные переменные.
            const ip = text[0];
            const port = text[1];
            // Получаем статус сервера в JSON-строке.
            const res = await serverStatus(ip, port);
            let stat;

            // Если сервер отключён.
            if (res.online === true) {
                stat = `включён!\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>,\n👥 Игроков онлайн: ${res.players.online}/${res.players.max},\n📙 Версия: ${res.version} \n📃 Описание сервера: ${res.motd.clean}`;
            // Если сервер включён.
            } else {
                stat = `отключён.\n📘 Айпи-адрес и порт: <code>${ip}</code>/<code>${port}</code>.`;
            };

            // Отправляем в массив объект, который отобразиться в инлайн-режиме и в котором содержится информация об статусе сервера.
            results.push({
                type: 'article',
                id: 'with_text',
                title: 'Нажмите на меня!',
                description: "Нажмите на меня, чтобы узнать статус сервера!",
                input_message_content: {
                    message_text: `🔌 Состояние сервера - ${stat}`,
                    parse_mode: 'HTML',
                },
            });
        };

        // Отправляем массив с объектами в инлайн-режим.
        await ctx.answerInlineQuery(results);
    } catch (e) {
        // Ловим ошибки.
        console.log(e);
    };
});

// Запускаем бота.
bot.launch();
