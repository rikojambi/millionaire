/**
 * In-process Automated Verification Script
 */
const { dbService, initDatabase } = require('./database.js');
const fs = require('node:fs');
const path = require('node:path');

async function testBackend() {
  console.log('--- 1. Pengujian Database & Layanan Data ---');
  initDatabase();

  // Test Settings
  const settings = dbService.getSettings();
  console.log('✓ Settings loaded:', Object.keys(settings));
  if (!settings.ladder || settings.ladder.length !== 15) {
    throw new Error('Ladder harus memiliki 15 level');
  }
  console.log(`✓ Tangga hadiah: Level 1 (${settings.ladder[0].prize_text}) s/d Level 15 (${settings.ladder[14].prize_text})`);

  // Test Categories
  const categories = dbService.getCategories();
  console.log(`✓ Kategori materi (${categories.length}):`, categories.map(c => c.name).join(', '));

  // Test Questions
  const questions = dbService.getQuestions();
  console.log(`✓ Total bank soal tersedia: ${questions.length} butir`);
  if (questions.length < 15) {
    throw new Error('Bank soal kurang dari 15 butir');
  }

  // Test Game Questions Generation
  const gameQ = dbService.getGameQuestions();
  console.log(`✓ Pool soal game: Tier 1 (${gameQ.tier1.length}), Tier 2 (${gameQ.tier2.length}), Tier 3 (${gameQ.tier3.length})`);

  // Test Teacher Auth
  const authFail = dbService.verifyUser('guru', 'salah');
  if (authFail !== null) throw new Error('Password salah seharusnya ditolak');
  console.log('✓ Validasi password salah: Ditolak');

  const authSuccess = dbService.verifyUser('guru', 'guru123');
  if (!authSuccess || authSuccess.username !== 'guru') throw new Error('Password benar gagal diverifikasi');
  console.log('✓ Validasi guru default (user: guru, pass: guru123): Berhasil');

  // Test Question CRUD
  const newId = dbService.createQuestion({
    category_id: 1,
    difficulty: 'mudah',
    level_tier: 1,
    question_text: 'Berapakah jumlah kaki pada seekor kucing normal?',
    option_a: '2',
    option_b: '3',
    option_c: '4',
    option_d: '5',
    correct_answer: 'C',
    explanation: 'Kucing normal berkaki empat.'
  });
  console.log(`✓ Tambah soal baru (ID: ${newId})`);

  const fetched = dbService.getQuestionById(newId);
  if (!fetched || fetched.correct_answer !== 'C') throw new Error('Soal baru tidak sesuai');

  dbService.updateQuestion(newId, {
    category_id: 1,
    difficulty: 'mudah',
    level_tier: 1,
    question_text: 'Berapakah jumlah kaki pada seekor kucing normal? (Revisi)',
    option_a: '2',
    option_b: '3',
    option_c: '4',
    option_d: '5',
    correct_answer: 'C',
    explanation: 'Kucing adalah hewan mamalia berkaki empat.'
  });
  console.log(`✓ Edit soal (ID: ${newId})`);

  dbService.deleteQuestion(newId);
  console.log(`✓ Hapus soal (ID: ${newId})`);

  // Test Game History
  const histId = dbService.addHistory({
    player_name: 'Tim Cerdas Cermat',
    category_name: 'Sains & IPA',
    levels_completed: 15,
    highest_level: 15,
    final_prize: 1000000000,
    final_prize_text: 'Rp 1.000.000.000',
    status: 'won',
    duration_seconds: 450,
    review_data: [{ level: 1, question_text: 'Soal 1', is_correct: true }]
  });
  console.log(`✓ Simpan riwayat permainan juara (ID: ${histId})`);

  const history = dbService.getHistory();
  console.log(`✓ Riwayat tersimpan: ${history.length} entri (Terbaru: ${history[0].player_name} - ${history[0].final_prize_text})`);

  console.log('\n--- 2. Pengujian Berkas Frontend & Aset ---');
  const files = [
    'public/index.html',
    'public/css/style.css',
    'public/js/audio.js',
    'public/js/api.js',
    'public/js/ladder.js',
    'public/js/admin.js',
    'public/js/game.js',
    'public/js/app.js',
    'public/data/template_soal.csv',
    'jalankan_game.bat'
  ];

  for (const f of files) {
    const fullPath = path.join(__dirname, f);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File ${f} tidak ditemukan!`);
    }
    const stat = fs.statSync(fullPath);
    console.log(`✓ ${f} (${stat.size} bytes)`);
  }

  console.log('\n=======================================================');
  console.log('  SEMUA PENGUJIAN BACKEND & FILE SELESAI DENGAN SUKSES! ');
  console.log('=======================================================');
}

testBackend().catch(err => {
  console.error('Pengujian gagal:', err);
  process.exit(1);
});
