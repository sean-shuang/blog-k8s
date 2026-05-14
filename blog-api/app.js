const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const writePool = mysql.createPool({
  host: process.env.MYSQL_WRITE_HOST || 'mysql-slave',
  port: 3306,
  user: 'root',
  password: 'root123',
  database: 'blog',
});
const readPool = mysql.createPool({
  host: process.env.MYSQL_READ_HOST || 'mysql-slave',
  port: 3306,
  user: 'root',
  password: 'root123',
  database: 'blog',
});

const redisClient = redis.createClient({
  socket: { host: process.env.REDIS_HOST || 'redis', port: 6379 },
});
redisClient.connect().catch(console.error);
const CACHE_KEY = 'articles';

async function initDB() {
  const conn = await writePool.getConnection();
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM articles');
  if (rows[0].cnt === 0) {
    await conn.execute(
      "INSERT INTO articles (title, content) VALUES ('Hello Kubernetes', '这是我的第一篇博客，部署在 Kubernetes 上！')"
    );
  }
  conn.release();
}
initDB().catch(console.error);

app.get('/api/articles', async (req, res) => {
  try {
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) return res.json(JSON.parse(cached));
    const [rows] = await readPool.execute('SELECT id, title, created_at FROM articles ORDER BY created_at DESC');
    await redisClient.setEx(CACHE_KEY, 30, JSON.stringify(rows));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  try {
    const [rows] = await readPool.execute('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/articles', async (req, res) => {
  try {
    const { title, content } = req.body;
    await writePool.execute('INSERT INTO articles (title, content) VALUES (?, ?)', [title, content]);
    await redisClient.del(CACHE_KEY);
    res.status(201).json({ message: 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, () => console.log('Blog API running on port 8080'));
