const { TOKEN } = process.env;

export const client = require('axios').create({
  baseURL: 'https://api.zeit.co/',
  headers: {
    Authorization: 'Bearer ' + TOKEN,
    'Content-Type': 'application/json;charset=UTF-8'
  }
});

export async function get(url, params) {
  const result = await client.get(url, { params });
  return result;
}

export async function post(url, body, params) {
  const result = await client.post(url, body, { params });
  return result;
}

export async function put(url, body, params) {
  const result = await client.put(url, body, { params });
  return result;
}

export async function del(url, body, params) {
  const result = await client.delete(url,{ params });
  return result;
}
