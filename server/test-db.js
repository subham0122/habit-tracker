const db = require('./db');

(async () => {
    try {
        console.log('Testing DB connection...');
        const res = await db.query('SELECT NOW()');
        console.log('DB Connection Successful:', res.rows[0]);
        // Also check if tables exist
        const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Tables:', tables.rows.map(r => r.table_name));
        process.exit(0);
    } catch (err) {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    }
})();
