/**
 * Server for Who Wants to Be a Millionaire (Edukasi)
 * Pure Node.js HTTP server with zero external dependencies.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');
const { initDatabase, dbService } = require('./database.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize SQLite database
initDatabase();

// In-memory auth tokens
const activeSessions = new Map();

function generateToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });
  return token;
}

function verifyAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Status Check
      if (pathname === '/api/status' && method === 'GET') {
        return sendJSON(res, 200, { ok: true, version: '1.0.0', time: new Date().toISOString() });
      }

      // 2. Auth Routes
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const user = dbService.verifyUser(body.username, body.password);
        if (!user) {
          return sendJSON(res, 401, { success: false, message: 'Username atau password guru salah!' });
        }
        const token = generateToken(user);
        return sendJSON(res, 200, { success: true, token, user });
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const session = verifyAuth(req);
        if (!session) {
          return sendJSON(res, 401, { authenticated: false });
        }
        return sendJSON(res, 200, { authenticated: true, user: session });
      }

      if (pathname === '/api/auth/change-password' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Akses ditolak' });
        const body = await parseBody(req);
        if (!body.newPassword || body.newPassword.length < 5) {
          return sendJSON(res, 400, { error: 'Password baru minimal 5 karakter' });
        }
        dbService.changePassword(session.username, body.newPassword);
        return sendJSON(res, 200, { success: true, message: 'Password berhasil diperbarui!' });
      }

      // 3. Categories Routes
      if (pathname === '/api/categories' && method === 'GET') {
        const categories = dbService.getCategories();
        return sendJSON(res, 200, categories);
      }

      if (pathname === '/api/categories' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat menambah kategori' });
        const body = await parseBody(req);
        if (!body.name) return sendJSON(res, 400, { error: 'Nama kategori wajib diisi' });
        const id = dbService.createCategory(body.name, body.description || '');
        return sendJSON(res, 201, { success: true, id, name: body.name });
      }

      // 4. Settings Routes
      if (pathname === '/api/settings' && method === 'GET') {
        const settings = dbService.getSettings();
        return sendJSON(res, 200, settings);
      }

      if (pathname === '/api/settings' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat mengubah pengaturan' });
        const body = await parseBody(req);
        for (const [key, val] of Object.entries(body)) {
          dbService.saveSetting(key, val);
        }
        return sendJSON(res, 200, { success: true, message: 'Pengaturan berhasil disimpan!' });
      }

      if (pathname === '/api/settings/reset' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat mereset pengaturan' });
        const resetSettings = dbService.resetLadderSettings();
        return sendJSON(res, 200, { success: true, settings: resetSettings, message: 'Pengaturan berhasil dikembalikan ke standar awal!' });
      }

      // 5. Game Session Questions (15 tiered questions + reserves for switch question lifeline)
      if (pathname === '/api/game/questions' && method === 'GET') {
        const categoryId = parsedUrl.query.categoryId;
        const pool = dbService.getGameQuestions({ categoryId });
        
        // We need 15 active levels (tier 1: L1-L5, tier 2: L6-L10, tier 3: L11-L15)
        // plus at least 2 extra reserve questions per tier for the "Switch Question" lifeline!
        const selected = [];
        const reserves = [];

        function pullQuestions(tierArr, count, fallbackArr) {
          const list = [...tierArr];
          const chosen = [];
          for (let i = 0; i < count; i++) {
            if (list.length > 0) {
              chosen.push(list.shift());
            } else if (fallbackArr.length > 0) {
              chosen.push(fallbackArr.shift());
            }
          }
          return { chosen, remaining: list };
        }

        const fallback = [...pool.all];

        const t1 = pullQuestions(pool.tier1, 5, fallback);
        const t2 = pullQuestions(pool.tier2, 5, fallback);
        const t3 = pullQuestions(pool.tier3, 5, fallback);

        selected.push(...t1.chosen, ...t2.chosen, ...t3.chosen);
        reserves.push(...t1.remaining, ...t2.remaining, ...t3.remaining, ...fallback);

        return sendJSON(res, 200, {
          total: selected.length,
          questions: selected,
          reserves: reserves.slice(0, 10)
        });
      }

      // 6. Question Bank CRUD
      if (pathname === '/api/questions' && method === 'GET') {
        const categoryId = parsedUrl.query.categoryId;
        const difficulty = parsedUrl.query.difficulty;
        const search = parsedUrl.query.search;
        const list = dbService.getQuestions({ categoryId, difficulty, search });
        return sendJSON(res, 200, list);
      }

      if (pathname.match(/^\/api\/questions\/(\d+)$/) && method === 'GET') {
        const id = parseInt(pathname.split('/')[3], 10);
        const q = dbService.getQuestionById(id);
        if (!q) return sendJSON(res, 404, { error: 'Soal tidak ditemukan' });
        return sendJSON(res, 200, q);
      }

      if (pathname === '/api/questions' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat menambah soal' });
        const body = await parseBody(req);
        if (!body.question_text || !body.option_a || !body.option_b || !body.option_c || !body.option_d || !body.correct_answer) {
          return sendJSON(res, 400, { error: 'Teks soal, opsi A-D, dan kunci jawaban wajib diisi!' });
        }
        const id = dbService.createQuestion(body);
        return sendJSON(res, 201, { success: true, id, message: 'Soal berhasil disimpan!' });
      }

      if (pathname.match(/^\/api\/questions\/(\d+)$/) && method === 'PUT') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat mengedit soal' });
        const id = parseInt(pathname.split('/')[3], 10);
        const body = await parseBody(req);
        dbService.updateQuestion(id, body);
        return sendJSON(res, 200, { success: true, message: 'Soal berhasil diperbarui!' });
      }

      if (pathname.match(/^\/api\/questions\/(\d+)$/) && method === 'DELETE') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat menghapus soal' });
        const id = parseInt(pathname.split('/')[3], 10);
        dbService.deleteQuestion(id);
        return sendJSON(res, 200, { success: true, message: 'Soal berhasil dihapus!' });
      }

      // 7. Bulk Import Questions (CSV / JSON)
      if (pathname === '/api/questions/bulk-import' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Akses ditolak' });
        const body = await parseBody(req);
        const items = Array.isArray(body.questions) ? body.questions : [];
        if (items.length === 0) {
          return sendJSON(res, 400, { error: 'Tidak ada data soal yang valid untuk diimpor' });
        }

        let importedCount = 0;
        for (const item of items) {
          if (item.question_text && item.option_a && item.option_b && item.option_c && item.option_d && item.correct_answer) {
            dbService.createQuestion({
              category_id: item.category_id || 1,
              difficulty: item.difficulty || 'mudah',
              level_tier: item.level_tier || (item.difficulty === 'sulit' ? 3 : (item.difficulty === 'sedang' ? 2 : 1)),
              question_text: item.question_text,
              image_url: item.image_url || '',
              option_a: item.option_a,
              option_b: item.option_b,
              option_c: item.option_c,
              option_d: item.option_d,
              correct_answer: item.correct_answer.toUpperCase().trim(),
              explanation: item.explanation || ''
            });
            importedCount++;
          }
        }
        return sendJSON(res, 200, { success: true, importedCount, message: `Berhasil mengimpor ${importedCount} soal!` });
      }

      // 8. Export CSV
      if (pathname === '/api/questions/export-csv' && method === 'GET') {
        const questions = dbService.getQuestions();
        const headers = ['Kategori', 'Tingkat Kesulitan', 'Teks Pertanyaan', 'URL Gambar', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Kunci Jawaban', 'Penjelasan / Pembahasan'];
        
        function escapeCsv(val) {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }

        const rows = [headers.map(escapeCsv).join(',')];
        for (const q of questions) {
          rows.push([
            escapeCsv(q.category_name || 'Pengetahuan Umum'),
            escapeCsv(q.difficulty),
            escapeCsv(q.question_text),
            escapeCsv(q.image_url || ''),
            escapeCsv(q.option_a),
            escapeCsv(q.option_b),
            escapeCsv(q.option_c),
            escapeCsv(q.option_d),
            escapeCsv(q.correct_answer),
            escapeCsv(q.explanation || '')
          ].join(','));
        }

        const csvContent = '\uFEFF' + rows.join('\r\n'); // Add UTF-8 BOM for Excel compatibility
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="bank_soal_millionaire.csv"'
        });
        return res.end(csvContent);
      }

      // 9. Upload Image for Question
      if (pathname === '/api/upload' && method === 'POST') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Hanya guru yang dapat mengunggah gambar' });
        const body = await parseBody(req);

        if (!body.data || !body.fileName) {
          return sendJSON(res, 400, { error: 'Data gambar atau nama file tidak valid' });
        }

        // Expected format: data:image/png;base64,iVBORw0...
        const matches = body.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return sendJSON(res, 400, { error: 'Format base64 gambar tidak valid' });
        }

        const ext = path.extname(body.fileName) || '.png';
        const safeName = `q_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const buffer = Buffer.from(matches[2], 'base64');
        const targetPath = path.join(UPLOADS_DIR, safeName);

        fs.writeFileSync(targetPath, buffer);
        const imageUrl = `/uploads/${safeName}`;

        return sendJSON(res, 200, {
          success: true,
          imageUrl,
          message: 'Gambar berhasil diunggah!'
        });
      }

      // 10. Game History
      if (pathname === '/api/history' && method === 'GET') {
        const history = dbService.getHistory(100);
        return sendJSON(res, 200, history);
      }

      if (pathname === '/api/history' && method === 'POST') {
        const body = await parseBody(req);
        const id = dbService.addHistory(body);
        return sendJSON(res, 201, { success: true, id });
      }

      if (pathname === '/api/history' && method === 'DELETE') {
        const session = verifyAuth(req);
        if (!session) return sendJSON(res, 403, { error: 'Akses ditolak' });
        dbService.clearHistory();
        return sendJSON(res, 200, { success: true, message: 'Riwayat permainan berhasil dibersihkan' });
      }

      return sendJSON(res, 404, { error: 'API route not found' });
    } catch (apiErr) {
      console.error('[API Error]', apiErr);
      return sendJSON(res, 500, { error: apiErr.message });
    }
  }

  // --- STATIC FILE SERVING ---
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for single-page app routes if not an asset
      const ext = path.extname(filePath);
      if (!ext || ext === '.html') {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(indexPath).pipe(res);
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  GAME SHOW: WHO WANTS TO BE A MILLIONAIRE (EDUKASI)   `);
  console.log(`  Aplikasi berjalan di: http://localhost:${PORT}        `);
  console.log(`  Login Guru Default:                                   `);
  console.log(`  - Username: guru                                      `);
  console.log(`  - Password: guru123                                   `);
  console.log(`=======================================================`);
});
