const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const port = 3005;

const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend')));

require('dotenv').config();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function getUserId(username) {
  const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  return result.rows[0]?.id;
}

// === REGISTRACE A PŘIHLÁŠENÍ ===
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashed]);
    res.status(200).json({ message: 'Registrován.' });
  } catch {
    res.status(400).json({ error: 'Uživatel už existuje.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows.length) return res.status(400).json({ error: 'Neplatné údaje.' });

    const match = await bcrypt.compare(password, result.rows[0].password);
    if (match) res.json({ message: 'Přihlášen.' });
    else res.status(400).json({ error: 'Neplatné údaje.' });
  } catch {
    res.status(500).json({ error: 'Chyba serveru.' });
  }
});

// === TABULKY ===
app.post('/tables/create', async (req, res) => {
  const { name, type, password, ownerUsername, is_private } = req.body;
  try {
    const ownerId = await getUserId(ownerUsername);
    const result = await pool.query(
      'INSERT INTO tables (name, type, password, is_private, owner_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [name, type, password || null, is_private || false, ownerId]
    );
    const tableId = result.rows[0].id;
    await pool.query('INSERT INTO table_members (table_id, user_id) VALUES ($1, $2)', [tableId, ownerId]);
    res.json({ id: tableId });
  } catch (err) {
    console.error('Chyba při vytváření tabulky:', err);
    res.status(500).json({ error: 'Chyba serveru při vytváření tabulky' });
  }
});

app.get('/tables/public', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, COUNT(m.user_id) AS members, u.username AS owner
       FROM tables t
       LEFT JOIN table_members m ON t.id = m.table_id
       JOIN users u ON t.owner_id = u.id
       WHERE NOT t.is_private
       GROUP BY t.id, u.username`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Chyba při načítání veřejných tabulek.' });
  }
});

app.get('/tables', async (req, res) => {
  const { user } = req.query;
  try {
    const userId = await getUserId(user);
    const result = await pool.query(`
      SELECT t.*, tm.user_id
      FROM tables t
      JOIN table_members tm ON t.id = tm.table_id
      WHERE tm.user_id = $1
      ORDER BY t.created_at DESC
    `, [userId]);
    res.json({ tables: result.rows });
  } catch {
    res.status(500).json({ error: 'Chyba při načítání tabulek.' });
  }
});

app.post('/tables/join', async (req, res) => {
  const { tableId, username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM tables WHERE id = $1', [tableId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Tabulka neexistuje.' });

    const table = result.rows[0];
    const userId = await getUserId(username);

    if (table.password && table.password !== password) {
      return res.status(403).json({ error: 'Špatné heslo.' });
    }

    await pool.query('INSERT INTO table_members (table_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [tableId, userId]);
    res.json({ message: 'Připojeno.' });
  } catch {
    res.status(500).json({ error: 'Chyba při připojování.' });
  }
});

app.get('/table/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const table = await pool.query('SELECT * FROM tables WHERE id = $1', [id]);
    if (table.rows.length === 0) {
      return res.status(404).json({ error: 'Tabulka nenalezena' });
    }
    res.json({ table: table.rows[0] });
  } catch (err) {
    console.error('Chyba při načítání tabulky:', err);
    res.status(500).json({ error: 'Chyba při načítání tabulky.' });
  }
});

app.delete('/tables/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM table_entries WHERE table_id = $1', [id]);
    await pool.query('DELETE FROM table_members WHERE table_id = $1', [id]);
    await pool.query('DELETE FROM tables WHERE id = $1', [id]);
    res.json({ message: 'Tabulka odstraněna.' });
  } catch {
    res.status(500).json({ error: 'Chyba při mazání tabulky.' });
  }
});

// === ÚKOLY ===
app.post('/tables/:id/add', async (req, res) => {
  const tableId = req.params.id;
  const { username, content, due_date, priority } = req.body;
  try {
    const userId = await getUserId(username);
    await pool.query(
      'INSERT INTO table_entries (table_id, user_id, content, done, created_at, due_date, priority) VALUES ($1, $2, $3, false, NOW(), $4, $5)',
      [tableId, userId, content, due_date || null, priority || null]
    );
    res.status(200).json({ message: 'Úkol přidán.' });
  } catch {
    res.status(500).json({ error: 'Chyba při přidávání úkolu.' });
  }
});

app.get('/tables/:id/entries', async (req, res) => {
  const tableId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT e.id, e.content, e.done, e.created_at, e.due_date, e.priority, u.username
       FROM table_entries e
       JOIN users u ON e.user_id = u.id
       WHERE e.table_id = $1
       ORDER BY e.created_at ASC`,
      [tableId]
    );
    res.json({ entries: result.rows });
  } catch {
    res.status(500).json({ error: 'Chyba při získávání úkolů.' });
  }
});

app.post('/entries/:id/toggle', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('UPDATE table_entries SET done = NOT done WHERE id = $1', [id]);
    res.json({ message: 'Změněno.' });
  } catch {
    res.status(500).json({ error: 'Chyba při změně stavu úkolu.' });
  }
});


// === KOMENTÁŘE ===
app.get('/entries/:id/comments', async (req, res) => {
  const entryId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.entry_id = $1
       ORDER BY c.created_at ASC`,
      [entryId]
    );
    res.json({ comments: result.rows });
  } catch {
    res.status(500).json({ error: 'Chyba při načítání komentářů.' });
  }
});
app.post('/entries/:entryId/comments', async (req, res) => {
  const { entryId } = req.params;
  const { username, content } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const userId = userResult.rows[0]?.id;
    if (!userId) return res.status(404).json({ error: 'Uživatel nenalezen' });

    const insertResult = await pool.query(
      'INSERT INTO comments (entry_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [entryId, userId, content]
    );

    res.json({ id: insertResult.rows[0]?.id });
  } catch (err) {
    console.error('Chyba při přidávání komentáře:', err);
    res.status(500).json({ error: 'Chyba při přidávání komentáře' });
  }
});

app.delete('/comments/:id', async (req, res) => {
  const commentId = req.params.id;
  try {
    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ message: 'Komentář smazán.' });
  } catch {
    res.status(500).json({ error: 'Chyba při mazání komentáře.' });
  }
});

// === UŽIVATELÉ ===
app.get('/user-id', async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    res.json({ id: result.rows[0].id });
  } catch {
    res.status(500).json({ error: 'Chyba při načítání ID uživatele.' });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, password FROM users');
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Chyba při načítání uživatelů:', err);
    res.status(500).json({ error: 'Nepodařilo se načíst uživatele.' });
  }
});


app.delete('/admin/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // 1. Najít všechny tabulky které vlastnil
    const tables = await pool.query('SELECT id FROM tables WHERE owner_id = $1', [userId]);
    const tableIds = tables.rows.map(r => r.id);

    // 2. Pokud má tabulky, smažeme jejich data
    for (const tableId of tableIds) {
      await pool.query('DELETE FROM table_entries WHERE table_id = $1', [tableId]);
      await pool.query('DELETE FROM archived_entries WHERE table_id = $1', [tableId]);
      await pool.query('DELETE FROM table_members WHERE table_id = $1', [tableId]);
      await pool.query('DELETE FROM invites WHERE table_id = $1', [tableId]);
      await pool.query('DELETE FROM tables WHERE id = $1', [tableId]);
    }

    // 3. Smazat všechno ostatní spojené s uživatelem
    await pool.query('DELETE FROM table_members WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM invites WHERE sender_id = $1 OR receiver_id = $1', [userId]);

    // 4. Smazat samotného uživatele
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: '✅ Uživatel a jeho tabulky byly brutálně odstraněny.' });
  } catch (err) {
    console.error('❌ Chyba při brutálním mazání uživatele:', err);
    res.status(500).json({ error: 'Nelze odstranit uživatele.' });
  }
});

app.post('/invites', async (req, res) => {
  const { senderUsername, receiverUsername, tableId } = req.body;
  try {
    const sender = await pool.query('SELECT id FROM users WHERE username = $1', [senderUsername]);
    const receiver = await pool.query('SELECT id FROM users WHERE username = $1', [receiverUsername]);
    if (sender.rows.length === 0 || receiver.rows.length === 0) {
      return res.status(404).json({ error: 'Uživatel nenalezen.' });
    }

    await pool.query(
      `INSERT INTO invites (sender_id, receiver_id, table_id) VALUES ($1, $2, $3)`,
      [sender.rows[0].id, receiver.rows[0].id, tableId]
    );

    res.json({ message: 'Pozvánka odeslána.' });
  } catch (err) {
    console.error('Chyba při odesílání pozvánky:', err);
    res.status(500).json({ error: 'Chyba při odesílání pozvánky.' });
  }
});

app.get('/invites', async (req, res) => {
  const { receiver } = req.query;
  try {
    const user = await pool.query('SELECT id FROM users WHERE username = $1', [receiver]);
    if (user.rows.length === 0) return res.json({ invites: [] });

    const result = await pool.query(`
      SELECT i.id, u.username AS sender, t.name AS table_name, i.created_at
      FROM invites i
      JOIN users u ON i.sender_id = u.id
      JOIN tables t ON i.table_id = t.id
      WHERE i.receiver_id = $1 AND i.accepted IS NULL
      ORDER BY i.created_at DESC
    `, [user.rows[0].id]);

    res.json({ invites: result.rows });
  } catch (err) {
    console.error('Chyba při načítání inboxu:', err);
    res.status(500).json({ error: 'Chyba při načítání pozvánek.' });
  }
});

app.post('/invites/:id/respond', async (req, res) => {
  const inviteId = req.params.id;
  const { accept } = req.body;

  try {
    const invite = await pool.query('SELECT * FROM invites WHERE id = $1', [inviteId]);
    if (invite.rows.length === 0) return res.status(404).json({ error: 'Pozvánka nenalezena.' });

    await pool.query(
      'UPDATE invites SET accepted = $1 WHERE id = $2',
      [accept, inviteId]
    );

    if (accept) {
      await pool.query(
        'INSERT INTO table_members (table_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [invite.rows[0].table_id, invite.rows[0].receiver_id]
      );
    }

    res.json({ message: accept ? 'Pozvánka přijata.' : 'Pozvánka odmítnuta.' });
  } catch (err) {
    console.error('Chyba při zpracování odpovědi:', err);
    res.status(500).json({ error: 'Chyba při zpracování pozvánky.' });
  }
});

app.post('/tables/:id/leave', async (req, res) => {
  const tableId = req.params.id;
  const { username } = req.body;

  try {
    const user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'Uživatel nenalezen.' });

    await pool.query('DELETE FROM table_members WHERE table_id = $1 AND user_id = $2', [
      tableId,
      user.rows[0].id
    ]);

    res.json({ message: 'Tabulka opuštěna.' });
  } catch (err) {
    console.error('Chyba při opouštění tabulky:', err);
    res.status(500).json({ error: 'Chyba při opouštění tabulky.' });
  }
});

app.get('/tables/:id/archived', async (req, res) => {
  const tableId = req.params.id;
  try {
    const result = await pool.query(`
      SELECT a.id, a.content, a.created_at, a.archived_at, u.username
      FROM archived_entries a
      JOIN users u ON a.user_id = u.id
      WHERE a.table_id = $1
      ORDER BY a.archived_at DESC
    `, [tableId]);

    res.json({ entries: result.rows });
  } catch (err) {
    console.error('Chyba při načítání archivu:', err);
    res.status(500).json({ error: 'Chyba při načítání archivu.' });
  }
});

app.post('/tables/:id/archive-done', async (req, res) => {
  const tableId = req.params.id;
  try {
    // Přesunout hotové úkoly do archivu
    await pool.query(`
      INSERT INTO archived_entries (table_id, user_id, content, created_at)
      SELECT table_id, user_id, content, created_at
      FROM table_entries
      WHERE table_id = $1 AND done = true
    `, [tableId]);

    // Smazat je z původní tabulky
    await pool.query('DELETE FROM table_entries WHERE table_id = $1 AND done = true', [tableId]);

    res.json({ message: '✅ Úkoly archivovány.' });
  } catch (err) {
    console.error('Chyba při archivaci úkolů:', err);
    res.status(500).json({ error: 'Chyba při archivaci úkolů.' });
  }
});

app.post('/archived/:id/restore', async (req, res) => {
  const entryId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM archived_entries WHERE id = $1',
      [entryId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivovaný úkol nenalezen.' });
    }

    const entry = result.rows[0];

    await pool.query(`
      INSERT INTO table_entries (table_id, user_id, content, done, created_at)
      VALUES ($1, $2, $3, false, $4)
    `, [entry.table_id, entry.user_id, entry.content, entry.created_at]);

    await pool.query('DELETE FROM archived_entries WHERE id = $1', [entryId]);

    res.json({ message: '✅ Úkol obnoven.' });
  } catch (err) {
    console.error('Chyba při obnově úkolu:', err);
    res.status(500).json({ error: 'Chyba při obnovování úkolu.' });
  }
});

app.delete('/archived/:id', async (req, res) => {
  const entryId = req.params.id;
  try {
    await pool.query('DELETE FROM archived_entries WHERE id = $1', [entryId]);
    res.json({ message: '✅ Archivovaný úkol smazán.' });
  } catch (err) {
    console.error('Chyba při mazání archivovaného úkolu:', err);
    res.status(500).json({ error: 'Nelze smazat archivovaný úkol.' });
  }
});

app.delete('/archived/:tableId/clear', async (req, res) => {
  const { tableId } = req.params;
  try {
    await pool.query('DELETE FROM archived_entries WHERE table_id = $1', [tableId]);
    res.json({ message: 'Archiv byl vymazán.' });
  } catch (err) {
    console.error('Chyba při mazání archivu:', err);
    res.status(500).json({ error: 'Nelze vymazat archiv.' });
  }
});

app.get('/entries-for-user/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const userId = userResult.rows[0]?.id;
    if (!userId) return res.status(404).json({ error: 'Uživatel nenalezen' });

    const result = await pool.query(`
      SELECT e.content, e.due_date, e.priority, e.done
      FROM table_entries e
      JOIN table_members m ON e.table_id = m.table_id
      WHERE m.user_id = $1
    `, [userId]);

    res.json({ entries: result.rows });
  } catch (err) {
    console.error('Chyba při získávání všech úkolů pro uživatele:', err);
    res.status(500).json({ error: 'Chyba serveru.' });
  }
});

app.get('/user/:username/entries', async (req, res) => {
  const { username } = req.params;
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const userId = userResult.rows[0]?.id;
    if (!userId) return res.status(404).json({ error: 'Uživatel nenalezen' });

    const entriesResult = await pool.query(`
      SELECT e.*, t.name AS table_name
      FROM table_entries e
      JOIN tables t ON e.table_id = t.id
      JOIN table_members m ON m.table_id = e.table_id
      WHERE m.user_id = $1
      ORDER BY e.due_date ASC
    `, [userId]);

    res.json(entriesResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chyba při načítání úkolů uživatele' });
  }
});

// === SERVER ===
app.listen(port, () => {
  console.log(`✅ Server běží na http://localhost:${port}`);
});
