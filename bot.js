const crypto = require('crypto');
const got = require('got');

// ------------------------------------

// const APP_VERSION = '10.4.26';
// const APP_VERSION_REV = '866';
// FutuNiuniu/13.40.13408 (cn.futu.FutuTraderPhone; build:202311091951; iOS 16.4.1) Alamofire/5.6.2
const DEFAULT_USER_AGENT_APP = `Mozilla/5.0 (iPhone; CPU iPhone OS 16_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FutuNN_iPhone/13.40.13408 AppType/NiuNiu CliLang/zh-cn ClientSkinType/1 TargetLang/1.0 (sns:0) ClientFont/1.0 (im:1; nnc:1; news:1; trade:1; quote:1; other:1) RequestSource/WebView`;
// const DEFAULT_USER_AGENT_WEB = `Mozilla/5.0 (Linux; Android 10.0; Redmi Build/Redmi Note 3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36 smzdm_android_V${APP_VERSION} rv:${APP_VERSION_REV} (Redmi;Android10.0;zh) jsbv_1.0.0 webv_2.0 smzdmapp`;

// const SIGN_KEY = 'apr1$AwP!wRRT$gJ/q.X24poeBInlUJC';

// ------------------------------------

// const reVersion = /(smzdm_android_V|smzdm\s|iphone_smzdmapp\/)([\d.]+)/i;
// const reRev = /rv:([\d.]+)/i;

const randomStr = (len = 18) => {
  const char = '0123456789';
  let str = '';

  for (let i = 0; i < len; i++) {
    str += char.charAt(Math.floor(Math.random() * char.length));
  }

  return str;
};

const parseJSON = (str) => {
  try {
    return JSON.parse(str);
  }
  catch (e) {
    return {};
  }
};

const removeTags = (str) => str.replace(/<[^<]+?>/g, '');

// 添加公共参数并签名数据
// const signFormData = (data) => {
//   const newData = {
//     weixin: 1,
//     basic_v: 0,
//     f: 'android',
//     v: APP_VERSION,
//     time: `${Math.round(new Date().getTime() / 1000)}000`,
//     ...data
//   };

//   const keys = Object.keys(newData).filter(key => newData[key] !== '').sort();
//   const signData = keys.map(key => `${key}=${String(newData[key]).replace(/\s+/, '')}`).join('&');
//   const sign = crypto.createHash('md5').update(`${signData}&key=${SIGN_KEY}`).digest('hex').toUpperCase();

//   return {
//     ...newData,
//     sign
//   };
// };

// 公共请求函数
const requestApi = async (url, inputOptions = {}) => {
  const options = { ...inputOptions };

  if (!options.method) {
    options.method = 'get';
  }

  if (!options.data) {
    options.data = {};
  }

  Object.keys(options.data).forEach(key => options.data[key] === undefined && delete options.data[key]);

  // if (options.sign !== false) {
  //   options.data = signFormData(options.data);
  // }

  const gotOptions = {
    method: options.method.toUpperCase(),
    headers: options.headers,
    retry: {
      limit: 2,
      methods: [
        'GET',
        'POST'
      ],
      statusCodes: [
      ],
      errorCodes: [
        'ECONNRESET',
        'EAI_AGAIN'
      ]
    }
  };

  if (options.method === 'get') {
    gotOptions.searchParams = options.data;
  }
  else {
    gotOptions.form = options.data;
  }

  return got(url, gotOptions).then((response) => {
    const data = options.parseJSON === false ? response.body : parseJSON(response.body);

    if (options.debug) {
      console.log('------------------------');
      console.log(url);
      console.log('------------------------');
      console.log(JSON.stringify(gotOptions, null, 2));
      console.log('------------------------');
      console.log(options.parseJSON === false ? response.body : JSON.stringify(data, null, 2));
      console.log('------------------------');
    }

    return {
      isSuccess: options.parseJSON === false ? true : (data.code == '0'),
      response: options.parseJSON === false ? response.body : JSON.stringify(data, null, 2),
      data
    };
  }).catch((error) => {
    if (options.debug) {
      console.log('------------------------');
      console.log(url);
      console.log('------------------------');
      console.log(JSON.stringify(gotOptions, null, 2));
      console.log('------------------------');
      console.log(error);
      console.log('------------------------');
    }

    return {
      isSuccess: false,
      response: error,
      data: error
    };
  })
};

// const updateCookie = (cookie, name, value) => {
//   const re = new RegExp(`(^|;)${name}=[^;]+;`, 'ig');

//   return cookie.replace(re, `$1${name}=${encodeURIComponent(value)};`);
// };


const getEnvCookies = () => {
  let cookies = [];

  // 判断环境变量里面是否有 cookie
  if (process.env.FUTU_COOKIE) {
    if (process.env.FUTU_COOKIE.indexOf('&') > -1) {
      cookies = process.env.FUTU_COOKIE.split('&');
    }
    else if (process.env.FUTU_COOKIE.indexOf('\n') > -1) {
      cookies = process.env.FUTU_COOKIE.split('\n');
    }
    else {
      cookies = [process.env.FUTU_COOKIE];
    }
  }

  return cookies[0] ? cookies : false;
};

const randomDecimal = (min, max, decimal) => {
  const rand = Math.random() * (max - min + 1) + min;

  return Math.floor(rand * decimal) / decimal;
};

const wait = (minSecond, maxSecond) => {
  // 生成随机小数秒数
  const randomSecond = randomDecimal(minSecond, maxSecond, 1000);

  console.log(`等候 ${minSecond}-${maxSecond}(${randomSecond}) 秒`);

  return new Promise(resolve => setTimeout(resolve, randomSecond * 1000));
};

// ------------------------------------

class FutuBot {
  constructor(cookie) {
    this.cookie = cookie.trim();

    const match = this.cookie.match(/sess=(.*?);/);
    this.token = match ? match[1] : '';

  }

  getHeaders() {
    let userAgent = DEFAULT_USER_AGENT_APP;

    // if (process.env.SMZDM_USER_AGENT_APP) {
    //   userAgent = process.env.SMZDM_USER_AGENT_APP
    //     .replace(reVersion, `$1${APP_VERSION}`)
    //     .replace(reRev, `rv:${APP_VERSION_REV}`);
    // }

    return {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'request_key': randomStr(18),
      'User-Agent': userAgent,
      Cookie: this.androidCookie
    };
  }

  // getHeadersForWeb() {
  //   let userAgent = DEFAULT_USER_AGENT_WEB;

  //   if (process.env.SMZDM_USER_AGENT_WEB) {
  //     userAgent = process.env.SMZDM_USER_AGENT_WEB
  //       .replace(reVersion, `$1${APP_VERSION}`)
  //       .replace(reRev, `rv:${APP_VERSION_REV}`);
  //   }

  //   return {
  //     Accept: '*/*',
  //     'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
  //     'Accept-Encoding': 'gzip',
  //     'User-Agent': userAgent,
  //     Cookie: this.androidCookie
  //   };
  // }

  getOneByRandom(listing) {
    return listing[Math.floor(Math.random() * listing.length)];
  }
}

module.exports = {
  FutuBot,
  requestApi,
  removeTags,
  parseJSON,
  getEnvCookies,
  wait
};
