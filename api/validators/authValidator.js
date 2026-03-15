import { HTTP, PASSWORD_MIN_LEN, AVATAR_MAX_SIZE, ROLES } from '../constants/index.js';

export const validateLogin = (req, res, next) => {
  const username = (req.body?.username || '').trim();
  const password = (req.body?.password || '').trim();
  if (!username || !password)
    return res.status(HTTP.BAD_REQUEST).json({ message: 'Username and password are required' });
  req.body.username = username;
  req.body.password = password;
  next();
};

export const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(HTTP.BAD_REQUEST).json({ message: 'Both current and new password are required' });
  if (newPassword.length < PASSWORD_MIN_LEN)
    return res.status(HTTP.BAD_REQUEST).json({ message: `New password must be at least ${PASSWORD_MIN_LEN} characters` });
  next();
};

export const validateAvatar = (req, res, next) => {
  const { avatar } = req.body;
  if (!avatar)
    return res.status(HTTP.BAD_REQUEST).json({ message: 'No avatar data provided' });
  if (!avatar.startsWith('data:image/'))
    return res.status(HTTP.BAD_REQUEST).json({ message: 'Invalid image format' });
  if (avatar.length > AVATAR_MAX_SIZE)
    return res.status(HTTP.PAYLOAD_TOO_LARGE).json({ message: 'Image too large. Please use an image under 2MB.' });
  next();
};

export const validateDisplayName = (req, res, next) => {
  const { displayName } = req.body;
  if (!displayName || !displayName.trim())
    return res.status(HTTP.BAD_REQUEST).json({ message: 'displayName is required' });
  req.body.displayName = displayName.trim();
  next();
};

export const validateCreateAdmin = (req, res, next) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role))
    return res.status(HTTP.BAD_REQUEST).json({ message: "Invalid role. Must be 'Main Admin' or 'Staff Admin'" });
  next();
};

export const validateAuditLog = (req, res, next) => {
  const { action } = req.body;
  if (!action)
    return res.status(HTTP.BAD_REQUEST).json({ message: 'action is required' });
  next();
};