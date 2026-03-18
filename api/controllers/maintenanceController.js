let maintenanceState = {
  active: false,
  endsAt: null,
  updatedAt: null,
};

export const getMaintenance = (_req, res) => {
  res.json(maintenanceState);
};

export const setMaintenance = (req, res) => {
  const { active, endsAt } = req.body || {};
  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active must be boolean' });
  }
  const safeEndsAt = active ? (Number.isFinite(Number(endsAt)) ? Number(endsAt) : null) : null;
  maintenanceState = {
    active,
    endsAt: safeEndsAt,
    updatedAt: new Date().toISOString(),
  };
  res.json(maintenanceState);
};

