/*
futu 签到脚本
项目地址: https://github.com/851590063/ql-scripts

cron: 10 8 * * *
*/

const Env = require('./env');
const { FutuBot, requestApi, getEnvCookies, wait } = require('./bot');
const notify = require('./sendNotify');
const CryptoJS = require('crypto-js');

// ------------------------------------

const $ = new Env('futu 签到');

class FutuCheckinBot extends FutuBot {
  constructor(cookie, sk) {
    super(cookie);

    this.sk = sk ? sk.trim() : '';
  }

  async run() {
    const { msg: msg1 } = await this.checkin();

    return `${msg1}`;
  }

  async checkin() {
    const { isSuccess, data, response } = await requestApi('https://mobile.futunn.com/credits-v2-api/get-sign-info', {
      method: 'get',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      let msg = `⭐累计签到: ${data.total_sign_in_days}天
      ⭐最大签到: ${data.max_sign_in_days}天
      ⭐连续签到: ${data.continue_sign_in_days}天
      🏅积分: ${data.today_score}
      🏅明日积分: ${data.tomorrow_score}`;

      await wait(3, 10);

      $.log(`${msg}\n`);

      return {
        isSuccess,
        msg: `${msg}\n\n`
      };
    } else {
      $.log(`签到失败！${response}`);

      return {
        isSuccess,
        msg: '签到失败！'
      };
    }
  }

}

function random32() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';

  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

function getSk(cookie) {
  const matchUserId = cookie.match(/uid=([^;]*)/);

  if (!matchUserId) {
    return ''
  }

  const userId = matchUserId[1];
  const deviceId = getDeviceId(cookie);
 

  return userId;
}

function getDeviceId(cookie) {
  const matchDeviceId = cookie.match(/device_id=([^;]*)/);

  if (matchDeviceId) {
    return matchDeviceId[1];
  }

  return random32();
}

!(async () => {
  const cookies = getEnvCookies();

  if (cookies === false) {
    $.log('\n请先设置 FUTU_COOKIE 环境变量');

    return;
  }

  let sks = [];

  if (process.env.SMZDM_SK) {
    if (process.env.SMZDM_SK.indexOf('&') > -1) {
      sks = process.env.SMZDM_SK.split('&');
    }
    else if (process.env.SMZDM_SK.indexOf('\n') > -1) {
      sks = process.env.SMZDM_SK.split('\n');
    }
    else {
      sks = [process.env.SMZDM_SK];
    }
  }

  let notifyContent = '';

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];

    if (!cookie) {
      continue;
    }

    let sk = sks[i];
    if (!sk) {
      sk = getSk(cookie)
    }

    if (i > 0) {
      await wait(10, 30);
    }

    const sep = `\n****** 账号${i + 1} ******\n`;

    $.log(sep);

    const bot = new FutuCheckinBot(cookie, sk);
    const msg = await bot.run();

    notifyContent += sep + msg + '\n';
  }

  $.log();

  await notify.sendNotify($.name, notifyContent);
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
});
