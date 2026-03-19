// api/utils/responseSanitizer.js
export const toSafeUser = (admin) => ({
  userId: admin.id ?? admin.admin_id,
  displayName: admin.display_name || admin.displayName || admin.username || admin.name,
  role: admin.role,
  avatar: admin.avatar || null, // ← IDAGDAG LANG ITO
}); 