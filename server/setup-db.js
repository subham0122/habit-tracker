const db = require('./db');

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_habit
        UNIQUE (user_id, title)
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id SERIAL PRIMARY KEY,
    habit_id INT NOT NULL,
    log_date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT fk_habit
        FOREIGN KEY (habit_id)
        REFERENCES habits(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_habit_day
        UNIQUE (habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON habit_logs(log_date);
`;

(async () => {
    try {
        console.log('Running Schema Migration...');
        await db.query(schema);
        console.log('Schema created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Schema Migration Failed:', err);
        process.exit(1);
    }
})();
