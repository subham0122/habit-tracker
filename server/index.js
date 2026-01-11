const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Middleware for basic logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// --- Auth Routes ---

app.post('/auth/register', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Name and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (name, password) VALUES ($1, $2) RETURNING id, name',
            [name, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Name and password required' });

    try {
        const result = await db.query('SELECT * FROM users WHERE name = $1', [name]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ id: user.id, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Habit Routes ---

// Get all habits and their logs for a user
app.get('/habits', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        // Fetch habits with an array of completed dates
        const query = `
      SELECT h.id, h.title, 
             COALESCE(
               json_agg(l.log_date) FILTER (WHERE l.log_date IS NOT NULL AND l.completed = true), 
               '[]'
             ) as completed_dates
      FROM habits h
      LEFT JOIN habit_logs l ON h.id = l.habit_id
      WHERE h.user_id = $1
      GROUP BY h.id
      ORDER BY h.id ASC;
    `;
        const result = await db.query(query, [userId]);

        // Format dates to YYYY-MM-DD
        const habits = result.rows.map(row => ({
            ...row,
            completed_dates: row.completed_dates.map(d => new Date(d).toISOString().split('T')[0])
        }));

        res.json(habits);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/habits', async (req, res) => {
    const { userId, title } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'User ID and title required' });

    try {
        const result = await db.query(
            'INSERT INTO habits (user_id, title) VALUES ($1, $2) RETURNING *',
            [userId, title]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/habits/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM habits WHERE id = $1', [id]);
        res.json({ message: 'Habit deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/habits/:id', async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        const result = await db.query('UPDATE habits SET title = $1 WHERE id = $2 RETURNING *', [title, id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle habit log
app.post('/habits/:id/log', async (req, res) => {
    const { id } = req.params;
    const { date } = req.body; // YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        // Check if log exists
        const check = await db.query(
            'SELECT * FROM habit_logs WHERE habit_id = $1 AND log_date = $2',
            [id, date]
        );

        let completed;
        if (check.rows.length > 0) {
            // Toggle
            completed = !check.rows[0].completed;
            await db.query(
                'UPDATE habit_logs SET completed = $1 WHERE id = $2',
                [completed, check.rows[0].id]
            );
        } else {
            // Insert
            completed = true;
            await db.query(
                'INSERT INTO habit_logs (habit_id, log_date, completed) VALUES ($1, $2, $3)',
                [id, date, completed]
            );
        }

        res.json({ date, completed });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
