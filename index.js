// В херне ниже убираете комментарий если на хостинге, на котором ставите этот код есть таймаут(когда при бездействии бота он отключается).
// Не забудьте импортировать все библиотеки. А, и обход таймаута не работает на Реплите.
// const keep_alive = require('./keep_alive.js/');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const mcs = require('node-mcstatus');
const token = 'BOT_TOKEN_HERE';
const bot = new TelegramBot(token, {
	polling: true
});
/* const usersInTimeout = [];

 function formatTime(ms) {
	const seconds = Math.floor(ms / 1000) % 60;
	const minutes = Math.floor(ms / (1000 * 60)) % 60;
	const hours = Math.floor(ms / (1000 * 60 * 60));
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setCooldown(userId, timeoutDelay) {
	const userInTimeout = usersInTimeout.find(user => user.userID === userId);
	if (userInTimeout) {
		const remainingTime = timeoutDelay - (Date.now() - userInTimeout.timeoutStart);
		const formattedTime = formatTime(remainingTime);
		return `🕘 Кулдаун на команду спадёт через: **${formattedTime}**`;
	}
	usersInTimeout.push({
		userID: userId,
		timeoutStart: Date.now()
	});
	setTimeout(() => {
		const index = usersInTimeout.findIndex(user => user.userID === userId);
		if (index !== -1) {
			usersInTimeout.splice(index, 1);
		}
	}, timeoutDelay);
	return null;
}*/

function loadChatServers() {
	try {
		const data = fs.readFileSync("chat_servers.json", "utf8");
		return JSON.parse(data);
	} catch (err) {
		return {};
	}
}

function saveChatServers(data) {
	fs.writeFileSync("chat_servers.json", JSON.stringify(data, null, 2));
}
bot.on('polling_error', (error) => {
	console.error('Ошибка при работе с пуллингом:', error);
});
bot.on('message', (msg) => {
	if (msg.chat.type == 'private') {
		if (msg.text == '/start') {
			/*let timeoutDelay = 1000 * 20;
			let userId = msg.from.id;
			let cooldownMessage = setCooldown(userId, timeoutDelay);
			if (cooldownMessage) {
				bot.sendMessage(msg.chat.id, cooldownMessage, {
					parse_mode: 'Markdown'
				});
				return;
			}*/
			bot.sendMessage(msg.chat.id, '👋 <b>Привет! Это бот для проверки статуса сервера!\nЭтот бот работает только в группах.\n📋 Доступные команды:</b>\n"<code>Добавить хост (айпи) (порт)</code>" - добавляет сервер в список(только для администратора).\nПример использования - "<code>Добавить хост example.com 19132</code>".\n"<code>Статус</code>" - проверяет статус сервера.\n"<code>Удалить хост</code>" - удаляет хост\(только для администратора\)', {
				parse_mode: "HTML"
			});
		} else {
			bot.sendMessage(msg.chat.id, '🔐 <b>Этот бот работает только в чатах/группах!\n📋 Доступные команды:</b>\n"<code>Добавить хост (айпи) (порт)</code>" - добавляет сервер в список(только для администратора).\nПример использования - "<code>Добавить хост example.com 19132</code>".\n"<code>Статус</code>" - проверяет статус сервера.\n"<code>Удалить хост</code>" - удаляет хост\(только для администратора\)', {
				parse_mode: "HTML"
			});
		}
	}
})
bot.onText(/Добавить хост (.+) (\d+)/i, async (msg, match) => {
	/*let timeoutDelay = 1000 * 15;
	let userId = msg.from.id;
	let cooldownMessage = setCooldown(userId, timeoutDelay);
	if (cooldownMessage) {
		bot.sendMessage(msg.chat.id, cooldownMessage, {
			parse_mode: 'Markdown'
		});
		return;
	}*/
	bot.getChatMember(msg.chat.id, msg.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			const chatServers = loadChatServers();
			const chatId = msg.chat.id;
			const host = match[1];
			const port = parseInt(match[2]);
			try {
				mcs.statusBedrock(host, port).then((result) => {
					if (result.online == true || result.online == false) {
						if (!chatServers[chatId]) {
							chatServers[chatId] = {
								host,
								port
							};
							saveChatServers(chatServers);
							bot.sendMessage(chatId, `✅ Сервер с айпи-адресом: <code>${host}</code>, и портом: <code>${port}</code> успешно добавлен!`, {
								parse_mode: "HTML"
							});
							return
						} else {
							bot.sendMessage(chatId, '❌ Этот чат уже имеет добавленный сервер!');
							return;
						}
					} else {
						bot.sendMessage(chatId, 'Сервер не найден!')
					}
				});
			} catch (error) {
				console.error('Ошибка при проверке статуса сервера:', error);
				bot.sendMessage(chatId, '❌ Произошла ошибка при проверке сервера.');
			}
		} else {
			bot.sendMessage(msg.chat.id, '🔐 Вам отказано в доступе')
		}
	});
});
bot.onText(/Статус/i, async (msg) => {
	/*let timeoutDelay = 1000 * 5;
	let userId = msg.from.id;
	let cooldownMessage = setCooldown(userId, timeoutDelay);
	if (cooldownMessage) {
		return bot.sendMessage(msg.chat.id, cooldownMessage, {
			parse_mode: 'Markdown'
		});
	}*/
	try {
		const chatId = msg.chat.id;
		const server = loadChatServers()[chatId];
		if (!server) {
			bot.sendMessage(chatId, '❌ Вы забыли добавить айпи-адрес и порт сервера!');
			return;
		}
		const host = server.host;
		const port = server.port;
		mcs.statusBedrock(host, port).then((res) => {
			if (res.online == true) {
				bot.sendMessage(chatId, `✅ Статус сервера - включен!\n📡 Айпи-адрес: <code>${host}</code>, порт: <code>${port}</code>\n👥 Игроки в сети: ${res.players.online}/${res.players.max}.`, {
					parse_mode: "HTML"
				});
			} else if (res.online == false) {
				bot.sendMessage(chatId, '❌ Сервер отключён!');
			}
		});
	} catch (error) {
		const chatId = msg.chat.id;
		console.error('Ошибка при проверке статуса сервера:', error, `\n\n🆔 Айди чата, где произошла ошибка: "${chatId}";`);
		bot.sendMessage(chatId, `❌ Произошла ошибка при проверке статуса сервера. Возможно, вы забыли добавить айпи-адрес и порт сервера.\n🆔 Айди чата(если бот не работает): "${chatId}";`);
	}
});
bot.onText(/Удалить хост/i, async (msg) => {
	/*let timeoutDelay = 1000 * 15;
	let userId = msg.from.id;
	let cooldownMessage = setCooldown(userId, timeoutDelay);
	if (cooldownMessage) {
		return bot.sendMessage(msg.chat.id, cooldownMessage, {
			parse_mode: 'Markdown'
		});
	}*/
	bot.getChatMember(msg.chat.id, msg.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			const chatId = msg.chat.id.toString();
			const chatServers = loadChatServers();
			if (!chatServers[chatId]) {
				bot.sendMessage(chatId, '❌ В этом чате нет добавленного сервера.');
				return;
			}
			delete chatServers[chatId];
			saveChatServers(chatServers);
			bot.sendMessage(chatId, '✅ Сервер успешно удалён из списка.');
		} else {
			bot.sendMessage(msg.chat.id, '🔐 Вам отказано в доступе')
		}
	});
});
bot.onText(/Помощь/i, async (msg) => {
	/*let timeoutDelay = 1000 * 60;
	let userId = msg.from.id;
	let cooldownMessage = setCooldown(userId, timeoutDelay);
	if (cooldownMessage) {
		return bot.sendMessage(msg.chat.id, cooldownMessage, {
			parse_mode: 'Markdown'
		});
	}*/
	bot.sendMessage(msg.chat.id, `📋 <b>Доступные команды:</b>\n"<code>Добавить хост (айпи) (порт)</code>" - добавляет сервер в список(только для администратора).\nПример использования - "<code>Добавить хост example.com 19132</code>".\n"<code>Статус</code>" - проверяет статус сервера.\n"<code>Удалить хост</code>" - удаляет хост(только для администратора)\n🆔 Айди чата(если бот не работает): "${msg.chat.id}";`, {
		parse_mode: "HTML"
	});
});
console.log('Бот заработал, ебать.')
