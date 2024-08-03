const mcs = require('node-mcstatus');

const keep_alive = require('./keep_alive.js')

const TelegramApi = require('node-telegram-bot-api')

const token = '7233504029:AAHL9lUjlZXDOyZU8xt5_RL23i2bMX6fhzI'

const bot = new TelegramApi(token, {polling: true})

const host = 'europe_rp.aternos.me'
const port = '34331'

bot.on("polling_error", console.log);
bot.on('message', (msg) => {
  if (msg.text == 'Когда хост?' || msg.text == 'Когда хост') {
    bot.sendMessage(msg.chat.id, '🗓 Расписание хостов:\nПонедельник - Хост 15:00 (КЗ). Хост 21:00 (КЗ)\nВторник - Хост 15:00 (КЗ)\nСреда - Хост (Отсутствует)\nЧетверг - Хост 15:00 (КЗ)\nПятница - Хост 15:00 (КЗ), Хост 20:00 (КЗ)\nСуббота - В любое время может быть.\nВоскресенье - В любое Время Может быть.')
  };
  if (msg.text == 'Сервер онлайн?') {
    mcs.statusBedrock(host, port).then((result) => {
      if (result.online == false) {
        bot.sendMessage(msg.chat.id, '❌ Сервер отключен!');
      };
      if (result.online == true)  {
        bot.sendMessage(msg.chat.id, `✅ Статус сервера - включен\n👩‍👧‍👦 Игроков онлайн: ${result.players.online}/${result.players.max}\n📘 Версия: ${result.version.name}.`);
      };
    });
  };
});
