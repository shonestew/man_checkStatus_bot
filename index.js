const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const mcs = require('node-mcstatus');
const token = '7380107503:AAFbPffkeyIvkxOqSfGCWL2IgS9YE_U0R9U'
const bot = new TelegramBot(token, {
	polling: true
});
const chatServersFile = 'chat_servers.json';

function loadChatServers() {
	try {
		const data = fs.readFileSync(chatServersFile);
		return JSON.parse(data);
	} catch (err) {
		console.error('Ошибка загрузки данных серверов чатов:', err);
		return {};
	}
}

function saveChatServers(data) {
	fs.writeFileSync(chatServersFile, JSON.stringify(data, null, 2));
}
bot.on('polling_error', (error) => {
	console.error('Ошибка при работе с пуллингом:', error);
});
bot.on('message', (msg) => {
	if (msg.chat.type == 'private') {
		bot.sendMessage(msg.chat.id, '🔐 Этот бот работает только в чатах/группах!\n📋 Доступные команды:\n"Добавить хост (айпи) (порт)" - добавляет сервер в список(только для администратора).\nПример использования - "Добавить хост example.com 19132".\n"Сервер онлайн?" - проверяет статус сервера.\n"Удалить хост" - удаляет хост(только для администратора)')
	}
})
bot.onText(/Добавить хост (.+) (\d+)/, async (msg, match) => {
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
							chatServers[chatId] = [];
							chatServers[chatId] = {
								host,
								port
							};
							saveChatServers(chatServers);
							bot.sendMessage(chatId, `✅ Сервер с айпи-адресом: ${host}, и портом: ${port} успешно добавлен!`);
							return;
						} else {
							bot.sendMessage(chatId, '❌ Этот чат уже имеет добавленный сервер!');
							return;
						}
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
bot.onText(/Статус/, async (msg) => {
const chatServers = loadChatServers();
const chatId = msg.chat.id.toString();
if (!chatServers[chatId]) {
	bot.sendMessage(chatId, '❌ Вы забыли добавить IP-адрес и порт сервера!');
	return;
}
const {
	host,
	port
} = chatServers[chatId];
try {
	mcs.statusBedrock(host, port).then((res) => {
		if (res.online == true) {
			bot.sendMessage(chatId, `✅ Статус сервера - включен!\n📡 Айпи-адрес: ${host}, порт: ${port}\n👥 Игроки в сети: ${res.players.online}/${res.players.max}.`);
		} else {
			bot.sendMessage(chatId, '❌ Сервер отключён!');
		}
	});
} catch (error) {
	console.error('Ошибка при проверке статуса сервера:', error);
	bot.sendMessage(chatId, '❌ Произошла ошибка при проверке статуса сервера.');
}
});
});
bot.onText(/Удалить хост/, async (msg) => {
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
bot.onText(/Помощь/, async (msg) => {
	bot.sendMessage(msg.chat.id, '📋 Доступные команды:\n"Добавить хост (айпи) (порт)" - добавляет сервер в список(только для администратора).\nПример использования - "Добавить хост example.com 19132".\n"Сервер онлайн?" - проверяет статус сервера.\n"Удалить хост" - удаляет хост(только для администратора)')
});
console.log('Бот заработал, ебать.')
