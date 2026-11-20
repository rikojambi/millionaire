/**
 * Database Module for Who Wants to Be a Millionaire (Edukasi)
 * Uses Node.js 22+ built-in node:sqlite with fallback to in-memory/JSON.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'millionaire.sqlite');

let db = null;

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
}

function initDatabase() {
  db = new DatabaseSync(DB_PATH);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'teacher',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'bi-bookmark-star'
    );
  `);

  // Questions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      difficulty TEXT NOT NULL,
      level_tier INTEGER NOT NULL DEFAULT 1,
      question_text TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Game history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      category_name TEXT DEFAULT 'Semua Kategori',
      levels_completed INTEGER DEFAULT 0,
      highest_level INTEGER DEFAULT 1,
      final_prize INTEGER DEFAULT 0,
      final_prize_text TEXT DEFAULT 'Rp 0',
      status TEXT DEFAULT 'game_over',
      duration_seconds INTEGER DEFAULT 0,
      played_at TEXT DEFAULT (datetime('now', 'localtime')),
      review_data TEXT
    );
  `);

  seedInitialData();
  return db;
}

function seedInitialData() {
  // Check users
  const userCheck = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCheck.count === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('guru123', salt);
    db.prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)').run('guru', hash, salt, 'teacher');
    console.log('[DB] Akun guru default dibuat (user: guru, pass: guru123)');
  }

  // Check categories
  const catCheck = db.prepare('SELECT count(*) as count FROM categories').get();
  if (catCheck.count === 0) {
    const cats = [
      ['Sains & IPA', 'Biologi, Fisika, Kimia dan Alam Sekitar', 'bi-atom'],
      ['Matematika', 'Aritmetika, Aljabar, Geometri dan Logika', 'bi-calculator'],
      ['IPS & Sejarah', 'Geografi, Sejarah Indonesia dan Dunia, Sosial', 'bi-globe-americas'],
      ['Bahasa Indonesia', 'Tata Bahasa, Peribahasa, Sastra, Kosakata', 'bi-book'],
      ['Teknologi & Informatika', 'Komputer, Internet, Coding dan Digital', 'bi-laptop'],
      ['Pengetahuan Umum', 'Wawasan Nusantara, Budaya, Seni dan Tokoh Dunia', 'bi-award']
    ];
    const insertCat = db.prepare('INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)');
    for (const c of cats) {
      insertCat.run(c[0], c[1], c[2]);
    }
    console.log('[DB] Kategori default berhasil dibuat');
  }

  // Check settings
  const settingsCheck = db.prepare('SELECT count(*) as count FROM game_settings').get();
  if (settingsCheck.count === 0) {
    const defaultLadder = [
      { level: 1, prize: 50000, prize_text: 'Rp 50.000', is_safe: false },
      { level: 2, prize: 100000, prize_text: 'Rp 100.000', is_safe: false },
      { level: 3, prize: 200000, prize_text: 'Rp 200.000', is_safe: false },
      { level: 4, prize: 500000, prize_text: 'Rp 500.000', is_safe: false },
      { level: 5, prize: 1000000, prize_text: 'Rp 1.000.000', is_safe: true },
      { level: 6, prize: 2000000, prize_text: 'Rp 2.000.000', is_safe: false },
      { level: 7, prize: 4000000, prize_text: 'Rp 4.000.000', is_safe: false },
      { level: 8, prize: 8000000, prize_text: 'Rp 8.000.000', is_safe: false },
      { level: 9, prize: 16000000, prize_text: 'Rp 16.000.000', is_safe: false },
      { level: 10, prize: 32000000, prize_text: 'Rp 32.000.000', is_safe: true },
      { level: 11, prize: 64000000, prize_text: 'Rp 64.000.000', is_safe: false },
      { level: 12, prize: 125000000, prize_text: 'Rp 125.000.000', is_safe: false },
      { level: 13, prize: 250000000, prize_text: 'Rp 250.000.000', is_safe: false },
      { level: 14, prize: 500000000, prize_text: 'Rp 500.000.000', is_safe: false },
      { level: 15, prize: 1000000000, prize_text: 'Rp 1.000.000.000', is_safe: true }
    ];

    const insertSetting = db.prepare('INSERT INTO game_settings (key, value) VALUES (?, ?)');
    insertSetting.run('ladder', JSON.stringify(defaultLadder));
    insertSetting.run('timer_seconds', '45');
    insertSetting.run('timer_enabled', 'true');
    insertSetting.run('lifelines', JSON.stringify({
      fifty_fifty: true,
      audience: true,
      switch_question: true
    }));
    insertSetting.run('sound_enabled', 'true');
    insertSetting.run('school_title', 'WHO WANTS TO BE A MILLIONAIRE - EDISI EDUKASI KELAS');
    console.log('[DB] Pengaturan game default berhasil disimpan');
  }

  // Check questions
  const qCheck = db.prepare('SELECT count(*) as count FROM questions').get();
  if (qCheck.count === 0) {
    seedSampleQuestions();
  }
}

// Sample questions dataset with educational value
function seedSampleQuestions() {
  const categoriesList = db.prepare('SELECT id, name FROM categories').all();
  const catMap = {};
  for (const c of categoriesList) {
    catMap[c.name] = c.id;
  }

  // Sample SVG illustrative images for diagram questions
  const svgTriangle = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><polygon points="60,160 260,160 60,40" fill="%231e3a8a" stroke="%2338bdf8" stroke-width="4"/><text x="40" y="105" fill="%23f8fafc" font-size="18" font-family="sans-serif">a = 6 cm</text><text x="145" y="185" fill="%23f8fafc" font-size="18" font-family="sans-serif">b = 8 cm</text><text x="175" y="90" fill="%23facc15" font-weight="bold" font-size="20" font-family="sans-serif">c = ?</text><rect x="60" y="140" width="20" height="20" fill="none" stroke="%23f8fafc" stroke-width="2"/></svg>';
  const svgCell = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><ellipse cx="160" cy="100" rx="130" ry="80" fill="%23064e3b" stroke="%2310b981" stroke-width="4"/><circle cx="160" cy="100" r="35" fill="%231e1b4b" stroke="%23a855f7" stroke-width="3"/><circle cx="160" cy="100" r="14" fill="%23f43f5e"/><text x="110" y="105" fill="%23ffffff" font-size="12" font-family="sans-serif">Nukleus</text><text x="80" y="45" fill="%23fde047" font-weight="bold" font-size="16" font-family="sans-serif">Organel Fotosintesis = ?</text></svg>';

  const rawQuestions = [
    // TIER 1 (Level 1 - 5: MUDAH)
    {
      cat: 'Sains & IPA',
      diff: 'mudah',
      tier: 1,
      q: 'Planet apakah yang terdekat dengan Matahari dalam tata surya kita?',
      img: '',
      a: 'Venus',
      b: 'Merkurius',
      c: 'Mars',
      d: 'Bumi',
      ans: 'B',
      exp: 'Merkurius adalah planet terdekat dari Matahari dengan jarak rata-rata sekitar 57,9 juta km.'
    },
    {
      cat: 'Matematika',
      diff: 'mudah',
      tier: 1,
      q: 'Berapakah hasil dari 15 × 8 - 20?',
      img: '',
      a: '100',
      b: '110',
      c: '120',
      d: '90',
      ans: 'A',
      exp: 'Menurut urutan operasi hitung matematika: (15 × 8) = 120, lalu 120 - 20 = 100.'
    },
    {
      cat: 'Bahasa Indonesia',
      diff: 'mudah',
      tier: 1,
      q: 'Antonim atau lawan kata dari "Sombong" adalah...',
      img: '',
      a: 'Tinggi hati',
      b: 'Rendah hati',
      c: 'Besar kepala',
      d: 'Rendah diri',
      ans: 'B',
      exp: 'Sombong memiliki makna tinggi hati atau angkuh, lawan katanya adalah rendah hati (tawadhu).'
    },
    {
      cat: 'IPS & Sejarah',
      diff: 'mudah',
      tier: 1,
      q: 'Siapakah tokoh yang menjahit bendera Sang Saka Merah Putih pertama kali?',
      img: '',
      a: 'R.A. Kartini',
      b: 'Cut Nyak Dien',
      c: 'Ibu Fatmawati',
      d: 'Dewi Sartika',
      ans: 'C',
      exp: 'Ibu Fatmawati, istri dari Presiden Soekarno, menjahit bendera pusaka Merah Putih untuk proklamasi 1945.'
    },
    {
      cat: 'Teknologi & Informatika',
      diff: 'mudah',
      tier: 1,
      q: 'Komponen komputer yang berfungsi sebagai otak pemroses utama data dinamakan...',
      img: '',
      a: 'RAM',
      b: 'Hard Disk',
      c: 'Monitor',
      d: 'CPU (Processor)',
      ans: 'D',
      exp: 'CPU (Central Processing Unit) sering disebut sebagai otak dari komputer karena bertugas memproses instruksi program.'
    },
    {
      cat: 'Pengetahuan Umum',
      diff: 'mudah',
      tier: 1,
      q: 'Alat musik tradisional Sasando berasal dari provinsi...',
      img: '',
      a: 'Nusa Tenggara Timur',
      b: 'Maluku',
      c: 'Papua Barat',
      d: 'Sumatera Barat',
      ans: 'A',
      exp: 'Sasando merupakan alat musik petik berdawai dari Pulau Rote, Nusa Tenggara Timur (NTT).'
    },
    {
      cat: 'Sains & IPA',
      diff: 'mudah',
      tier: 1,
      q: 'Gas apakah yang diserap oleh tumbuhan hijau pada proses fotosintesis?',
      img: '',
      a: 'Oksigen (O2)',
      b: 'Karbon Dioksida (CO2)',
      c: 'Nitrogen (N2)',
      d: 'Helium (He)',
      ans: 'B',
      exp: 'Tumbuhan menyerap Karbon Dioksida (CO2) dan air dengan bantuan sinar matahari untuk menghasilkan glukosa dan oksigen.'
    },
    {
      cat: 'Matematika',
      diff: 'mudah',
      tier: 1,
      q: 'Sebuah persegi memiliki panjang sisi 12 cm. Berapakah luas persegi tersebut?',
      img: '',
      a: '48 cm²',
      b: '120 cm²',
      c: '144 cm²',
      d: '154 cm²',
      ans: 'C',
      exp: 'Rumus luas persegi adalah Sisi × Sisi = 12 × 12 = 144 cm².'
    },
    {
      cat: 'IPS & Sejarah',
      diff: 'mudah',
      tier: 1,
      q: 'Ibu kota negara Australia adalah...',
      img: '',
      a: 'Sydney',
      b: 'Melbourne',
      c: 'Canberra',
      d: 'Brisbane',
      ans: 'C',
      exp: 'Ibu kota resmi Australia adalah Canberra, bukan Sydney ataupun Melbourne.'
    },
    {
      cat: 'Bahasa Indonesia',
      diff: 'mudah',
      tier: 1,
      q: 'Peribahasa "Air beriak tanda tak dalam" memiliki makna...',
      img: '',
      a: 'Orang yang rajin menabung',
      b: 'Orang yang banyak bicara biasanya kurang berilmu',
      c: 'Orang yang sabar selalu beruntung',
      d: 'Sungai yang mengalir deras berbahaya',
      ans: 'B',
      exp: 'Peribahasa ini mengibaratkan orang yang banyak membual atau banyak cakap sesungguhnya tidak banyak memiliki ilmu pengetahuan.'
    },
    {
      cat: 'Teknologi & Informatika',
      diff: 'mudah',
      tier: 1,
      q: 'Kombinasi tombol keyboard pintas (shortcut) untuk menyalin (Copy) teks adalah...',
      img: '',
      a: 'Ctrl + V',
      b: 'Ctrl + X',
      c: 'Ctrl + C',
      d: 'Ctrl + Z',
      ans: 'C',
      exp: 'Ctrl + C digunakan untuk Copy (menyalin), sedangkan Ctrl + V untuk Paste dan Ctrl + X untuk Cut.'
    },
    {
      cat: 'Pengetahuan Umum',
      diff: 'mudah',
      tier: 1,
      q: 'Mata uang resmi yang digunakan di negara Jepang adalah...',
      img: '',
      a: 'Won',
      b: 'Yuan',
      c: 'Yen',
      d: 'Ringgit',
      ans: 'C',
      exp: 'Yen adalah mata uang resmi Jepang. Won adalah mata uang Korea dan Yuan adalah Tiongkok.'
    },

    // TIER 2 (Level 6 - 10: SEDANG)
    {
      cat: 'Matematika',
      diff: 'sedang',
      tier: 2,
      q: 'Perhatikan gambar segitiga siku-siku berikut! Berdasarkan teorema Pythagoras, berapakah panjang sisi miring (c)?',
      img: svgTriangle,
      a: '9 cm',
      b: '10 cm',
      c: '12 cm',
      d: '14 cm',
      ans: 'B',
      exp: 'Teorema Pythagoras: c² = a² + b² = 6² + 8² = 36 + 64 = 100, sehingga c = √100 = 10 cm.'
    },
    {
      cat: 'Sains & IPA',
      diff: 'sedang',
      tier: 2,
      q: 'Perhatikan bagan sel tumbuhan berikut! Organel sel yang mengandung klorofil untuk fotosintesis adalah...',
      img: svgCell,
      a: 'Mitokondria',
      b: 'Kloroplas',
      c: 'Ribosom',
      d: 'Badan Golgi',
      ans: 'B',
      exp: 'Kloroplas adalah plastida yang mengandung pigmen hijau (klorofil) tempat berlangsungnya reaksi fotosintesis pada tumbuhan.'
    },
    {
      cat: 'IPS & Sejarah',
      diff: 'sedang',
      tier: 2,
      q: 'Perjanjian Renville pada tanggal 17 Januari 1948 berlangsung di atas kapal perang milik negara...',
      img: '',
      a: 'Inggris',
      b: 'Belanda',
      c: 'Amerika Serikat',
      d: 'Australia',
      ans: 'C',
      exp: 'Perundingan Renville dilaksanakan di atas kapal pengangkut milik Angkatan Laut Amerika Serikat bernama USS Renville.'
    },
    {
      cat: 'Bahasa Indonesia',
      diff: 'sedang',
      tier: 2,
      q: 'Manakah penulisan kata baku dalam Bahasa Indonesia yang tepat menurut KBBI?',
      img: '',
      a: 'Apotik, Praktek, Resiko',
      b: 'Apotek, Praktik, Risiko',
      c: 'Apotek, Praktek, Resiko',
      d: 'Apotik, Praktik, Risiko',
      ans: 'B',
      exp: 'Bentuk baku menurut KBBI adalah: Apotek (bukan apotik), Praktik (bukan praktek), dan Risiko (bukan resiko).'
    },
    {
      cat: 'Teknologi & Informatika',
      diff: 'sedang',
      tier: 2,
      q: 'Protokol internet yang digunakan untuk transfer data web secara aman dan terenkripsi adalah...',
      img: '',
      a: 'HTTP',
      b: 'FTP',
      c: 'HTTPS',
      d: 'SMTP',
      ans: 'C',
      exp: 'HTTPS (Hypertext Transfer Protocol Secure) menggunakan enkripsi TLS/SSL untuk mengamankan pertukaran data pada peramban web.'
    },
    {
      cat: 'Pengetahuan Umum',
      diff: 'sedang',
      tier: 2,
      q: 'Siapakah penerima Penghargaan Nobel Fisika pertama di dunia pada tahun 1901 atas penemuan Sinar-X?',
      img: '',
      a: 'Albert Einstein',
      b: 'Wilhelm Conrad Röntgen',
      c: 'Marie Curie',
      d: 'Niels Bohr',
      ans: 'B',
      exp: 'Wilhelm Conrad Röntgen dianugerahi Nobel Fisika pertama pada tahun 1901 atas jasanya menemukan radiasi elektromagnetik yang dikenal sebagai sinar-X.'
    },
    {
      cat: 'Sains & IPA',
      diff: 'sedang',
      tier: 2,
      q: 'Perubahan wujud zat dari bentuk gas langsung menjadi zat padat tanpa mencair disebut...',
      img: '',
      a: 'Mengkristal (Deposisi)',
      b: 'Menyublim',
      c: 'Mengembun',
      d: 'Membeku',
      ans: 'A',
      exp: 'Deposisi (mengkristal) adalah perubahan wujud dari gas langsung ke padat, contohnya pembentukan salju dari uap air di awan.'
    },
    {
      cat: 'Matematika',
      diff: 'sedang',
      tier: 2,
      q: 'Jika 3x + 7 = 28, berapakah nilai dari 2x - 3?',
      img: '',
      a: '11',
      b: '14',
      c: '7',
      d: '9',
      ans: 'A',
      exp: '3x = 28 - 7 = 21, maka x = 7. Nilai 2x - 3 = 2(7) - 3 = 14 - 3 = 11.'
    },
    {
      cat: 'IPS & Sejarah',
      diff: 'sedang',
      tier: 2,
      q: 'Selat yang menghubungkan Pulau Sumatera dan Pulau Jawa adalah...',
      img: '',
      a: 'Selat Malaka',
      b: 'Selat Sunda',
      c: 'Selat Lombok',
      d: 'Selat Makassar',
      ans: 'B',
      exp: 'Selat Sunda memisahkan Pulau Jawa dan Pulau Sumatera, sekaligus menghubungkan Laut Jawa dengan Samudra Hindia.'
    },
    {
      cat: 'Bahasa Indonesia',
      diff: 'sedang',
      tier: 2,
      q: 'Majas yang membandingkan benda mati seolah-olah memiliki sifat manusiawi disebut majas...',
      img: '',
      a: 'Metafora',
      b: 'Hiperbola',
      c: 'Personifikasi',
      d: 'Litotes',
      ans: 'C',
      exp: 'Personifikasi melekatkan perilaku atau sifat manusia kepada benda mati, contoh: "Angin malam memeluk erat tubuhku".'
    },
    {
      cat: 'Teknologi & Informatika',
      diff: 'sedang',
      tier: 2,
      q: 'Dalam sistem bilangan biner, angka desimal 13 dituliskan sebagai...',
      img: '',
      a: '1101',
      b: '1011',
      c: '1110',
      d: '1001',
      ans: 'A',
      exp: '13 dalam biner = 8 + 4 + 0 + 1 = 1101₂.'
    },
    {
      cat: 'Pengetahuan Umum',
      diff: 'sedang',
      tier: 2,
      q: 'Gunung tertinggi di benua Afrika yang memiliki salju abadi di puncaknya adalah...',
      img: '',
      a: 'Gunung Kenya',
      b: 'Gunung Everest',
      c: 'Gunung Kilimanjaro',
      d: 'Gunung Elbrus',
      ans: 'C',
      exp: 'Gunung Kilimanjaro di Tanzania memiliki ketinggian 5.895 mdpl dan merupakan puncak tertinggi di benua Afrika.'
    },

    // TIER 3 (Level 11 - 15: SULIT / LEVEL TINGGI)
    {
      cat: 'Sains & IPA',
      diff: 'sulit',
      tier: 3,
      q: 'Unsur kimia apakah yang memiliki nomor atom 79 pada tabel periodik unsur?',
      img: '',
      a: 'Perak (Ag)',
      b: 'Emas (Au)',
      c: 'Platina (Pt)',
      d: 'Tembaga (Cu)',
      ans: 'B',
      exp: 'Emas memiliki lambang kimia Au (dari bahasa Latin Aurum) dengan nomor atom 79.'
    },
    {
      cat: 'Matematika',
      diff: 'sulit',
      tier: 3,
      q: 'Berapakah nilai turunan pertama f\'(x) dari f(x) = 4x³ - 5x² + 7x - 12 pada x = 2?',
      img: '',
      a: '28',
      b: '35',
      c: '42',
      d: '31',
      ans: 'B',
      exp: 'Turunan f\'(x) = 12x² - 10x + 7. Untuk x = 2: f\'(2) = 12(4) - 10(2) + 7 = 48 - 20 + 7 = 35.'
    },
    {
      cat: 'IPS & Sejarah',
      diff: 'sulit',
      tier: 3,
      q: 'Konferensi Asia Afrika (KAA) pertama diselenggarakan di Bandung pada tahun 1955. Siapakah Sekretaris Jenderal KAA tersebut?',
      img: '',
      a: 'Ruslan Abdulgani',
      b: 'Ali Sastroamidjojo',
      c: 'Mohammad Hatta',
      d: 'Soebandrio',
      ans: 'A',
      exp: 'Ruslan Abdulgani ditunjuk sebagai Sekretaris Jenderal Konferensi Asia Afrika yang diselenggarakan di Gedung Merdeka Bandung.'
    },
    {
      cat: 'Teknologi & Informatika',
      diff: 'sulit',
      tier: 3,
      q: 'Algoritma pengurutan data (sorting) yang memiliki kompleksitas waktu kasus terburuk O(n log n) dan berbasis teknik Divide and Conquer adalah...',
      img: '',
      a: 'Bubble Sort',
      b: 'Insertion Sort',
      c: 'Merge Sort',
      d: 'Quick Sort',
      ans: 'C',
      exp: 'Merge Sort menjamin performa O(n log n) di semua kasus (terburuk, rata-rata, terbaik) dengan teknik membagi dan menggabungkan sub-array.'
    },
    {
      cat: 'Bahasa Indonesia',
      diff: 'sulit',
      tier: 3,
      q: 'Istilah tata bahasa yang menyatakan hubungan makna antar kata di mana makna satu kata tercakup dalam kata yang lebih umum (misal: "mawar" terhadap "bunga") adalah...',
      img: '',
      a: 'Hiponim',
      b: 'Hipernim',
      c: 'Polisemi',
      d: 'Homonim',
      ans: 'A',
      exp: 'Hiponim adalah kata yang maknanya tercakup di dalam kata yang lebih luas (hipernim). Mawar adalah hiponim dari bunga.'
    },
    {
      cat: 'Pengetahuan Umum',
      diff: 'sulit',
      tier: 3,
      q: 'Naskah kuno "Kitab Sutasoma" karya Mpu Tantular yang memuat semboyan "Bhinneka Tunggal Ika" ditulis pada masa kejayaan kerajaan...',
      img: '',
      a: 'Singasari',
      b: 'Sriwijaya',
      c: 'Majapahit',
      d: 'Mataram Kuno',
      ans: 'C',
      exp: 'Kakawin Sutasoma dikarang oleh Mpu Tantular pada abad ke-14 pada masa pemerintahan Raja Hayam Wuruk di Kerajaan Majapahit.'
    },
    {
      cat: 'Sains & IPA',
      diff: 'sulit',
      tier: 3,
      q: 'Hukum Termodinamika Ketiga menyatakan bahwa...',
      img: '',
      a: 'Energi tidak dapat diciptakan atau dimusnahkan',
      b: 'Entropi kristal murni mendekati nol ketika suhu mendekati nol mutlak (0 Kelvin)',
      c: 'Entropi alam semesta selalu meningkat',
      d: 'Dua sistem berada dalam kesetimbangan termal dengan sistem ketiga',
      ans: 'B',
      exp: 'Hukum Ketiga Termodinamika menyatakan entropi suatu sistem kristal sempurna pada suhu nol mutlak (0 Kelvin) bernilai tepat nol.'
    },
    {
      cat: 'Matematika',
      diff: 'sulit',
      tier: 3,
      q: 'Banyaknya susunan huruf berbeda yang dapat dibentuk dari kata "MATEMATIKA" adalah...',
      img: '',
      a: '151.200',
      b: '302.400',
      c: '75.600',
      d: '50.400',
      ans: 'A',
      exp: 'Jumlah huruf = 10 (M=2, A=3, T=2). Rumus permutasi dengan unsur berulang: 10! / (2! × 3! × 2!) = 3.628.800 / (2 × 6 × 2) = 151.200.'
    },
    {
      cat: 'IPS & Sejarah',
      diff: 'sulit',
      tier: 3,
      q: 'Perang Tiga Puluh Tahun (Thirty Years\' War) di Eropa berakhir dengan penandatanganan traktat bersejarah...',
      img: '',
      a: 'Perjanjian Versailles',
      b: 'Perjanjian Westphalia',
      c: 'Perjanjian Utrecht',
      d: 'Perjanjian Tordesillas',
      ans: 'B',
      exp: 'Perdamaian Westphalia (1648) mengakhiri Perang Tiga Puluh Tahun dan menjadi landasan sistem negara berdaulat modern.'
    },
    {
      cat: 'Teknologi & Informatika',
      diff: 'sulit',
      tier: 3,
      q: 'Dalam arsitektur kriptografi modern RSA, keamanan enkripsi didasarkan pada kesulitan matematis dari...',
      img: '',
      a: 'Faktorisasi bilangan prima yang sangat besar',
      b: 'Perkalian matriks dimensi tinggi',
      c: 'Menghitung nilai logaritma natural',
      d: 'Penyelesaian persamaan diferensial parsial',
      ans: 'A',
      exp: 'Algoritma RSA memanfaatkan komputasi faktorisasi dua bilangan prima besar yang sangat sulit dan memerlukan waktu eksponensial untuk dipecahkan.'
    },
    {
      cat: 'Pengetahuan Umum',
      diff: 'sulit',
      tier: 3,
      q: 'Danau terdalam di dunia yang menampung sekitar 20% air tawar permukaan bumi yang tidak membeku adalah Danau...',
      img: '',
      a: 'Victoria',
      b: 'Titicaca',
      c: 'Baikal',
      d: 'Superior',
      ans: 'C',
      exp: 'Danau Baikal di Siberia, Rusia, adalah danau air tawar tertua dan terdalam di dunia dengan kedalaman maksimum mencapai 1.642 meter.'
    },
    {
      cat: 'Sains & IPA',
      diff: 'sulit',
      tier: 3,
      q: 'Partikel subatomik Higgs Boson yang memberikan massa pada partikel dasar lainnya sering dijuluki sebagai...',
      img: '',
      a: 'God Particle (Partikel Tuhan)',
      b: 'Dark Matter Particle',
      c: 'Ghost Particle',
      d: 'Cosmic Seed',
      ans: 'A',
      exp: 'Higgs Boson dijuluki "The God Particle" oleh Leon Lederman dalam bukunya tahun 1993, dan berhasil dibuktikan keberadaannya di CERN pada 2012.'
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO questions (category_id, difficulty, level_tier, question_text, image_url, option_a, option_b, option_c, option_d, correct_answer, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of rawQuestions) {
    const catId = catMap[q.cat] || 1;
    stmt.run(catId, q.diff, q.tier, q.q, q.img, q.a, q.b, q.c, q.d, q.ans, q.exp);
  }
  console.log(`[DB] Berhasil mengimpor ${rawQuestions.length} bank soal contoh edukatif!`);
}

// Database helper functions
const dbService = {
  getDb: () => db || initDatabase(),

  // Auth
  verifyUser(username, password) {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return null;
    const computedHash = hashPassword(password, user.salt);
    if (computedHash === user.password_hash) {
      return { id: user.id, username: user.username, role: user.role };
    }
    return null;
  },

  changePassword(username, newPassword) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE username = ?').run(hash, salt, username);
    return true;
  },

  // Questions
  getQuestions({ categoryId, difficulty, search } = {}) {
    let sql = `
      SELECT q.*, c.name as category_name
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (categoryId && categoryId !== 'all') {
      sql += ' AND q.category_id = ?';
      params.push(categoryId);
    }
    if (difficulty && difficulty !== 'all') {
      sql += ' AND q.difficulty = ?';
      params.push(difficulty);
    }
    if (search && search.trim()) {
      sql += ' AND (q.question_text LIKE ? OR q.explanation LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY q.level_tier ASC, q.id DESC';
    return db.prepare(sql).all(...params);
  },

  getQuestionById(id) {
    return db.prepare(`
      SELECT q.*, c.name as category_name 
      FROM questions q 
      LEFT JOIN categories c ON q.category_id = c.id 
      WHERE q.id = ?
    `).get(id);
  },

  createQuestion(data) {
    const stmt = db.prepare(`
      INSERT INTO questions (category_id, difficulty, level_tier, question_text, image_url, option_a, option_b, option_c, option_d, correct_answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tier = data.level_tier || (data.difficulty === 'sulit' ? 3 : (data.difficulty === 'sedang' ? 2 : 1));
    const result = stmt.run(
      data.category_id || 1,
      data.difficulty || 'mudah',
      tier,
      data.question_text,
      data.image_url || '',
      data.option_a,
      data.option_b,
      data.option_c,
      data.option_d,
      data.correct_answer.toUpperCase(),
      data.explanation || ''
    );
    return result.lastInsertRowid;
  },

  updateQuestion(id, data) {
    const tier = data.level_tier || (data.difficulty === 'sulit' ? 3 : (data.difficulty === 'sedang' ? 2 : 1));
    const stmt = db.prepare(`
      UPDATE questions 
      SET category_id = ?, difficulty = ?, level_tier = ?, question_text = ?, image_url = ?, 
          option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, explanation = ?
      WHERE id = ?
    `);
    stmt.run(
      data.category_id || 1,
      data.difficulty || 'mudah',
      tier,
      data.question_text,
      data.image_url || '',
      data.option_a,
      data.option_b,
      data.option_c,
      data.option_d,
      data.correct_answer.toUpperCase(),
      data.explanation || '',
      id
    );
    return true;
  },

  deleteQuestion(id) {
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    return true;
  },

  // Game gameplay: get randomized question bank for 15 levels
  getGameQuestions({ categoryId } = {}) {
    let sql = 'SELECT q.*, c.name as category_name FROM questions q LEFT JOIN categories c ON q.category_id = c.id';
    const params = [];
    if (categoryId && categoryId !== 'all') {
      sql += ' WHERE q.category_id = ?';
      params.push(categoryId);
    }
    const allQ = db.prepare(sql).all(...params);

    // Group by tiers: tier 1 (easy), tier 2 (medium), tier 3 (hard)
    const tier1 = allQ.filter(q => q.level_tier === 1 || q.difficulty === 'mudah');
    const tier2 = allQ.filter(q => q.level_tier === 2 || q.difficulty === 'sedang');
    const tier3 = allQ.filter(q => q.level_tier === 3 || q.difficulty === 'sulit');

    // Shuffle helper
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

    return {
      tier1: shuffle(tier1),
      tier2: shuffle(tier2),
      tier3: shuffle(tier3),
      all: shuffle(allQ)
    };
  },

  // Categories
  getCategories() {
    return db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  },

  createCategory(name, description = '') {
    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
    return result.lastInsertRowid;
  },

  // Settings
  getSettings() {
    const rows = db.prepare('SELECT * FROM game_settings').all();
    const settings = {};
    for (const r of rows) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    }
    return settings;
  },

  saveSetting(key, value) {
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    db.prepare(`
      INSERT INTO game_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, strVal);
  },

  resetLadderSettings() {
    const defaultLadder = [
      { level: 1, prize: 50000, prize_text: 'Rp 50.000', is_safe: false },
      { level: 2, prize: 100000, prize_text: 'Rp 100.000', is_safe: false },
      { level: 3, prize: 200000, prize_text: 'Rp 200.000', is_safe: false },
      { level: 4, prize: 500000, prize_text: 'Rp 500.000', is_safe: false },
      { level: 5, prize: 1000000, prize_text: 'Rp 1.000.000', is_safe: true },
      { level: 6, prize: 2000000, prize_text: 'Rp 2.000.000', is_safe: false },
      { level: 7, prize: 4000000, prize_text: 'Rp 4.000.000', is_safe: false },
      { level: 8, prize: 8000000, prize_text: 'Rp 8.000.000', is_safe: false },
      { level: 9, prize: 16000000, prize_text: 'Rp 16.000.000', is_safe: false },
      { level: 10, prize: 32000000, prize_text: 'Rp 32.000.000', is_safe: true },
      { level: 11, prize: 64000000, prize_text: 'Rp 64.000.000', is_safe: false },
      { level: 12, prize: 125000000, prize_text: 'Rp 125.000.000', is_safe: false },
      { level: 13, prize: 250000000, prize_text: 'Rp 250.000.000', is_safe: false },
      { level: 14, prize: 500000000, prize_text: 'Rp 500.000.000', is_safe: false },
      { level: 15, prize: 1000000000, prize_text: 'Rp 1.000.000.000', is_safe: true }
    ];
    this.saveSetting('ladder', defaultLadder);
    this.saveSetting('timer_seconds', '45');
    this.saveSetting('timer_enabled', 'true');
    this.saveSetting('lifelines', { fifty_fifty: true, audience: true, switch_question: true });
    return this.getSettings();
  },

  // Game History
  getHistory(limit = 50) {
    return db.prepare('SELECT * FROM game_history ORDER BY id DESC LIMIT ?').all(limit);
  },

  addHistory(entry) {
    const stmt = db.prepare(`
      INSERT INTO game_history (player_name, category_name, levels_completed, highest_level, final_prize, final_prize_text, status, duration_seconds, review_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      entry.player_name || 'Siswa',
      entry.category_name || 'Semua Kategori',
      entry.levels_completed || 0,
      entry.highest_level || 1,
      entry.final_prize || 0,
      entry.final_prize_text || 'Rp 0',
      entry.status || 'game_over',
      entry.duration_seconds || 0,
      typeof entry.review_data === 'object' ? JSON.stringify(entry.review_data) : (entry.review_data || '[]')
    );
    return result.lastInsertRowid;
  },

  clearHistory() {
    db.prepare('DELETE FROM game_history').run();
    return true;
  }
};

module.exports = {
  initDatabase,
  dbService
};
