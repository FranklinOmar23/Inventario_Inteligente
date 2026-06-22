export const authController = (service) => ({
  login: async (req, res) => {
    const data = await service.login(req.body.email, req.body.password);
    res.json(data);
  },

  register: async (req, res) => {
    // Kept for legacy compatibility; setup-tenant is the primary onboarding path
    res.status(410).json({ error: 'Usa /setup-tenant para registrarse' });
  },

  setupTenant: async (req, res) => {
    const data = await service.setupTenant(req.body);
    res.status(201).json(data);
  },

  me: async (req, res) => {
    const user = await service.getMe(req.user.id);
    res.json(user);
  },

  changePassword: async (req, res) => {
    await service.changePassword(req.user.id, req.body.current_password, req.body.new_password);
    res.json({ ok: true });
  },

  resetPasswordRequest: (_req, res) => {
    res.json({ message: 'Si el email existe, recibirás un enlace de restablecimiento' });
  },
});
