// Проверка на администратора, путём сравнения айди отправителя команды с айди администраторов чата/группы.
async function isAdmin(ctx) {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;
    try {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
        console.error('Проблемы при проверке айди на администратора чата/группы:', error);
        return false;
    };
};

// Проверка статуса сервера по API mcsrvstat. Проверяется сразу на 2 изданиях, если не получилось вычислить состояние сервера по обеим изданиям - выдается false.
async function serverStatus(ip, port) {
    try {
        const res_java = await (await axios.get(`http://api.mcsrvstat.us/3/${ip}:${port}`)).data;
        const res_be = await (await axios.get(`http://api.mcsrvstat.us/bedrock/3/${ip}:${port}`)).data;
        if (res_be.online === true) {
            return res_be;
        } else if (res_java.online === true) {
            return res_java;
        } else {
            return false;
        };
    } catch (e) {
        console.log('Ошибка при попытке посмотреть статуса сервера:', e);
    };
};

module.exports = { isAdmin, serverStatus };