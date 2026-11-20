# WHO WANTS TO BE A MILLIONAIRE - EDISI EDUKASI KELAS 🎓💰

Aplikasi web kuis game show interaktif modern **Who Wants to Be a Millionaire** (Siapa Mau Jadi Jutawan) yang dirancang khusus untuk pembelajaran interaktif di kelas melalui **laptop, proyektor, tablet, dan layar sentuh interaktif (Interactive Flat Panel / Smartboard)**.

---

## 🌟 FITUR UTAMA

1. **Halaman Utama Profesional:**
   - Desain atmosfer game show megah dengan logo animasi berdenyut, palet biru kosmik (*deep cosmic blue*), dan aksen emas (*gold*).
   - Tombol menu berukuran besar (*touch-friendly*): **Mulai Permainan**, **Kelola Soal**, **Atur Hadiah**, **Riwayat Game**, dan **Petunjuk**.
   - Pintasan *Layar Penuh (Fullscreen)* untuk optimalisasi proyektor dan tombol *Mute/Unmute Suara*.

2. **Mode Guru (Dashboard Admin):**
   - Terlindungi login aman (`guru` / `guru123`) untuk mencegah akses tidak sah oleh siswa.
   - **Kelola Soal:** Tambah, edit, dan hapus soal pilihan ganda A, B, C, D.
   - **Mendukung Gambar:** Guru dapat mengunggah file gambar (PNG, JPG, SVG) atau memasukkan URL gambar langsung untuk pertanyaan diagram/peta/bagan.
   - **Tingkat Kesulitan & Kategori:** Mudah (Level 1–5), Sedang (Level 6–10), dan Sulit (Level 11–15).
   - **Kunci Jawaban & Pembahasan:** Setiap soal dilengkapi kunci jawaban dan penjelasan edukatif yang akan ditampilkan pada sesi evaluasi akhir.
   - **Impor & Ekspor CSV/Excel:** Unduh seluruh bank soal dalam format CSV, atau unggah soal baru secara massal menggunakan template yang telah disediakan.

3. **Pengaturan Hadiah Fleksibel (Prize Ladder Manager):**
   - Guru bebas menentukan jumlah level dan nominal hadiah per level (contoh standar 15 level: Rp 50.000 s/d Rp 1.000.000.000).
   - Penentuan titik **Hadiah Aman (Milestone Safe Haven)** menggunakan tombol sakelar (*switch*) per level (default aman: Level 5 & Level 10).
   - Tombol **Simpan Pengaturan** dan **Reset ke Standar Awal**.
   - Pengaturan durasi batas waktu (timer hitung mundur) dan sakelar bantuan (*lifelines*).

4. **Gameplay Otentik & Menegangkan:**
   - 15 level pertanyaan pilihan ganda yang diacak secara otomatis dari bank soal sesuai tingkat kesulitannya.
   - **Tidak ada soal berulang** dalam satu sesi selama bank soal mencukupi.
   - Tombol pilihan jawaban A, B, C, D dirancang besar dan mendukung klik mouse, sentuhan jari, maupun stylus.
   - **Konfirmasi Kunci Jawaban (Final Answer):** Opsi kunci jawaban dengan efek ketegangan suara khas game show sebelum jawaban dibuka.

5. **Tiga Bantuan Lengkap (Lifelines):**
   - **50:50:** Menghilangkan 2 pilihan salah secara acak.
   - **Tanya Audiens:** Membuka grafik batang persentase polling suara kelas interaktif.
   - **Ganti Soal:** Mengganti soal aktif dengan soal cadangan lain pada tingkat kesulitan yang sama.

6. **Aturan Permainan & Berhenti (Walk Away):**
   - Jawaban benar melangkah ke level berikutnya.
   - Jawaban salah mengakhiri permainan dengan membawa hadiah aman terakhir yang telah dilewati.
   - Tombol **Berhenti & Bawa Hadiah (Walk Away)** dengan modal konfirmasi nominal hadiah sebelum pemain mengunci jawaban.

7. **Optimal Layar Sentuh & Proyektor:**
   - Target sentuh minimal 58–72px, tanpa ketergantungan *hover*, anti-seleksi teks saat disentuh cepat di smartboard.
   - Rasio fleksibel 16:9 widescreen, kontras tinggi yang mudah dibaca oleh siswa di barisan belakang kelas.

8. **Hasil Game & Evaluasi Pembelajaran:**
   - Menampilkan nama pemain/tim, perolehan hadiah, level tertinggi, dan total waktu bermain.
   - **Daftar Pembahasan Edukatif:** Menampilkan review lengkap semua soal yang dimainkan, pilihan siswa, kunci jawaban, dan pembahasan materi.
   - Tombol **Cetak / Simpan PDF** untuk dokumentasi nilai atau rapor kuis kelas.

9. **Efek Suara Berbasis Web Audio API murni:**
   - Efek suara sintetis tanpa memerlukan berkas MP3 eksternal (100% offline, tanpa risiko tautan berkas rusak):
     - Suara latar ketegangan bertingkat (*Tier 1, Tier 2, Tier 3 ambience drone*).
     - Detak jam hitung mundur (*ticking clock*).
     - Kunci jawaban (*final lock-in suspense*).
     - Nada kemenangan (*correct fanfare* & *grand milestone win*).
     - Nada salah (*wrong buzzer thud*).
     - Efek bantuan 50:50, Tanya Audiens, Ganti Soal, dan Berhenti.

10. **Penyimpanan Permanen (SQLite Database):**
    - Menggunakan mesin basis data SQLite bawaan Node.js (`data/millionaire.sqlite`).
    - Data soal, kategori, tangga hadiah, dan riwayat permainan tersimpan permanen di komputer lokal.

---

## 🚀 PETUNJUK INSTALASI & CARA MENJALANKAN

### Prasyarat
- Komputer atau laptop dengan sistem operasi Windows, macOS, atau Linux.
- Telah terpasang **Node.js** (versi 22 ke atas direkomendasikan karena telah menyertakan SQLite bawaan secara *native* tanpa perlu instalasi modul tambahan).

### Langkah Menjalankan di Windows:

#### Cara 1: Sekali Klik (Paling Praktis)
1. Buka folder proyek `proyek10`.
2. Klik ganda pada berkas **`jalankan_game.bat`**.
3. Peramban web Anda (Chrome / Edge) akan otomatis terbuka dan mengarah ke `http://localhost:3000`.

#### Cara 2: Melalui Terminal / Command Prompt
1. Buka Command Prompt atau PowerShell di folder proyek ini.
2. Jalankan perintah:
   ```bash
   node server.js
   ```
   *atau*
   ```bash
   npm start
   ```
3. Buka peramban web dan ketik alamat:
   ```
   http://localhost:3000
   ```

---

## 🔑 AKUN LOGIN GURU (DEFAULT)

Untuk mengakses menu **Kelola Soal** dan **Atur Hadiah**:
- **Username:** `guru`
- **Password:** `guru123`

*(Password dapat diubah oleh guru setelah masuk ke dalam sistem)*

---

## 📋 PANDUAN PENGGUNAAN GURU

### 1. Menambah Pertanyaan Baru
1. Di halaman utama, klik **Mode Guru** di pojok kanan atas atau tombol **Kelola Soal**.
2. Masukkan username `guru` dan password `guru123`.
3. Klik tombol **Tambah Soal**.
4. Pilih Kategori dan Tingkat Kesulitan:
   - **Mudah:** Muncul di Level 1 – 5
   - **Sedang:** Muncul di Level 6 – 10
   - **Sulit:** Muncul di Level 11 – 15
5. Masukkan teks pertanyaan dan pilihan A, B, C, D.
6. Tandai lingkaran radio pada pilihan yang merupakan **Kunci Jawaban Benar**.
7. *(Opsional)* Unggah gambar atau diagram pendukung (tersimpan otomatis di folder `public/uploads/`).
8. Masukkan penjelasan materi pada kolom **Penjelasan / Pembahasan Edukatif**.
9. Klik **Simpan Pertanyaan**.

### 2. Mengimpor Soal Massal dari Excel / CSV
1. Klik tombol **Unduh Format Template CSV** pada menu Kelola Soal untuk mendapatkan contoh format.
2. Buka berkas dengan Microsoft Excel, Notepad, atau Google Sheets.
3. Isi kolom: Kategori, Tingkat Kesulitan (`mudah`/`sedang`/`sulit`), Teks Pertanyaan, URL Gambar, Pilihan A, B, C, D, Kunci Jawaban (`A`/`B`/`C`/`D`), dan Penjelasan.
4. Simpan dengan format **CSV (Comma Delimited)**.
5. Klik **Impor CSV / Excel** pada aplikasi dan pilih berkas CSV Anda. Seluruh soal akan langsung masuk ke bank soal secara otomatis.

### 3. Mengatur Nominal Hadiah & Titik Aman
1. Klik tombol **Atur Hadiah** di menu utama.
2. Anda dapat mengubah nominal setiap level (misal disesuaikan dengan poin belajar atau nilai kuis).
3. Aktifkan sakelar **Hadiah Aman** pada level tertentu (misalnya Level 5 dan Level 10).
4. Atur durasi timer (default 45 detik) atau nonaktifkan timer jika menginginkan kuis santai tanpa batas waktu.
5. Klik **Simpan Pengaturan Hadiah**.
6. Jika ingin kembali ke susunan klasik kuis Rp 1 Miliar, cukup klik **Reset ke Standar Awal**.

### 4. Menggunakan di Layar Sentuh & Proyektor Kelas
1. Hubungkan laptop ke proyektor atau smartboard.
2. Tekan tombol **Layar Penuh** di pojok kanan atas aplikasi (atau tekan tombol F11 pada keyboard).
3. Siswa dapat langsung menyentuh pilihan jawaban pada panel sentuh tanpa memerlukan mouse atau keyboard.
4. Suara game show dapat dihubungkan ke pengeras suara kelas (*speaker*) untuk memompa semangat belajar siswa.

---

## 🗄️ STRUKTUR DIREKTORI PROYEK

```
proyek10/
├── package.json               # Konfigurasi proyek & skrip npm
├── server.js                  # Server HTTP Node.js native & API endpoint
├── database.js                # Modul SQLite (tabel, relasi, seed data & helpers)
├── jalankan_game.bat          # Pintasan peluncur otomatis di Windows
├── test_backend.js            # Skrip uji otomatis menyeluruh
├── data/
│   └── millionaire.sqlite    # Berkas database SQLite permanen
└── public/
    ├── index.html             # Tampilan aplikasi terpadu (SPA)
    ├── css/
    │   └── style.css          # Tema game show modern, kontras tinggi & touch
    ├── js/
    │   ├── audio.js           # Sintesis audio Web Audio API (zero external assets)
    │   ├── api.js             # Klien API interaktif
    │   ├── ladder.js          # Pengelola tangga hadiah & titik aman
    │   ├── admin.js           # Pengelolaan soal, gambar, dan impor/ekspor
    │   ├── game.js            # Logika permainan, timer, lifelines, dan evaluasi
    │   └── app.js             # Pengatur navigasi tampilan, sesi guru & modal
    ├── data/
    │   └── template_soal.csv  # Format template CSV siap pakai untuk guru
    └── uploads/               # Direktori penyimpanan gambar soal
```

---

## 🛡️ KEAMANAN & INTEGRITAS DATA

- **Pemisahan Peran:** Siswa tidak dapat mengakses pengelolaan bank soal, pengaturan hadiah, atau reset sistem tanpa kredensial guru.
- **Sesi Terenkripsi:** Menggunakan otentikasi token dengan masa kedaluwarsa 24 jam.
- **Password Terenkripsi:** Password guru disimpan menggunakan fungsi hashing kriptografi salt PBKDF2/SHA-256.
- **Penyimpanan Permanen:** Seluruh perubahan soal dan riwayat sesi permainan disimpan secara aman di disk, tidak akan hilang meskipun peramban dimuat ulang (*reload*) atau komputer dimatikan.
