import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight,
  Bell, BriefcaseBusiness, CalendarDays, CarFront, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleDollarSign, Coffee, CreditCard, Download, Ellipsis, Film,
  GraduationCap, HeartPulse, House, LogOut, Menu, Moon, MoreHorizontal, Pencil,
  Plane, Plus, Search, Settings, ShoppingBag, SlidersHorizontal, Sparkles,
  Sun, Target, Trash2, TrendingDown, TrendingUp, Utensils, Wallet, X, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const COLORS = ['#9b8cff', '#54d8cb', '#ffbc70', '#f282aa', '#73a9ff', '#b0e47d', '#ed8f74', '#73d3ef', '#d2a4ff'];
const CATEGORY_ICONS = {
  Food: Utensils, Shopping: ShoppingBag, Transport: CarFront, Education: GraduationCap,
  Entertainment: Film, Healthcare: HeartPulse, Bills: Zap, Travel: Plane, Other: Ellipsis,
  Salary: BriefcaseBusiness, Business: Activity, Gift: Sparkles, 'Other income': CircleDollarSign,
};
const BASE_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Education', 'Entertainment', 'Healthcare', 'Bills', 'Travel', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Gift', 'Other income'];
const LOCAL_STATE_KEY = 'pocket-atlas-state-v1';
const today = new Date();
const isoDay = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = (value, compact = false) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: compact ? 0 : 2,
  notation: compact ? 'compact' : 'standard',
}).format(value || 0);
const monthKey = (date) => date.slice(0, 7);
const monthLabel = (key) => new Date(`${key}-02T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const demoTransactions = [
  { id: 'd1', title: 'Monthly salary', amount: 5600, category: 'Salary', date: isoDay(1), paymentMethod: 'Bank transfer', description: 'June salary', type: 'income' },
  { id: 'd2', title: 'Apartment rent', amount: 1480, category: 'Bills', date: isoDay(2), paymentMethod: 'Bank transfer', description: 'Monthly rent', type: 'expense' },
  { id: 'd3', title: 'Market & groceries', amount: 86.4, category: 'Food', date: isoDay(2), paymentMethod: 'Credit card', description: 'Fresh produce and pantry staples', type: 'expense' },
  { id: 'd4', title: 'Metro pass', amount: 42, category: 'Transport', date: isoDay(3), paymentMethod: 'Debit card', description: 'Monthly city transit', type: 'expense' },
  { id: 'd5', title: 'Design course', amount: 129, category: 'Education', date: isoDay(4), paymentMethod: 'Credit card', description: 'Product design workshop', type: 'expense' },
  { id: 'd6', title: 'Dinner with friends', amount: 64.8, category: 'Food', date: isoDay(5), paymentMethod: 'Digital wallet', description: 'Friday dinner', type: 'expense' },
  { id: 'd7', title: 'Freelance project', amount: 920, category: 'Business', date: isoDay(7), paymentMethod: 'Bank transfer', description: 'Brand identity project', type: 'income' },
  { id: 'd8', title: 'Running shoes', amount: 118, category: 'Shopping', date: isoDay(8), paymentMethod: 'Credit card', description: 'New training shoes', type: 'expense' },
  { id: 'd9', title: 'Power & internet', amount: 96.2, category: 'Bills', date: isoDay(10), paymentMethod: 'Debit card', description: 'Utilities', type: 'expense' },
  { id: 'd10', title: 'Cinema tickets', amount: 38, category: 'Entertainment', date: isoDay(12), paymentMethod: 'Digital wallet', description: 'Saturday movie', type: 'expense' },
  { id: 'd11', title: 'Birthday gift', amount: 150, category: 'Gift', date: isoDay(14), paymentMethod: 'Bank transfer', description: 'A little surprise', type: 'income' },
  { id: 'd12', title: 'Pharmacy', amount: 24.6, category: 'Healthcare', date: isoDay(16), paymentMethod: 'Debit card', description: 'Vitamins and essentials', type: 'expense' },
].map((item) => ({ ...item, date: item.date.startsWith(monthKey(today.toISOString().slice(0, 10))) ? item.date : `${monthKey(today.toISOString().slice(0, 10))}-${item.date.slice(-2)}` }));
const defaultSettings = {
  monthlyBudget: 3200,
  budgets: { Food: 500, Shopping: 420, Transport: 240, Education: 300, Entertainment: 180, Healthcare: 220, Bills: 900, Travel: 500, Other: 200 },
  categories: BASE_CATEGORIES,
  goals: [{ id: 'g1', name: 'Japan trip', target: 4500, saved: 2780, color: '#62d8c8' }, { id: 'g2', name: 'Emergency fund', target: 10000, saved: 6150, color: '#a895ff' }],
  profile: { name: 'Alex Morgan', email: 'alex.morgan@example.com' },
};

function readLocal() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY));
    if (Array.isArray(stored?.transactions) && stored.transactions.every((item) => item && typeof item.title === 'string' && Number.isFinite(Number(item.amount)) && ['income', 'expense'].includes(item.type))) {
      return { ...stored, settings: { ...defaultSettings, ...stored.settings } };
    }
  } catch { /* use the demo workspace */ }
  return { transactions: demoTransactions, settings: defaultSettings };
}
function IconFor({ name, size = 17 }) {
  const Icon = CATEGORY_ICONS[name] || CircleDollarSign;
  return <Icon size={size} strokeWidth={1.8} />;
}
function Button({ children, className = '', variant = 'quiet', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
function Toast({ toast, dismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(dismiss, 3200);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`}><span className="toast-check"><Check size={15} /></span>{toast.message}<button aria-label="Dismiss" onClick={dismiss}><X size={15} /></button></div>;
}
function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal-panel ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
      {children}
    </section>
  </div>;
}
function App() {
  const [stored, setStored] = useState(readLocal);
  const [transactions, setTransactions] = useState(stored.transactions);
  const [settings, setSettings] = useState(stored.settings);
  const [activePage, setActivePage] = useState('Overview');
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today.toISOString().slice(0, 10)));
  const [modal, setModal] = useState(null);
  const [authPage, setAuthPage] = useState(() => ['/login', '/signup'].includes(window.location.pathname));
  const [authMode, setAuthMode] = useState(() => window.location.pathname === '/signup' ? 'signup' : 'login');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-new');
  const [reportRange, setReportRange] = useState('Monthly');
  const [darkMode, setDarkMode] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMilestoneMenu, setShowMilestoneMenu] = useState(false);
  const [dismissedNotices, setDismissedNotices] = useState([]);
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('pocket-atlas-token') || '');
  const [apiError, setApiError] = useState(false);
  const [accountLoading, setAccountLoading] = useState(() => Boolean(localStorage.getItem('pocket-atlas-token')));

  const persist = (nextTransactions, nextSettings) => {
    const next = { transactions: nextTransactions, settings: nextSettings };
    setStored(next);
    setTransactions(nextTransactions);
    setSettings(nextSettings);
    if (!apiToken) localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(next));
  };
  const request = async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  };
  useEffect(() => { document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'; }, [darkMode]);
  useEffect(() => {
    if (!apiToken) { setAccountLoading(false); return undefined; }
    let active = true;
    setAccountLoading(true);
    request('/auth/me').then(async (profile) => {
      const data = await request('/data');
      if (!active) return;
      setSettings((current) => ({ ...current, ...data.settings, profile: profile.user }));
      setTransactions(data.transactions);
      setApiError(false);
      setAccountLoading(false);
    }).catch(() => {
      if (!active) return;
      localStorage.removeItem('pocket-atlas-token');
      setApiToken('');
      setApiError(true);
      setAccountLoading(false);
      setToast({ type: 'error', message: 'Could not load your account data. Check the connection and sign in again.' });
    });
    return () => { active = false; };
  }, [apiToken]);

  const monthTransactions = useMemo(() => transactions.filter((item) => monthKey(item.date) === selectedMonth), [transactions, selectedMonth]);
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expenses;
  const totalBalance = transactions.reduce((sum, item) => sum + (item.type === 'income' ? Number(item.amount) : -Number(item.amount)), 0);
  const savingsRate = income ? Math.max(0, Math.round((balance / income) * 100)) : 0;
  const expensePercent = income ? Math.round((expenses / income) * 100) : (expenses ? 100 : 0);
  const cashFlowSummary = monthTransactions.length === 0 ? 'Add transactions to see your cash flow' : balance > 0 ? 'Cash flow is positive this month' : balance === 0 ? 'Income and expenses are balanced' : 'Spending exceeds income this month';
  const filteredTransactions = useMemo(() => {
    let rows = transactions.filter((item) => monthKey(item.date) === selectedMonth);
    if (typeFilter !== 'all') rows = rows.filter((item) => item.type === typeFilter);
    if (categoryFilter !== 'All categories') rows = rows.filter((item) => item.category === categoryFilter);
    if (dateFrom) rows = rows.filter((item) => item.date >= dateFrom);
    if (dateTo) rows = rows.filter((item) => item.date <= dateTo);
    if (query.trim()) rows = rows.filter((item) => `${item.title} ${item.category} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase()));
    return [...rows].sort((a, b) => sortBy === 'date-old' ? a.date.localeCompare(b.date) : sortBy === 'amount-high' ? b.amount - a.amount : sortBy === 'amount-low' ? a.amount - b.amount : b.date.localeCompare(a.date));
  }, [transactions, selectedMonth, typeFilter, categoryFilter, dateFrom, dateTo, query, sortBy]);
  const categoryData = useMemo(() => {
    const totals = {};
    monthTransactions.filter((item) => item.type === 'expense').forEach((item) => { totals[item.category] = (totals[item.category] || 0) + Number(item.amount); });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTransactions]);
  const paymentData = useMemo(() => {
    const totals = {};
    monthTransactions.filter((item) => item.type === 'expense').forEach((item) => { totals[item.paymentMethod] = (totals[item.paymentMethod] || 0) + Number(item.amount); });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [monthTransactions]);
  const budgetPercent = settings.monthlyBudget ? expenses / settings.monthlyBudget * 100 : 0;
  const daysInMonth = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate();
  const dailyAverage = expenses / Math.max(1, Math.min(today.getDate(), daysInMonth));
  const navItems = [
    { label: 'Overview', icon: House }, { label: 'Transactions', icon: CreditCard },
    { label: 'Budgets', icon: SlidersHorizontal }, { label: 'Analytics', icon: Activity }, { label: 'Calendar', icon: CalendarDays },
  ];
  const flash = (message, type = 'success') => setToast({ message, type });
  const openAuth = (mode = 'login') => {
    const nextMode = mode === 'signup' ? 'signup' : 'login';
    setModal(null); setAuthMode(nextMode); setAuthPage(true);
    window.history.pushState({}, '', nextMode === 'signup' ? '/signup' : '/login');
  };
  const closeAuth = () => { setAuthPage(false); window.history.pushState({}, '', '/'); };
  const changeAuthMode = (mode) => {
    setAuthMode(mode); window.history.pushState({}, '', mode === 'signup' ? '/signup' : '/login');
  };
  useEffect(() => {
    const syncAuthRoute = () => {
      const path = window.location.pathname;
      setAuthPage(['/login', '/signup'].includes(path));
      if (path === '/login' || path === '/signup') setAuthMode(path.slice(1));
    };
    window.addEventListener('popstate', syncAuthRoute);
    return () => window.removeEventListener('popstate', syncAuthRoute);
  }, []);
  const moveMonth = (amount) => {
    const date = new Date(`${selectedMonth}-02T12:00:00`);
    date.setMonth(date.getMonth() + amount);
    setSelectedMonth(monthKey(date.toISOString().slice(0, 10)));
  };
  const saveTransaction = async (item) => {
    const nextTransactions = editing ? transactions.map((row) => row.id === item.id ? item : row) : [item, ...transactions];
    const nextSettings = settings.categories.includes(item.category) || item.type === 'income'
      ? settings
      : { ...settings, categories: [...settings.categories, item.category] };
    if (apiToken) {
      try {
        const saved = await request(editing ? `/transactions/${item.id}` : '/transactions', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(item) });
        const updated = editing ? transactions.map((row) => row.id === item.id ? saved : row) : [saved, ...transactions];
        if (nextSettings !== settings) await request('/settings', { method: 'PUT', body: JSON.stringify(nextSettings) });
        persist(updated, nextSettings);
      } catch (error) { flash(error.message, 'error'); return; }
    } else persist(nextTransactions, nextSettings);
    setModal(null); setEditing(null); flash(editing ? 'Transaction updated' : 'Transaction added');
  };
  const deleteTransaction = async (item) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const next = transactions.filter((row) => row.id !== item.id);
    if (apiToken) {
      try { await request(`/transactions/${item.id}`, { method: 'DELETE' }); }
      catch (error) { flash(error.message, 'error'); return; }
    }
    persist(next, settings); flash('Transaction deleted');
  };
  const saveSettings = async (next) => {
    if (apiToken) {
      try { await request('/settings', { method: 'PUT', body: JSON.stringify(next) }); }
      catch (error) { flash(error.message, 'error'); return; }
    }
    persist(transactions, next); setModal(null); flash('Your changes are saved');
  };
  const handleAuth = async (mode, form) => {
    try {
      const data = await request(`/auth/${mode}`, { method: 'POST', headers: {}, body: JSON.stringify(form) });
      localStorage.setItem('pocket-atlas-token', data.token);
      setApiError(false); setAccountLoading(true); setApiToken(data.token); setModal(null); setAuthPage(false);
      window.history.pushState({}, '', '/'); flash(mode === 'register' ? 'Your account is ready' : 'Welcome back');
    } catch (error) { flash(error.message, 'error'); }
  };
  const signOut = () => {
    localStorage.removeItem('pocket-atlas-token'); setApiToken('');
    const local = readLocal(); setTransactions(local.transactions); setSettings(local.settings); setApiError(false); flash('Signed out. Demo mode is ready.');
  };
  const exportCsv = (rows = filteredTransactions, filename = selectedMonth) => {
    const csv = [['Title', 'Type', 'Amount', 'Category', 'Date', 'Payment method', 'Description'], ...rows.map((item) => [item.title, item.type, item.amount, item.category, item.date, item.paymentMethod, item.description || ''])]
      .map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); const fileUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.href = fileUrl; link.download = `pocket-atlas-${filename}.csv`; link.click(); window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000); flash('CSV report downloaded');
  };
  const exportPdf = () => {
    const report = window.open('', '_blank');
    if (!report) { flash('Allow pop-ups to print your report', 'error'); return; }
    report.opener = null;
    const rows = reportRows.rows.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.type)}</td><td>${money(item.amount)}</td></tr>`).join('');
    report.document.write(`<title>Pocket Atlas report</title><style>body{font:14px Arial,sans-serif;color:#172033;padding:32px}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{text-align:left;padding:10px;border-bottom:1px solid #ddd}th{color:#667085}</style><h1>Pocket Atlas · ${reportRange} report (${reportRows.from} to ${reportRows.to})</h1><p>Income ${money(reportIncome)} &nbsp; Expenses ${money(reportExpenses)} &nbsp; Savings ${money(reportIncome - reportExpenses)}</p><table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Type</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`);
    report.document.close(); report.focus(); report.print();
  };
  const exportReport = () => exportCsv(reportRows.rows, `${reportRange.toLowerCase()}-${reportRows.from}-${reportRows.to}`);
  const recent = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const monthChartData = useMemo(() => {
    const result = [];
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(`${selectedMonth}-02T12:00:00`); date.setMonth(date.getMonth() - 5 + index);
      const key = monthKey(date.toISOString().slice(0, 10));
      const rows = transactions.filter((item) => monthKey(item.date) === key);
      result.push({ month: date.toLocaleDateString('en-US', { month: 'short' }), Income: rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0), Expenses: rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0) });
    }
    return result;
  }, [transactions, selectedMonth]);
  const trendData = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date(`${selectedMonth}-01T12:00:00`); date.setDate(index + 1);
    const key = date.toISOString().slice(0, 10);
    return { day: date.toLocaleDateString('en-US', { day: 'numeric' }), amount: monthTransactions.filter((item) => item.type === 'expense' && item.date === key).reduce((sum, item) => sum + Number(item.amount), 0) };
  }), [monthTransactions, selectedMonth]);
  const weeklyData = useMemo(() => Array.from({ length: 4 }, (_, index) => {
    const start = index * 7 + 1; const end = Math.min(start + 6, daysInMonth);
    const amount = monthTransactions.filter((item) => item.type === 'expense' && Number(item.date.slice(-2)) >= start && Number(item.date.slice(-2)) <= end).reduce((sum, item) => sum + Number(item.amount), 0);
    return { week: `Week ${index + 1}`, amount };
  }), [monthTransactions, daysInMonth]);
  const reportRows = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthDays = new Date(year, month, 0).getDate();
    const endDay = selectedMonth === monthKey(today.toISOString().slice(0, 10)) ? Math.min(today.getDate(), monthDays) : monthDays;
    let start = new Date(year, month - 1, endDay, 12);
    let end = new Date(start);
    if (reportRange === 'Weekly') start.setDate(start.getDate() - 6);
    if (reportRange === 'Monthly') start = new Date(year, month - 1, 1, 12);
    if (reportRange === 'Yearly') {
      start = new Date(year, 0, 1, 12);
      end = selectedMonth.slice(0, 4) === String(today.getFullYear()) ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12) : new Date(year, 11, 31, 12);
    }
    const keyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const from = keyOf(start); const to = keyOf(end);
    return { rows: transactions.filter((item) => item.date >= from && item.date <= to), from, to, days: Math.max(1, Math.round((end - start) / 86400000) + 1) };
  }, [transactions, selectedMonth, reportRange]);
  const reportIncome = reportRows.rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const reportExpenses = reportRows.rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const reportCategories = Object.entries(reportRows.rows.filter((item) => item.type === 'expense').reduce((totals, item) => ({ ...totals, [item.category]: (totals[item.category] || 0) + Number(item.amount) }), {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const reportPayments = Object.entries(reportRows.rows.filter((item) => item.type === 'expense').reduce((totals, item) => ({ ...totals, [item.paymentMethod]: (totals[item.paymentMethod] || 0) + Number(item.amount) }), {})).map(([name, value]) => ({ name, value }));
  const reportChartData = useMemo(() => {
    const start = new Date(`${reportRows.from}T12:00:00`);
    const count = reportRange === 'Yearly' ? 12 : reportRows.days;
    const periodRows = Array.from({ length: count }, (_, index) => {
      const date = new Date(start);
      if (reportRange === 'Yearly') date.setMonth(index);
      else date.setDate(date.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const label = reportRange === 'Daily' ? 'Day' : reportRange === 'Yearly' ? date.toLocaleDateString('en-US', { month: 'short' }) : reportRange === 'Weekly' ? date.toLocaleDateString('en-US', { weekday: 'short' }) : String(date.getDate());
      const rows = reportRows.rows.filter((item) => reportRange === 'Yearly' ? item.date.startsWith(key.slice(0, 7)) : item.date === key);
      return { period: label, Income: rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0), Expenses: rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0) };
    });
    return periodRows;
  }, [reportRows, reportRange]);
  const reportTrendData = reportChartData.map((item) => ({ day: item.period, amount: item.Expenses }));
  const reportComparisonData = useMemo(() => Array.from({ length: 4 }, (_, index) => {
    const start = new Date(`${reportRows.from}T12:00:00`);
    const first = Math.floor(reportRows.days * index / 4);
    const last = Math.max(first + 1, Math.floor(reportRows.days * (index + 1) / 4));
    const amount = reportRows.rows.filter((item) => {
      const offset = Math.floor((new Date(`${item.date}T12:00:00`) - start) / 86400000);
      return item.type === 'expense' && offset >= first && offset < last;
    }).reduce((sum, item) => sum + Number(item.amount), 0);
    return { week: `${reportRange} ${index + 1}`, amount };
  }), [reportRows, reportRange]);
  const notices = [
    budgetPercent >= 85 ? { id: 'budget', title: 'Monthly budget', message: `Spending is at ${Math.round(budgetPercent)}% of your limit.`, page: 'Budgets' } : null,
    categoryData[0] ? { id: `category-${categoryData[0].name}`, title: 'Spending insight', message: `${categoryData[0].name} is your highest spending category.`, page: 'Analytics' } : null,
  ].filter((notice) => notice && !dismissedNotices.includes(notice.id));

  if (authPage) return <><AuthPage mode={authMode} setMode={changeAuthMode} onClose={closeAuth} onSubmit={handleAuth} /><Toast toast={toast} dismiss={() => setToast(null)} /></>;
  if (accountLoading) return <div className="account-loading" role="status"><span className="loading-spinner" /><span>Loading your saved account data...</span></div>;

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div className="brand-name">pocket<span>atlas</span><small>PERSONAL FINANCE</small></div><button className="icon-button sidebar-collapse-toggle" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} title={sidebarCollapsed ? label : undefined} aria-label={label} onClick={() => { setActivePage(label); setMobileNav(false); }} className={`nav-item ${activePage === label ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Budgets' && budgetPercent >= 85 && <i className="nav-dot" />}</button>)}</nav>
      <div className="side-spacer" />
      <section className="goal-mini"><div className="goal-mini-top"><span className="goal-icon"><Target size={16} /></span><span className="eyebrow">YOUR NEXT MILESTONE</span><div className="milestone-menu-wrap"><button className="icon-button milestone-menu-trigger" aria-label="Milestone actions" aria-expanded={showMilestoneMenu} onClick={() => setShowMilestoneMenu(!showMilestoneMenu)}><MoreHorizontal size={18} /></button>{showMilestoneMenu && <div className="milestone-menu" role="menu"><button role="menuitem" onClick={() => { setShowMilestoneMenu(false); setModal({ type: 'goals' }); }}><Settings size={14} /> Manage milestones</button><button role="menuitem" onClick={() => { setShowMilestoneMenu(false); setModal({ type: 'goals', addMilestone: true }); }}><Plus size={14} /> Add milestone</button></div>}</div></div><strong>{settings.goals[0]?.name || 'Savings goal'}</strong><div className="goal-mini-progress"><span style={{ width: `${Math.min(100, (settings.goals[0]?.saved || 0) / (settings.goals[0]?.target || 1) * 100)}%` }} /></div><div className="goal-mini-meta"><span>{money(settings.goals[0]?.saved || 0, true)} saved</span><span>{Math.round((settings.goals[0]?.saved || 0) / (settings.goals[0]?.target || 1) * 100)}%</span></div></section>
      <button className="profile-row" onClick={() => setModal({ type: 'profile' })}><div className="avatar">{(settings.profile?.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div className="profile-copy"><strong>{settings.profile?.name || 'Alex Morgan'}</strong><span>{apiToken ? 'Connected account' : 'Personal account'}</span></div><MoreHorizontal size={18} /></button>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}

    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="breadcrumb">Your money <ChevronRight size={14} /> <strong>{activePage}</strong></div><div className="topbar-actions"><div className="month-switcher"><button className="icon-button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button><span>{monthLabel(selectedMonth)}</span><button className="icon-button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button></div><span className="topbar-divider" /><button className="icon-button" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle color theme" onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications(!showNotifications)}><Bell size={18} />{notices.length > 0 && <i />}</button>{showNotifications && <div className="notification-popover"><div className="notification-title"><span>Notifications <small>{notices.length ? notices.length : ''}</small></span><div>{notices.length > 0 && <button className="notification-clear" onClick={() => setDismissedNotices((current) => [...new Set([...current, ...notices.map((notice) => notice.id)])])}>Mark all read</button>}<button aria-label="Close notifications" onClick={() => setShowNotifications(false)}><X size={14} /></button></div></div>{notices.length ? <div className="notification-list">{notices.map((notice) => <button className="notification-item" key={notice.id} onClick={() => { setActivePage(notice.page); setDismissedNotices((current) => [...new Set([...current, notice.id])]); setShowNotifications(false); }}><span className="notice-dot" /><span><strong>{notice.title}</strong><small>{notice.message}</small></span><ChevronRight size={15} /></button>)}</div> : <p className="muted notification-empty">All caught up. Your finances look calm.</p>}</div>}</div><Button variant="primary" className="top-add" onClick={() => { setEditing(null); setModal({ type: 'transaction', transactionType: 'expense' }); }}><Plus size={16} /> Add transaction</Button></div></header>
      <div className="content-wrap" key={activePage}>
        <section className="page-heading"><div><span className="eyebrow"><span className="live-dot" /> YOUR FINANCIAL SNAPSHOT</span><h1>{activePage === 'Overview' ? <>Money, <em>in perspective.</em></> : activePage}</h1><p>{activePage === 'Overview' ? `A little clarity goes a long way. Here's your ${monthLabel(selectedMonth).toLowerCase()} at a glance.` : pageDescription(activePage)}</p></div><div className="heading-right">{!apiToken && <span className="demo-chip"><span /> Demo workspace</span>}{activePage === 'Overview' && !apiToken && <button className="text-action" onClick={() => openAuth('login')}>Sign in <ArrowUpRight size={15} /></button>}</div></section>

        {apiError && <div className="api-banner">We could not load your MongoDB account. This browser is showing local data until you reconnect.</div>}
        {!apiToken && <div className="data-source-banner"><span className="source-status-dot" /><div><strong>Viewing local demo data</strong><span>{transactions.length} sample transactions are saved in this browser. Sign in to load your MongoDB account data.</span></div><Button variant="primary" onClick={() => openAuth('login')}>Sign in to sync <ArrowRight size={14} /></Button></div>}
        {activePage === 'Overview' && <>
          <section className="metric-grid">
            <MetricCard label="Total balance" value={totalBalance} icon={Wallet} color="violet" trend={`${savingsRate}%`} trendText="saved this month" large />
            <MetricCard label="Total income" value={income} icon={ArrowDownLeft} color="mint" trend="↑" trendText="money in" />
            <MetricCard label="Total expenses" value={expenses} icon={ArrowUpRight} color="rose" trend={`${expensePercent}%`} trendText="of monthly income" />
            <MetricCard label="Remaining balance" value={settings.monthlyBudget - expenses} icon={CircleDollarSign} color="blue" trend={`${Math.round(budgetPercent)}%`} trendText="of budget used" />
            <MetricCard label="Monthly savings" value={balance} icon={Sparkles} color="mint" trend={balance >= 0 ? 'On track' : 'Over budget'} trendText="income minus spending" />
            <MetricCard label="Expense percentage" value={expensePercent} displayValue={`${expensePercent}%`} icon={TrendingDown} color="rose" trend={expensePercent <= 70 ? 'Balanced' : 'Watch spending'} trendText="expenses vs. income" />
          </section>
          <div className="overview-grid">
            <section className="glass-panel spending-panel"><div className="panel-heading"><div><span className="eyebrow">CASH FLOW</span><h2>Income & expenses</h2></div><span className="period-pill"><span /> Last 6 months</span></div><div className="chart-legend"><span><i className="legend-income" /> Income</span><span><i className="legend-expense" /> Expenses</span></div><div className="bar-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthChartData} barGap={5} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={(value) => `$${value / 1000}k`} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="Income" fill="#60d9c8" radius={[4, 4, 0, 0]} maxBarSize={18} /><Bar dataKey="Expenses" fill="#9d8aff" radius={[4, 4, 0, 0]} maxBarSize={18} /></BarChart></ResponsiveContainer></div><div className="chart-footnote"><span>{balance < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />} {cashFlowSummary}</span><button onClick={() => setActivePage('Analytics')}>View analytics <ArrowRight size={14} /></button></div></section>
            <section className="glass-panel category-panel"><div className="panel-heading"><div><span className="eyebrow">WHERE IT GOES</span><h2>Spending breakdown</h2></div><button className="icon-button" title="View analytics" onClick={() => setActivePage('Analytics')}><Ellipsis size={19} /></button></div><div className="donut-area"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="91%" paddingAngle={4} stroke="none" cornerRadius={4}>{categoryData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><div className="donut-center"><span>THIS MONTH</span><strong>{money(expenses, true)}</strong><small>total spent</small></div></div><div className="category-legend">{categoryData.slice(0, 4).map((item, index) => <div key={item.name}><span><i style={{ background: COLORS[index % COLORS.length] }} />{item.name}</span><strong>{money(item.value, true)}</strong></div>)}{categoryData.length === 0 && <div className="empty-inline">No expenses for this month yet.</div>}</div></section>
          </div>
          <div className="lower-grid"><section className="glass-panel transactions-panel"><div className="panel-heading"><div><span className="eyebrow">THE LATEST</span><h2>Recent transactions</h2></div><button className="text-action" onClick={() => setActivePage('Transactions')}>All transactions <ArrowRight size={14} /></button></div><TransactionRows items={recent} onEdit={(item) => { setEditing(item); setModal({ type: 'transaction', transactionType: item.type }); }} onDelete={deleteTransaction} /></section><section className="glass-panel budget-panel"><div className="panel-heading"><div><span className="eyebrow">MONTHLY LIMIT</span><h2>Budget pulse</h2></div><button className="text-action" onClick={() => setActivePage('Budgets')}>Manage <ArrowRight size={14} /></button></div><div className="budget-total"><strong>{money(expenses, true)}</strong><span>of {money(settings.monthlyBudget, true)}</span></div><div className="progress-track budget-main-progress"><span className={budgetPercent >= 100 ? 'progress-danger' : ''} style={{ width: `${Math.min(100, budgetPercent)}%` }} /></div><div className="budget-foot"><span>{money(Math.max(0, settings.monthlyBudget - expenses), true)} remaining</span><span className={budgetPercent >= 85 ? 'warning-text' : ''}>{Math.round(budgetPercent)}% used</span></div><div className="budget-category-list">{categoryData.slice(0, 3).map((item) => <BudgetLine key={item.name} item={item} limit={settings.budgets[item.name] || 300} />)}</div></section></div>
          <section className="glass-panel goals-strip"><div className="goals-intro"><span className="goal-icon"><Target size={17} /></span><div><span className="eyebrow">A LITTLE CLOSER</span><h2>Savings milestones</h2></div></div>{settings.goals.slice(0, 2).map((goal) => <GoalProgress key={goal.id} goal={goal} />)}<button className="goal-add" aria-label="Add milestone" title="Add a savings milestone" onClick={() => setModal({ type: 'goals', addMilestone: true })}><Plus size={18} /></button></section>
        </>}
        {activePage === 'Transactions' && <TransactionsPage items={filteredTransactions} allCategories={settings.categories} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} typeFilter={typeFilter} setTypeFilter={setTypeFilter} sortBy={sortBy} setSortBy={setSortBy} onEdit={(item) => { setEditing(item); setModal({ type: 'transaction', transactionType: item.type }); }} onDelete={deleteTransaction} onAdd={() => { setEditing(null); setModal({ type: 'transaction', transactionType: 'expense' }); }} exportCsv={exportCsv} />}
        {activePage === 'Budgets' && <BudgetsPage expenses={expenses} settings={settings} categoryData={categoryData} onEdit={() => setModal({ type: 'budget' })} />}
        {activePage === 'Analytics' && <AnalyticsPage categoryData={reportCategories} paymentData={reportPayments} monthChartData={reportChartData} trendData={reportTrendData} weeklyData={reportComparisonData} expenses={reportExpenses} income={reportIncome} dailyAverage={reportExpenses / reportRows.days} savingsRate={reportIncome ? Math.max(0, Math.round(((reportIncome - reportExpenses) / reportIncome) * 100)) : 0} reportRange={reportRange} setReportRange={setReportRange} onExport={exportReport} onPdf={exportPdf} />}
        {activePage === 'Calendar' && <CalendarPage transactions={monthTransactions} selectedMonth={selectedMonth} />}
        <footer className="app-footer"><span>Made for a clearer relationship with money.</span><span><span className={`footer-status ${apiError ? 'footer-error' : apiToken ? 'footer-synced' : ''}`} />{apiError ? 'MongoDB connection issue' : apiToken ? 'Synced with MongoDB' : 'Saved in this browser'}</span></footer>
      </div>
    </main>

    {modal?.type === 'transaction' && <TransactionModal transaction={editing} initialType={modal.transactionType} categories={settings.categories} onClose={() => { setModal(null); setEditing(null); }} onSave={saveTransaction} />}
    {modal?.type === 'budget' && <BudgetModal settings={settings} onClose={() => setModal(null)} onSave={saveSettings} />}
    {modal?.type === 'goals' && <GoalsModal settings={settings} onClose={() => setModal(null)} onSave={saveSettings} addInitially={modal.addMilestone} />}
    {modal?.type === 'profile' && <ProfileModal settings={settings} onClose={() => setModal(null)} onSave={saveSettings} onAuth={openAuth} onSignOut={signOut} />}
    <Toast toast={toast} dismiss={() => setToast(null)} />
  </div>;
}

function escapeHtml(text) { return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function pageDescription(page) { return ({ Transactions: 'Every in and out, in one tidy place.', Budgets: 'Give your spending a little structure.', Analytics: 'Patterns worth noticing, without the spreadsheet.', Calendar: 'A day-by-day view of your money.' })[page]; }
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><span>{label || payload[0].name}</span>{payload.map((item) => <strong key={item.name} style={{ color: item.color || item.payload.fill }}>{item.name} {money(item.value)}</strong>)}</div>;
}
function MetricCard({ label, value, displayValue, icon: Icon, color, trend, trendText, large }) {
  return <article className={`metric-card metric-${color} ${large ? 'metric-lead' : ''}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><strong className="metric-value">{displayValue || money(value, true)}</strong><div className="metric-foot"><span className={`metric-trend ${color === 'rose' ? 'trend-rose' : ''}`}>{trend}</span><span>{trendText}</span></div><div className="metric-glow" /></article>;
}
function TransactionRows({ items, onEdit, onDelete }) {
  if (!items.length) return <div className="empty-state"><div className="empty-illustration"><Wallet size={28} /><Sparkles size={15} /></div><strong>No transactions yet</strong><span>Add an expense or income to see it here.</span></div>;
  return <div className="transaction-list">{items.map((item) => <div className="transaction-row" key={item.id}><div className={`transaction-icon transaction-${item.type}`}><IconFor name={item.category} /></div><div className="transaction-main"><strong>{item.title}</strong><span>{item.category} <i /> {new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div><div className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</div><div className="row-actions"><button className="icon-button" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}><Pencil size={14} /></button><button className="icon-button danger-hover" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}><Trash2 size={14} /></button></div></div>)}</div>;
}
function BudgetLine({ item, limit }) {
  const percent = limit ? item.value / limit * 100 : 0;
  return <div className="budget-line"><div className="budget-line-label"><span><i style={{ background: COLORS[(item.name.charCodeAt(0) + item.name.length) % COLORS.length] }} />{item.name}</span><span>{money(item.value, true)} <small>/ {money(limit, true)}</small></span></div><div className="progress-track"><span className={percent >= 100 ? 'progress-danger' : ''} style={{ width: `${Math.min(100, percent)}%` }} /></div></div>;
}
function GoalProgress({ goal }) {
  const percent = goal.target ? Math.min(100, goal.saved / goal.target * 100) : 0;
  return <div className="goal-progress"><div className="goal-progress-copy"><strong>{goal.name}</strong><span>{money(goal.saved, true)} <small>of {money(goal.target, true)}</small></span></div><div className="progress-track"><span style={{ width: `${percent}%`, background: goal.color }} /></div></div>;
}
function TransactionsPage({ items, allCategories, query, setQuery, categoryFilter, setCategoryFilter, dateFrom, setDateFrom, dateTo, setDateTo, typeFilter, setTypeFilter, sortBy, setSortBy, onEdit, onDelete, onAdd, exportCsv }) {
  return <section className="glass-panel full-panel transactions-page"><div className="transactions-toolbar"><div className="segmented-control"><button className={typeFilter === 'all' ? 'segment-active' : ''} onClick={() => setTypeFilter('all')}>All</button><button className={typeFilter === 'expense' ? 'segment-active' : ''} onClick={() => setTypeFilter('expense')}>Expenses</button><button className={typeFilter === 'income' ? 'segment-active' : ''} onClick={() => setTypeFilter('income')}>Income</button></div><div className="transaction-tools"><label className="search-box"><Search size={16} /><input placeholder="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{allCategories.map((category) => <option key={category}>{category}</option>)}</select><label className="date-filter"><span>From</span><input aria-label="Filter transactions from date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label className="date-filter"><span>To</span><input aria-label="Filter transactions to date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><select aria-label="Sort transactions" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="date-new">Newest first</option><option value="date-old">Oldest first</option><option value="amount-high">Amount: high to low</option><option value="amount-low">Amount: low to high</option></select><Button variant="quiet" onClick={exportCsv}><Download size={15} /> Export</Button><Button variant="primary" onClick={onAdd}><Plus size={15} /> Add new</Button></div></div><div className="table-heading"><span>TRANSACTION</span><span>CATEGORY</span><span>DATE</span><span>PAYMENT</span><span>AMOUNT</span><span /></div>{items.length ? <div className="transaction-table">{items.map((item) => <div className="table-row" key={item.id}><div className="table-title"><div className={`transaction-icon transaction-${item.type}`}><IconFor name={item.category} /></div><div><strong>{item.title}</strong><span>{item.description || (item.type === 'income' ? 'Incoming payment' : 'Expense')}</span></div></div><span className="table-category"><i style={{ background: COLORS[(item.category.charCodeAt(0) + item.category.length) % COLORS.length] }} />{item.category}</span><span className="table-date">{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><span className="table-payment"><CreditCard size={14} />{item.paymentMethod}</span><strong className={`table-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</strong><div className="table-actions"><button className="icon-button" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}><Pencil size={14} /></button><button className="icon-button danger-hover" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}><Trash2 size={14} /></button></div></div>)}</div> : <div className="empty-state table-empty"><div className="empty-illustration"><Search size={26} /></div><strong>No matches found</strong><span>Try another search or clear your filters.</span></div>}<div className="table-pagination"><span>Showing <strong>{items.length}</strong> transactions</span><span>Filtered for current month</span></div></section>;
}
function BudgetsPage({ expenses, settings, categoryData, onEdit }) {
  const percent = settings.monthlyBudget ? expenses / settings.monthlyBudget * 100 : 0;
  return <><section className="budget-summary glass-panel"><div><span className="eyebrow">MONTHLY SPENDING LIMIT</span><h2>{money(expenses, true)} <small>of {money(settings.monthlyBudget, true)}</small></h2><p>{money(Math.max(0, settings.monthlyBudget - expenses), true)} left to spend this month</p></div><div className="budget-summary-ring" style={{ '--percent': `${Math.min(100, percent)}%` }}><strong>{Math.round(percent)}<small>%</small></strong><span>used</span></div><Button variant="primary" onClick={onEdit}><Settings size={15} /> Adjust budgets</Button></section><div className="budget-page-grid"><section className="glass-panel budget-detail-panel"><div className="panel-heading"><div><span className="eyebrow">CATEGORY LIMITS</span><h2>Spending by category</h2></div><span className="period-pill">{monthLabel(monthKey(today.toISOString().slice(0, 10)))}</span></div>{settings.categories.map((category, index) => { const spent = categoryData.find((row) => row.name === category)?.value || 0; const limit = settings.budgets[category] || 0; const used = limit ? spent / limit * 100 : 0; return <div className="budget-detail-row" key={category}><div className="budget-detail-icon" style={{ color: COLORS[index % COLORS.length], background: `${COLORS[index % COLORS.length]}18` }}><IconFor name={category} /></div><div className="budget-detail-content"><div className="budget-detail-label"><strong>{category}</strong><span>{money(spent)} <small>of {money(limit)}</small></span></div><div className="progress-track"><span className={used >= 85 ? 'progress-danger' : ''} style={{ width: `${Math.min(100, used)}%`, background: COLORS[index % COLORS.length] }} /></div></div><span className={`budget-used ${used >= 85 ? 'warning-text' : ''}`}>{Math.round(used)}%</span></div>; })}</section><section className="glass-panel budget-advice"><div className="advice-orb"><Sparkles size={20} /></div><span className="eyebrow">A SMALL NUDGE</span><h2>{percent >= 85 ? 'You’re getting close.' : 'Room to breathe.'}</h2><p>{percent >= 85 ? 'You’ve used most of this month’s budget. A quick look at the category limits can help keep your plans on track.' : 'Your spending is within its monthly limit. Keep checking in as the month unfolds.'}</p><div className="advice-stat"><span>Average daily spend</span><strong>{money(expenses / Math.max(1, today.getDate()))}</strong></div><div className="advice-stat"><span>Daily budget pace</span><strong>{money(settings.monthlyBudget / 30)}</strong></div><Button onClick={onEdit}>Review limits <ArrowRight size={15} /></Button></section></div></>;
}
function AnalyticsPage({ categoryData, paymentData, monthChartData, trendData, weeklyData, expenses, income, dailyAverage, savingsRate, reportRange, setReportRange, onExport, onPdf }) {
  return <><div className="report-toolbar"><div className="segmented-control">{['Daily', 'Weekly', 'Monthly', 'Yearly'].map((range) => <button key={range} className={reportRange === range ? 'segment-active' : ''} onClick={() => setReportRange(range)}>{range}</button>)}</div><div className="report-actions"><Button onClick={onExport}><Download size={15} /> Export CSV</Button><Button onClick={onPdf}><Download size={15} /> Print / PDF</Button></div></div><section className="analytics-kpis"><div className="glass-panel analytics-kpi"><span>Income</span><strong>{money(income, true)}</strong><small><ArrowDownRight size={14} /> Selected month</small></div><div className="glass-panel analytics-kpi"><span>Expenses</span><strong>{money(expenses, true)}</strong><small><ArrowUpRight size={14} /> Selected month</small></div><div className="glass-panel analytics-kpi"><span>Daily average</span><strong>{money(dailyAverage)}</strong><small>Average spend per day</small></div><div className="glass-panel analytics-kpi"><span>Savings rate</span><strong>{savingsRate}%</strong><small><Sparkles size={14} /> Income less expenses</small></div></section><div className="analytics-grid"><section className="glass-panel analytics-chart"><div className="panel-heading"><div><span className="eyebrow">CASH FLOW</span><h2>Income vs. expenses</h2></div></div><div className="analytics-chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthChartData} barGap={6} margin={{ top: 10, right: 8, left: -12, bottom: 4 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={(value) => `$${value / 1000}k`} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} /><Bar dataKey="Income" fill="#60d9c8" radius={[4, 4, 0, 0]} /><Bar dataKey="Expenses" fill="#9d8aff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section><section className="glass-panel analytics-chart"><div className="panel-heading"><div><span className="eyebrow">DAILY ACTIVITY</span><h2>Spending trend</h2></div></div><div className="analytics-chart-body"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 12, right: 8, left: -12, bottom: 4 }}><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9b8cff" stopOpacity={0.28} /><stop offset="100%" stopColor="#9b8cff" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={(value) => `$${value}`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="amount" name="Spending" stroke="#a394ff" strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer></div></section><section className="glass-panel analytics-chart"><div className="panel-heading"><div><span className="eyebrow">WEEK BY WEEK</span><h2>Weekly comparison</h2></div></div><div className="analytics-chart-body"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={weeklyData} margin={{ top: 12, right: 8, left: -12, bottom: 4 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={(value) => `$${value}`} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="amount" name="Expenses" fill="#74aaff" radius={[5, 5, 0, 0]} maxBarSize={40} /><Line dataKey="amount" name="Trend" stroke="#58d8c7" strokeWidth={2} dot={{ fill: '#58d8c7', r: 3 }} /></ComposedChart></ResponsiveContainer></div></section><section className="glass-panel analytics-chart small-donut-chart"><div className="panel-heading"><div><span className="eyebrow">PAYMENT MIX</span><h2>How you pay</h2></div></div><div className="payment-chart"><ResponsiveContainer width="55%" height="100%"><PieChart><Pie data={paymentData} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="83%" paddingAngle={4} stroke="none">{paymentData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><div className="payment-legend">{paymentData.map((item, index) => <div key={item.name}><i style={{ background: COLORS[index % COLORS.length] }} /><span>{item.name}</span><strong>{money(item.value, true)}</strong></div>)}{paymentData.length === 0 && <span className="muted">No expense data yet.</span>}</div></div></section></div><section className="glass-panel analytics-categories"><div className="panel-heading"><div><span className="eyebrow">TOP CATEGORIES</span><h2>Where your month went</h2></div></div><div className="top-category-grid">{categoryData.slice(0, 5).map((item, index) => <div key={item.name} className="top-category"><span className="top-category-icon" style={{ color: COLORS[index % COLORS.length], background: `${COLORS[index % COLORS.length]}18` }}><IconFor name={item.name} /></span><span>{item.name}</span><strong>{money(item.value)}</strong><small>{expenses ? Math.round(item.value / expenses * 100) : 0}% of expenses</small></div>)}{!categoryData.length && <span className="muted">Your category insights will show here.</span>}</div></section></>;
}
function CalendarPage({ transactions, selectedMonth }) {
  const year = Number(selectedMonth.slice(0, 4)); const month = Number(selectedMonth.slice(5, 7)) - 1;
  const firstDay = new Date(year, month, 1).getDay(); const dayCount = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];
  return <section className="glass-panel calendar-panel"><div className="calendar-weekdays">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const key = day ? `${selectedMonth}-${String(day).padStart(2, '0')}` : ''; const items = transactions.filter((item) => item.date === key); const outgoing = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0); const incoming = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0); return <div className={`calendar-cell ${day ? '' : 'calendar-blank'}`} key={`${key}-${index}`}>{day && <><span className={`calendar-day ${key === isoDay() ? 'calendar-today' : ''}`}>{day}</span>{items.slice(0, 2).map((item) => <span className={`calendar-event ${item.type}`} key={item.id}><i />{item.title}</span>)}{items.length > 2 && <small className="calendar-more">+{items.length - 2} more</small>}{(outgoing > 0 || incoming > 0) && <div className="calendar-total">{outgoing > 0 && <span>−{money(outgoing, true)}</span>}{incoming > 0 && <span className="income">+{money(incoming, true)}</span>}</div>}</>}</div>; })}</div></section>;
}
function TransactionModal({ transaction, initialType, categories, onClose, onSave }) {
  const [type, setType] = useState(transaction?.type || initialType || 'expense');
  const [title, setTitle] = useState(transaction?.title || ''); const [amount, setAmount] = useState(transaction?.amount ?? '');
  const [category, setCategory] = useState(transaction?.category || (type === 'income' ? 'Salary' : categories[0] || 'Other'));
  const [date, setDate] = useState(transaction?.date || isoDay()); const [paymentMethod, setPaymentMethod] = useState(transaction?.paymentMethod || 'Credit card');
  const [description, setDescription] = useState(transaction?.description || ''); const [customCategory, setCustomCategory] = useState(''); const [error, setError] = useState('');
  const availableCategories = type === 'income' ? INCOME_CATEGORIES : categories;
  const handleType = (next) => { setType(next); setCategory(next === 'income' ? 'Salary' : categories[0] || 'Other'); };
  const submit = (event) => { event.preventDefault(); if (!title.trim()) { setError('Give this transaction a name.'); return; } if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) { setError('Enter an amount greater than zero.'); return; } if (!date) { setError('Choose a transaction date.'); return; }
    const finalCategory = category === '__custom' ? customCategory.trim() : category;
    if (!finalCategory) { setError('Choose or add a category.'); return; }
    onSave({ id: transaction?.id || uid(), title: title.trim(), amount: Number(amount), category: finalCategory, date, paymentMethod, description: description.trim(), type });
  };
  return <Modal title={transaction ? 'Edit transaction' : 'Add transaction'} eyebrow="TRANSACTION DETAILS" onClose={onClose}><form className="modal-form" onSubmit={submit}><div className="form-segment"><button type="button" className={type === 'expense' ? 'form-segment-active' : ''} onClick={() => handleType('expense')}><ArrowUpRight size={15} /> Expense</button><button type="button" className={type === 'income' ? 'form-segment-income' : ''} onClick={() => handleType('income')}><ArrowDownLeft size={15} /> Income</button></div><label className="form-field"><span>{type === 'income' ? 'Income source' : 'Expense title'}</span><input autoFocus placeholder={type === 'income' ? 'e.g. Monthly salary' : 'e.g. Weekly groceries'} value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="form-row"><label className="form-field"><span>Amount</span><div className="input-prefix"><span>$</span><input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></label><label className="form-field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{availableCategories.map((item) => <option key={item}>{item}</option>)}{type === 'expense' && <option value="__custom">+ New category</option>}</select></label></div>{category === '__custom' && <label className="form-field"><span>New category name</span><input placeholder="e.g. Pets" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} /></label>}<div className="form-row"><label className="form-field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="form-field"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{['Credit card', 'Debit card', 'Cash', 'Bank transfer', 'Digital wallet', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="form-field"><span>Description <small>Optional</small></span><textarea rows="2" placeholder="Add a note..." value={description} onChange={(event) => setDescription(event.target.value)} /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary"><Check size={15} /> {transaction ? 'Save changes' : 'Save transaction'}</Button></div></form></Modal>;
}
function BudgetModal({ settings, onClose, onSave }) {
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget);
  const [budgets, setBudgets] = useState(settings.budgets);
  return <Modal title="Shape your budget" eyebrow="MONTHLY LIMITS" onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave({ ...settings, monthlyBudget: Number(monthlyBudget), budgets: Object.fromEntries(Object.entries(budgets).map(([key, value]) => [key, Number(value) || 0])) }); }}><label className="form-field"><span>Total monthly budget</span><div className="input-prefix"><span>$</span><input type="number" min="0" value={monthlyBudget} onChange={(event) => setMonthlyBudget(event.target.value)} /></div></label><div className="budget-edit-list">{settings.categories.map((category) => <label className="form-field" key={category}><span>{category}</span><div className="input-prefix"><span>$</span><input type="number" min="0" value={budgets[category] ?? 0} onChange={(event) => setBudgets({ ...budgets, [category]: event.target.value })} /></div></label>)}</div><div className="modal-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary"><Check size={15} /> Save budgets</Button></div></form></Modal>;
}
function GoalsModal({ settings, onClose, onSave, addInitially = false }) {
  const createGoal = (index) => ({ id: uid(), name: '', saved: 0, target: 1000, color: COLORS[index % COLORS.length] });
  const [goals, setGoals] = useState(() => addInitially ? [...settings.goals, createGoal(settings.goals.length)] : settings.goals);
  const updateGoal = (id, field, value) => setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, [field]: field === 'name' ? value : Number(value) } : goal));
  return <Modal title="Savings milestones" eyebrow="YOUR FUTURE PLANS" onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave({ ...settings, goals }); }}><div className="goal-edit-list">{goals.map((goal) => <div className="goal-edit-row" key={goal.id}><label className="form-field"><span>Milestone name</span><input value={goal.name} onChange={(event) => updateGoal(goal.id, 'name', event.target.value)} required /></label><div className="form-row"><label className="form-field"><span>Saved so far</span><div className="input-prefix"><span>$</span><input type="number" min="0" value={goal.saved} onChange={(event) => updateGoal(goal.id, 'saved', event.target.value)} /></div></label><label className="form-field"><span>Target</span><div className="input-prefix"><span>$</span><input type="number" min="1" value={goal.target} onChange={(event) => updateGoal(goal.id, 'target', event.target.value)} /></div></label></div></div>)}</div><Button type="button" onClick={() => setGoals((current) => [...current, createGoal(current.length)])}><Plus size={15} /> Add milestone</Button><div className="modal-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary"><Check size={15} /> Save milestones</Button></div></form></Modal>;
}
function ProfileModal({ settings, onClose, onSave, onAuth, onSignOut }) {
  const [name, setName] = useState(settings.profile?.name || ''); const [email, setEmail] = useState(settings.profile?.email || '');
  return <Modal title="Your profile" eyebrow="ACCOUNT SETTINGS" onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave({ ...settings, profile: { ...settings.profile, name: name.trim(), email: email.trim() } }); }}><div className="profile-modal-avatar">{name.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'A'}</div><label className="form-field"><span>Display name</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="form-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><div className="modal-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary"><Check size={15} /> Save profile</Button></div>{!localStorage.getItem('pocket-atlas-token') ? <button className="profile-connect" type="button" onClick={onAuth}>Connect a secure account <ArrowUpRight size={15} /></button> : <button className="profile-connect sign-out" type="button" onClick={onSignOut}><LogOut size={15} /> Sign out</button>}</form></Modal>;
}
function AuthPage({ mode, setMode, onClose, onSubmit }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const signup = mode === 'signup';
  return <main className="auth-page"><div className="auth-layout"><section className="auth-visual"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=85" alt="A calm, organized workspace for planning finances" /><div className="auth-image-shade" /><div className="auth-visual-brand"><span className="brand-mark"><i /><i /><i /></span><span>pocket<strong>atlas</strong></span></div><div className="auth-visual-copy"><span className="eyebrow">A CLEARER VIEW OF YOUR MONEY</span><h2>Build a life<br />that <em>adds up.</em></h2><p>Small, thoughtful decisions make space for the things you care about most.</p><div className="auth-image-caption"><span><Check size={14} /> Your finances, in perspective</span><span><Check size={14} /> Your goals, in reach</span></div></div><span className="auth-image-credit">A little more clarity, every day.</span></section><section className="auth-panel"><button className="auth-back" type="button" onClick={onClose}><ArrowLeft size={16} /> Back to dashboard</button><div className="auth-form-shell"><span className="auth-form-icon"><Wallet size={20} /></span><span className="eyebrow">PRIVATE AND SECURE</span><h1>{signup ? 'Create your account' : 'Welcome back'}</h1><p>{signup ? 'A clearer money picture starts here.' : 'Sign in to pick up where you left off.'}</p><form className="auth-page-form" onSubmit={(event) => { event.preventDefault(); onSubmit(signup ? 'register' : 'login', { name, email, password }); }}>{signup && <label className="form-field"><span>Your name</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength="2" maxLength="80" placeholder="Alex Morgan" /></label>}<label className="form-field"><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></label><label className="form-field"><span>Password</span><input type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" maxLength="100" placeholder="At least 8 characters" /></label><button className="button button-primary auth-submit" type="submit">{signup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button></form><div className="auth-mode-switch">{signup ? 'Already have an account?' : 'New to Pocket Atlas?'} <button type="button" onClick={() => setMode(signup ? 'login' : 'signup')}>{signup ? 'Sign in' : 'Create an account'}</button></div><div className="auth-privacy"><span><Check size={13} /></span><p>Your information is encrypted and never shared.</p></div></div><div className="auth-panel-footer">Pocket Atlas <span>·</span> Personal finance, with perspective</div></section></div></main>;
}

export default App;
