import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT) || 4000;
const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is unset; sessions will expire when the server restarts.');
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:4173').split(',').map((item) => item.trim());
const clientOrigins = [...configuredOrigins, process.env.RENDER_EXTERNAL_URL].filter(Boolean);
const defaultSettings = {
  monthlyBudget: 3200,
  budgets: { Food: 500, Shopping: 420, Transport: 240, Education: 300, Entertainment: 180, Healthcare: 220, Bills: 900, Travel: 500, Other: 200 },
  categories: ['Food', 'Shopping', 'Transport', 'Education', 'Entertainment', 'Healthcare', 'Bills', 'Travel', 'Other'],
  goals: [],
  profile: { name: '', email: '' },
};

const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, maxlength: 100 },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, required: true, maxlength: 40 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  paymentMethod: { type: String, required: true, maxlength: 40 },
  description: { type: String, default: '', maxlength: 500 },
  type: { type: String, enum: ['income', 'expense'], required: true },
}, { _id: false });
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  transactions: { type: [transactionSchema], default: [] },
  settings: { type: mongoose.Schema.Types.Mixed, default: () => structuredClone(defaultSettings) },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

app.use(cors({ origin(origin, done) {
  if (!origin || clientOrigins.includes(origin)) return done(null, true);
  return done(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '100kb' }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const databaseReady = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database is not connected. Configure MONGODB_URI to enable account storage.' });
  next();
};
const authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Sign in to continue.' });
  try { req.userId = jwt.verify(token, jwtSecret).sub; next(); }
  catch { return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' }); }
};
const protectedRoute = [databaseReady, authenticate];
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const issueToken = (user) => jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));
app.post('/api/auth/register', databaseReady, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 100) return res.status(400).json({ error: 'Password must be between 8 and 100 characters.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({ name, email, passwordHash, settings: { ...structuredClone(defaultSettings), profile: { name, email } } });
    return res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
}));
app.post('/api/auth/login', databaseReady, asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  return res.json({ token: issueToken(user), user: publicUser(user) });
}));
app.get('/api/auth/me', ...protectedRoute, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
  return res.json({ user: publicUser(user) });
}));
app.get('/api/data', ...protectedRoute, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  return res.json({ transactions: user.transactions, settings: user.settings });
}));
app.get('/api/transactions', ...protectedRoute, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId).select('transactions');
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  return res.json(user.transactions);
}));
app.post('/api/transactions', ...protectedRoute, asyncRoute(async (req, res) => {
  const transaction = normalizeTransaction(req.body);
  if (!transaction) return res.status(400).json({ error: 'Enter a valid transaction with an amount greater than zero.' });
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.transactions.unshift(transaction);
  await user.save();
  return res.status(201).json(transaction);
}));
app.put('/api/transactions/:id', ...protectedRoute, asyncRoute(async (req, res) => {
  const transaction = normalizeTransaction({ ...req.body, id: req.params.id });
  if (!transaction) return res.status(400).json({ error: 'Enter a valid transaction with an amount greater than zero.' });
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const index = user.transactions.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Transaction not found.' });
  user.transactions.set(index, transaction);
  await user.save();
  return res.json(transaction);
}));
app.delete('/api/transactions/:id', ...protectedRoute, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const before = user.transactions.length;
  user.transactions = user.transactions.filter((item) => item.id !== req.params.id);
  if (user.transactions.length === before) return res.status(404).json({ error: 'Transaction not found.' });
  await user.save();
  return res.json({ ok: true });
}));
app.put('/api/settings', ...protectedRoute, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const input = req.body || {};
  const current = user.settings || structuredClone(defaultSettings);
  const categories = Array.isArray(input.categories) ? [...new Set(input.categories.map((value) => String(value).trim()).filter((value) => value && value.length <= 40))].slice(0, 40) : current.categories;
  const goals = Array.isArray(input.goals) ? input.goals.slice(0, 20).map((goal) => ({ id: String(goal.id || randomBytes(8).toString('hex')), name: String(goal.name || '').trim().slice(0, 80), target: Math.max(0, Number(goal.target) || 0), saved: Math.max(0, Number(goal.saved) || 0), color: /^#[\da-f]{6}$/i.test(goal.color || '') ? goal.color : '#9b8cff' })) : current.goals;
  const budgets = input.budgets && typeof input.budgets === 'object' && !Array.isArray(input.budgets)
    ? Object.fromEntries(Object.entries(input.budgets).slice(0, 40).map(([key, value]) => [String(key).slice(0, 40), Math.max(0, Number(value) || 0)]))
    : current.budgets;
  user.settings = {
    ...current,
    monthlyBudget: Math.max(0, Number(input.monthlyBudget ?? current.monthlyBudget) || 0),
    budgets,
    categories,
    goals,
    profile: { name: String(input.profile?.name || user.name).trim().slice(0, 80), email: user.email },
  };
  user.name = user.settings.profile.name || user.name;
  await user.save();
  return res.json(user.settings);
}));

function normalizeTransaction(input) {
  if (!input || typeof input !== 'object') return null;
  const transaction = {
    id: String(input.id || randomBytes(12).toString('hex')).slice(0, 80),
    title: String(input.title || '').trim(),
    amount: Number(input.amount),
    category: String(input.category || '').trim(),
    date: String(input.date || ''),
    paymentMethod: String(input.paymentMethod || '').trim(),
    description: String(input.description || '').trim(),
    type: String(input.type || ''),
  };
  if (!transaction.title || transaction.title.length > 100 || !Number.isFinite(transaction.amount) || transaction.amount <= 0 || transaction.amount > 1e9) return null;
  if (!transaction.category || transaction.category.length > 40 || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) return null;
  if (!transaction.paymentMethod || transaction.paymentMethod.length > 40 || transaction.description.length > 500 || !['expense', 'income'].includes(transaction.type)) return null;
  return transaction;
}

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'The server could not complete that request.' });
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected to MongoDB.')).catch((error) => console.error('MongoDB connection failed:', error.message));
} else {
  console.warn('MONGODB_URI is unset. Demo mode works in the browser; account storage is disabled.');
}
app.listen(port, () => console.log(`Pocket Atlas API listening on http://localhost:${port}`));
