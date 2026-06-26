const express = require('express');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'budget.db');

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'client/dist')));

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '💳',
    color_hex TEXT NOT NULL DEFAULT '#5C6BC0',
    balance REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '📦',
    type TEXT NOT NULL CHECK(type IN ('EXPENSE','INCOME','TRANSFER'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    note TEXT DEFAULT ''
  );
`);

// ─── Seed ─────────────────────────────────────────────────────────────────────

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM accounts').get().c;
  if (count > 0) return;

  console.log('Seeding database from transactions.json...');
  const raw = fs.readFileSync(path.join(__dirname, 'transactions.json'), 'utf8');
  const arr = JSON.parse(raw);

  const accountMeta = {
    'Bank 1':    { emoji: '🟢', color: '#21A038' },
    'Card 1':    { emoji: '💳', color: '#5C6BC0' },
    'Cash':      { emoji: '💵', color: '#4CAF50' },
    'Bank 2':    { emoji: '🔴', color: '#EF5350' },
    'Mobile':    { emoji: '📱', color: '#E81123' },
    'Savings':   { emoji: '🏦', color: '#1565C0' },
    'Bank 3':    { emoji: '🟡', color: '#FFD600' },
    'Other':     { emoji: '💼', color: '#7B1FA2' },
    'Crypto':    { emoji: '₿',  color: '#F57C00' },
    'Planned':   { emoji: '📋', color: '#78909C' },
  };

  const accountNames = new Set();
  const catTypes = new Map();

  for (const tx of arr) {
    const acc = tx.account;
    // FIX: filter out null, "null" string, empty strings
    if (acc && acc !== 'null') accountNames.add(acc);
    const toAcc = tx.toAccount;
    if (toAcc && toAcc !== 'null') accountNames.add(toAcc);

    const cat = tx.category;
    if (cat && tx.type !== 'TRANSFER' && !catTypes.has(cat)) {
      catTypes.set(cat, tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
    }
  }

  const insertAccount = db.prepare('INSERT INTO accounts (name, emoji, color_hex, balance, sort_order) VALUES (?,?,?,0,?)');
  const accounts = {};
  let sortIdx = 0;
  for (const name of [...accountNames].sort()) {
    const meta = accountMeta[name] || { emoji: '💳', color: '#5C6BC0' };
    const r = insertAccount.run(name, meta.emoji, meta.color, sortIdx++);
    accounts[name] = r.lastInsertRowid;
  }

  const insertCategory = db.prepare('INSERT INTO categories (name, emoji, type) VALUES (?,?,?)');
  const categories = {};
  for (const [name, type] of [...catTypes.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const r = insertCategory.run(name, categoryEmoji(name), type);
    categories[name] = r.lastInsertRowid;
  }

  const insertTx = db.prepare(`
    INSERT INTO transactions (date, amount, type, category_id, account_id, to_account_id, note)
    VALUES (?,?,?,?,?,?,?)
  `);
  const balances = {};

  db.exec('BEGIN');
  try {
    for (const tx of arr) {
      const type = tx.type;
      const accId = accounts[tx.account] ?? null;
      const toAccRaw = tx.toAccount;
      const toAccId = (toAccRaw && toAccRaw !== 'null') ? (accounts[toAccRaw] ?? null) : null;
      const catId = type === 'TRANSFER' ? null : (categories[tx.category] ?? null);
      const amount = tx.amount;

      insertTx.run(tx.date, amount, type, catId, accId, toAccId, tx.note || '');

      if (type === 'EXPENSE')  { if (accId)   balances[accId]   = (balances[accId]   ?? 0) - amount; }
      if (type === 'INCOME')   { if (accId)   balances[accId]   = (balances[accId]   ?? 0) + amount; }
      if (type === 'TRANSFER') {
        if (accId)   balances[accId]   = (balances[accId]   ?? 0) - amount;
        if (toAccId) balances[toAccId] = (balances[toAccId] ?? 0) + amount;
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const setBalance = db.prepare('UPDATE accounts SET balance=? WHERE id=?');
  for (const [id, bal] of Object.entries(balances)) setBalance.run(bal, Number(id));

  console.log(`Seeded: ${accountNames.size} accounts, ${catTypes.size} categories, ${arr.length} transactions`);
}

function categoryEmoji(name) {
  const n = name.toLowerCase();
  // Parent categories (column E from iOS)
  if (n.includes('еда')) return '🍞';
  if (n.includes('ресторан') || n.includes('кафе')) return '☕';
  if (n.includes('косметолог')) return '💅';
  if (n.includes('лечение')) return '💊';
  if (n.includes('хоз')) return '🏠';
  if (n.includes('одежд')) return '👗';
  if (n.includes('машина')) return '🚗';
  if (n.includes('накладные')) return '📄';
  if (n.includes('отдал')) return '🤝';
  if (n.includes('взял')) return '🤲';
  if (n.includes('связь') || n.includes('интернет')) return '📡';
  if (n.includes('электроника')) return '📱';
  if (n.includes('подарк')) return '🎁';
  if (n.includes('аренд') || n.includes('квартир')) return '🔑';
  if (n.includes('зарплат') || n.includes('зп')) return '💰';
  if (n.includes('самозанят') || n.includes('самозанятость')) return '💼';
  if (n.includes('перевод') || n.includes('обмен')) return '↔️';
  if (n.includes('транспорт')) return '✈️';
  if (n.includes('спорт')) return '⚽';
  if (n.includes('туризм')) return '🏕️';
  if (n.includes('учёб') || n.includes('учеб') || n.includes('консультац')) return '📚';
  if (n.includes('праздник')) return '🎉';
  if (n.includes('отдых')) return '🌴';
  if (n.includes('гос')) return '🏛️';
  if (n.includes('налог')) return '📋';
  if (n.includes('проигр')) return '🎲';
  if (n.includes('театр') || n.includes('выставк')) return '🎭';
  if (n.includes('напитк') || n.includes('гостиниц')) return '🍷';
  if (n.includes('займ') || n.includes('возврат')) return '💳';
  if (n.includes('ввод остатков') || n.includes('ввод')) return '📊';
  if (n.includes('проданн') || n.includes('авито')) return '🏷️';
  if (n.includes('благотворит')) return '❤️';
  return '📦';
}

seedIfEmpty();

// ─── API ─────────────────────────────────────────────────────────────────────

app.get('/api/accounts', (req, res) => {
  res.json(db.prepare('SELECT * FROM accounts ORDER BY sort_order, id').all());
});

app.get('/api/transactions/:id', (req, res) => {
  const row = db.prepare(`
    SELECT t.*,
      c.name as category_name, c.emoji as category_emoji,
      a.name as account_name, ta.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.id = ?
  `).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.put('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!tx) return res.status(404).json({ error: 'not found' });

  const { date, amount, type, category_id, account_id, to_account_id, note } = req.body;
  const updateBal = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');

  // Reverse old effects
  if (tx.type === 'EXPENSE')  updateBal.run(tx.amount, tx.account_id);
  if (tx.type === 'INCOME')   updateBal.run(-tx.amount, tx.account_id);
  if (tx.type === 'TRANSFER') { updateBal.run(tx.amount, tx.account_id); updateBal.run(-tx.amount, tx.to_account_id); }

  db.prepare(`UPDATE transactions SET date=?,amount=?,type=?,category_id=?,account_id=?,to_account_id=?,note=? WHERE id=?`)
    .run(date, amount, type, category_id ?? null, account_id ?? null, to_account_id ?? null, note ?? '', id);

  // Apply new effects
  if (type === 'EXPENSE')  updateBal.run(-amount, account_id);
  if (type === 'INCOME')   updateBal.run(amount, account_id);
  if (type === 'TRANSFER') { updateBal.run(-amount, account_id); updateBal.run(amount, to_account_id); }

  res.json({ ok: true });
});

app.patch('/api/accounts/reorder', (req, res) => {
  const { order } = req.body;
  const stmt = db.prepare('UPDATE accounts SET sort_order=? WHERE id=?');
  db.exec('BEGIN');
  try {
    for (const item of order) stmt.run(item.sort_order, item.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: e.message });
  }
  res.json({ ok: true });
});

app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

app.get('/api/transactions', (req, res) => {
  const { limit = 50, offset = 0, month, account_id, category_id, type } = req.query;
  const where = [];
  const params = [];

  if (month)       { where.push("strftime('%Y-%m', t.date) = ?"); params.push(month); }
  if (account_id)  { where.push('(t.account_id = ? OR t.to_account_id = ?)'); params.push(Number(account_id), Number(account_id)); }
  if (category_id) { where.push('t.category_id = ?'); params.push(Number(category_id)); }
  if (type)        { where.push('t.type = ?'); params.push(type); }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT t.*,
      c.name as category_name, c.emoji as category_emoji,
      a.name as account_name, a.emoji as account_emoji,
      ta.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    ${w}
    ORDER BY t.date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const total = db.prepare(`SELECT COUNT(*) as c FROM transactions t ${w}`).get(...params).c;
  res.json({ rows, total });
});

app.post('/api/transactions', (req, res) => {
  const { date, amount, type, category_id, account_id, to_account_id, note } = req.body;
  const r = db.prepare(`
    INSERT INTO transactions (date, amount, type, category_id, account_id, to_account_id, note)
    VALUES (?,?,?,?,?,?,?)
  `).run(date, amount, type, category_id ?? null, account_id ?? null, to_account_id ?? null, note ?? '');

  const updateBal = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');
  if (type === 'EXPENSE')  updateBal.run(-amount, account_id);
  if (type === 'INCOME')   updateBal.run(amount, account_id);
  if (type === 'TRANSFER') { updateBal.run(-amount, account_id); updateBal.run(amount, to_account_id); }

  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/transactions/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(req.params.id));
  if (!tx) return res.status(404).json({ error: 'not found' });

  const updateBal = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');
  if (tx.type === 'EXPENSE')  updateBal.run(tx.amount, tx.account_id);
  if (tx.type === 'INCOME')   updateBal.run(-tx.amount, tx.account_id);
  if (tx.type === 'TRANSFER') { updateBal.run(tx.amount, tx.account_id); updateBal.run(-tx.amount, tx.to_account_id); }

  db.prepare('DELETE FROM transactions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/stats/monthly', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month required' });

  const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='INCOME' AND strftime('%Y-%m',date)=?`).get(month).t;
  const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='EXPENSE' AND strftime('%Y-%m',date)=?`).get(month).t;
  const byCategory = db.prepare(`
    SELECT c.id, c.name, c.emoji, SUM(t.amount) as total, t.type
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.type IN ('EXPENSE','INCOME') AND strftime('%Y-%m', t.date) = ?
    GROUP BY c.id, t.type ORDER BY total DESC
  `).all(month);

  res.json({ income, expense, byCategory });
});

// ─── Export / Import ─────────────────────────────────────────────────────────

app.get('/api/export', (req, res) => {
  const accounts     = db.prepare('SELECT * FROM accounts ORDER BY sort_order, id').all();
  const categories   = db.prepare('SELECT * FROM categories ORDER BY id').all();
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY date, id').all();
  const payload = { version: 1, exported_at: new Date().toISOString(), accounts, categories, transactions };
  const filename = `budget-backup-${new Date().toISOString().slice(0,10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(payload);
});

app.get('/api/export/xlsx', (req, res) => {
  const rows = db.prepare(`
    SELECT
      t.date as "Дата",
      CASE t.type WHEN 'EXPENSE' THEN 'Расход' WHEN 'INCOME' THEN 'Доход' ELSE 'Перевод' END as "Тип",
      COALESCE(c.name, '') as "Категория",
      CASE WHEN t.type='EXPENSE' THEN -t.amount ELSE t.amount END as "Сумма",
      COALESCE(a.name, '') as "Счёт",
      COALESCE(ta.name, '') as "Счёт (куда)",
      COALESCE(t.note, '') as "Заметка"
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    ORDER BY t.date DESC, t.id DESC
  `).all();

  const accRows = db.prepare('SELECT name as "Счёт", balance as "Баланс" FROM accounts ORDER BY sort_order').all();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Операции');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accRows), 'Счета');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `budget-${new Date().toISOString().slice(0,10)}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

app.post('/api/import', (req, res) => {
  const { version, accounts, categories, transactions } = req.body;
  if (!accounts || !categories || !transactions) return res.status(400).json({ error: 'invalid backup' });

  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM accounts');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('accounts','categories','transactions')");

    const insAcc = db.prepare('INSERT INTO accounts (id,name,emoji,color_hex,balance,sort_order) VALUES (?,?,?,?,?,?)');
    for (const a of accounts) insAcc.run(a.id, a.name, a.emoji, a.color_hex, a.balance, a.sort_order ?? 0);

    const insCat = db.prepare('INSERT INTO categories (id,name,emoji,type) VALUES (?,?,?,?)');
    for (const c of categories) insCat.run(c.id, c.name, c.emoji, c.type);

    const insTx = db.prepare('INSERT INTO transactions (id,date,amount,type,category_id,account_id,to_account_id,note) VALUES (?,?,?,?,?,?,?,?)');
    for (const t of transactions) insTx.run(t.id, t.date, t.amount, t.type, t.category_id, t.account_id, t.to_account_id, t.note ?? '');

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: e.message });
  }
  res.json({ ok: true, accounts: accounts.length, transactions: transactions.length });
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/dist/index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.send('Frontend not built yet. Run: cd client && npm run build');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Budget server running on http://localhost:${PORT}`);
});
