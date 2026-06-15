import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación y gestión de usuarios
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: admin@inventario.com }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200:
 *         description: Token JWT y datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:  { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name, role: user.role, sucursal_id: user.sucursal_id || null },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      permissions,
      sucursal_id: user.sucursal_id || null,
    },
  });
}));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, full_name]
 *             properties:
 *               email:     { type: string, format: email }
 *               password:  { type: string, minLength: 6 }
 *               full_name: { type: string }
 *     responses:
 *       201:
 *         description: Usuario creado
 *       409:
 *         description: Email ya registrado
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
  if (existing.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const id = crypto.randomUUID();
  const normalEmail = email.toLowerCase().trim();
  await db.execute(
    'INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
    [id, normalEmail, hash, full_name]
  );

  const token = jwt.sign({ id, email: normalEmail, full_name, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email: normalEmail, full_name, role: 'user' } });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: No autenticado
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT id, email, full_name, role, permissions, sucursal_id, created_at FROM users WHERE id = ? AND deleted_at IS NULL',
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  const user = rows[0];
  // Parse permissions JSON stored as text
  user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json(user);
}));

/**
 * @swagger
 * /api/auth/reset-password-request:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Respuesta genérica (no revela si el email existe)
 */
router.post('/reset-password-request', (req, res) => {
  res.json({ message: 'Si el email existe, recibirás un enlace de restablecimiento' });
});

export default router;
