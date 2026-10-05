const { ensureSessionIdentity, readSessionId, SESSION_COOKIE } = require('./sessionIdentity');

function responseRecorder() {
  const headers = new Map();
  return {
    getHeader: (name) => headers.get(name),
    setHeader: (name, value) => headers.set(name, value),
    headers,
  };
}

test('crea sesiones HttpOnly distintas y recupera cada identidad firmada', () => {
  const firstResponse = responseRecorder();
  const secondResponse = responseRecorder();
  const firstRequest = { headers: {} };
  const secondRequest = { headers: {} };

  ensureSessionIdentity(firstRequest, firstResponse, () => {});
  ensureSessionIdentity(secondRequest, secondResponse, () => {});
  expect(firstRequest.devgotchiSessionId).not.toBe(secondRequest.devgotchiSessionId);

  const cookie = firstResponse.headers.get('Set-Cookie')[0];
  expect(cookie).toContain(`${SESSION_COOKIE}=`);
  expect(cookie).toContain('HttpOnly');
  expect(readSessionId(cookie)).toBe(firstRequest.devgotchiSessionId);
});

test('rechaza una cookie manipulada', () => {
  expect(readSessionId(`${SESSION_COOKIE}=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.invalid`)).toBeNull();
});
