import { doubleCsrf } from 'csrf-csrf';

const doubleCsrfOptions = {
  getSecret: () => process.env.CSRF_SECRET || 'csrf-super-secret-token-its-secret-for-csrf',
  getSessionIdentifier: () => 'stateless-id',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: false,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.NODE_ENV === 'production' ? '.spotzlabs.site' : undefined,
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
};

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf(doubleCsrfOptions);

export { generateCsrfToken, doubleCsrfProtection };
