// pesir/src/utils/clientSession.js
// Session-safe client storage helpers and one-time localStorage sensitive-key migration.
const MIGRATION_FLAG = 'pesoai_sensitive_migration_v1';
const SENSITIVE_KEYS = ['token', 'currentUser', 'displayName', 'sessions', 'pesoai_sessions'];

const getLegacyDisplayNameEntries = () => {
  const entries = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('displayName_')) {
      entries.push([key, localStorage.getItem(key)]);
    }
  }
  return entries;
};

export const migrateSensitiveStorage = () => {
  if (localStorage.getItem(MIGRATION_FLAG) === 'done') return;

  const legacyCurrentUser = localStorage.getItem('currentUser');
  if (legacyCurrentUser && !sessionStorage.getItem('currentUser')) {
    sessionStorage.setItem('currentUser', legacyCurrentUser);
  }

  const legacySessions = localStorage.getItem('pesoai_sessions');
  if (legacySessions && !sessionStorage.getItem('pesoai_sessions')) {
    sessionStorage.setItem('pesoai_sessions', legacySessions);
  }

  getLegacyDisplayNameEntries().forEach(([key, value]) => {
    if (value != null && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, value);
    }
  });

  SENSITIVE_KEYS.forEach((key) => localStorage.removeItem(key));
  getLegacyDisplayNameEntries().forEach(([key]) => localStorage.removeItem(key));
  localStorage.setItem(MIGRATION_FLAG, 'done');
};

export const getCurrentUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('currentUser')) || null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user) => {
  sessionStorage.setItem('currentUser', JSON.stringify(user || {}));
};

export const clearSensitiveSessionData = () => {
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('pesoai_sessions');
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('displayName_')) sessionStorage.removeItem(key);
  });
};

