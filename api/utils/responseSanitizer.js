// api/utils/responseSanitizer.js
// Helpers to return minimal safe user/admin payloads in API responses.
export const toSafeUser = (admin) => ({
  userId: admin.id ?? admin.admin_id,
  displayName: admin.display_name || admin.displayName || admin.username || admin.name,
  role: admin.role,
});

