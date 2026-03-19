// api/utils/cookieAuth.js
// Cookie helpers for access/refresh tokens and secure defaults.
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  COOKIE_SECURE,
  COOKIE_SAME_SITE,
} from '../config/index.js';

const baseCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SAME_SITE,
  path: '/',
};

export const setAccessCookie = (res, token) => {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });
};

export const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
};

