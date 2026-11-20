/**
 * Admin / Teacher Dashboard Module
 * Handles Question CRUD, Image uploads, Category creation, CSV Import/Export.
 */
class AdminManager {
  constructor() {
    this.questions = [];
    this.categories = [];
    this.currentEditingId = null;
    this.uploadedImageUrl = '';
  }

  async init() {
    await this.loadCategories();
    await this.loadQuestions();
    this.setupListeners();
  }

  setupListeners() {
    // Filter changes
    const filterCat = document.getElementById('adminFilterCategory');
    const filterDiff = document.getElementById('adminFilterDifficulty');
    const filterSearch = document.getElementById('adminSearchInput');

    if (filterCat) filterCat.addEventListener('change', () => this.loadQuestions());
    if (filterDiff) filterDiff.addEventListener('change', () => this.loadQuestions());
    if (filterSearch) {
      let timeout = null;
      filterSearch.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => this.loadQuestions(), 300);
      });
    }

    // Question form submit
    const form = document.getElementById('questionForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSaveQuestion(e));
    }

    // Image file upload input
    const imgInput = document.getElementById('questionImageFile');
    if (imgInput) {
      imgInput.addEventListener('change', (e) => this.handleImageUpload(e));
    }

    // CSV file import input
    const csvInput = document.getElementById('csvFileInput');
    if (csvInput) {
      csvInput.addEventListener('change', (e) => this.handleCsvImport(e));
    }
  }

  async loadCategories() {
    try {
      this.categories = await window.apiClient.getCategories();
      this.populateCategorySelects();
    } catch (e) {
      console.warn('Gagal memuat kategori:', e);
    }
  }

  populateCategorySelects() {
    const selects = [
      document.getElementById('adminFilterCategory'),
      document.getElementById('questionCategorySelect'),
      document.getElementById('gameCategorySelect')
    ];

    selects.forEach(select => {
      if (!select) return;
      const isFilter = select.id.includes('Filter') || select.id.includes('game');
      let html = isFilter ? '<option value="all">Semua Kategori</option>' : '';
      this.categories.forEach(c => {
        html += `<option value="${c.id}">${c.name}</option>`;
      });
      select.innerHTML = html;
    });
  }

  async loadQuestions() {
    const tableBody = document.getElementById('questionTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm text-warning me-2" role="status"></div>
          Memuat bank soal...
        </td>
      </tr>
    `;

    const cat = document.getElementById('adminFilterCategory')?.value || 'all';
    const diff = document.getElementById('adminFilterDifficulty')?.value || 'all';
    const search = document.getElementById('adminSearchInput')?.value || '';

    try {
      this.questions = await window.apiClient.getQuestions({
        categoryId: cat,
        difficulty: diff,
        search: search
      });

      const badgeCount = document.getElementById('totalQuestionsBadge');
      if (badgeCount) badgeCount.textContent = `${this.questions.length} Soal`;

      if (this.questions.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-muted">
              <i class="bi bi-inbox fs-2 d-block mb-2"></i>
              Tidak ada soal yang sesuai dengan filter.
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      this.questions.forEach((q, idx) => {
        let diffBadge = 'bg-success';
        if (q.difficulty === 'sedang') diffBadge = 'bg-warning text-dark';
        if (q.difficulty === 'sulit') diffBadge = 'bg-danger';

        const hasImg = q.image_url ? `<span class="badge bg-info text-dark" title="Memiliki gambar"><i class="bi bi-image"></i></span>` : '';

        html += `
          <tr>
            <td class="text-center text-muted fw-bold">${idx + 1}</td>
            <td>
              <span class="badge bg-secondary">${q.category_name || '-'}</span>
              ${hasImg}
            </td>
            <td>
              <span class="badge ${diffBadge}">${q.difficulty?.toUpperCase()}</span>
            </td>
            <td style="max-width: 320px;">
              <div class="fw-semibold text-light text-truncate" title="${q.question_text}">
                ${q.question_text}
              </div>
              <small class="text-muted d-block text-truncate" title="${q.explanation || ''}">
                <i class="bi bi-info-circle me-1"></i>${q.explanation || 'Tanpa pembahasan'}
              </small>
            </td>
            <td class="text-center">
              <span class="badge bg-warning text-dark fs-6 fw-bold px-3 py-1">${q.correct_answer}</span>
            </td>
            <td class="text-nowrap text-center">
              <button class="btn btn-outline-warning btn-sm me-1 btn-edit-question" data-id="${q.id}" title="Edit Soal">
                <i class="bi bi-pencil-square"></i> Edit
              </button>
              <button class="btn btn-outline-danger btn-sm btn-delete-question" data-id="${q.id}" title="Hapus Soal">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `;
      });

      tableBody.innerHTML = html;

      // Attach row event listeners
      tableBody.querySelectorAll('.btn-edit-question').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'), 10);
          this.openEditModal(id);
        });
      });

      tableBody.querySelectorAll('.btn-delete-question').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'), 10);
          this.handleDeleteQuestion(id);
        });
      });

    } catch (e) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-danger">
            <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
            Gagal memuat soal: ${e.message}
          </td>
        </tr>
      `;
    }
  }

  openCreateModal() {
    this.currentEditingId = null;
    this.uploadedImageUrl = '';
    const form = document.getElementById('questionForm');
    if (form) form.reset();

    const titleEl = document.getElementById('questionModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Tambah Pertanyaan Baru';

    // Clear preview
    this.updateImagePreview('');

    const modalEl = document.getElementById('questionFormModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  async openEditModal(id) {
    try {
      const q = await window.apiClient.getQuestionById(id);
      if (!q) return;

      this.currentEditingId = id;
      this.uploadedImageUrl = q.image_url || '';

      const titleEl = document.getElementById('questionModalTitle');
      if (titleEl) titleEl.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Edit Pertanyaan';

      // Fill form values
      document.getElementById('questionCategorySelect').value = q.category_id || 1;
      document.getElementById('questionDifficultySelect').value = q.difficulty || 'mudah';
      document.getElementById('questionTextInput').value = q.question_text || '';
      document.getElementById('questionImageUrlInput').value = q.image_url || '';
      document.getElementById('optionAInput').value = q.option_a || '';
      document.getElementById('optionBInput').value = q.option_b || '';
      document.getElementById('optionCInput').value = q.option_c || '';
      document.getElementById('optionDInput').value = q.option_d || '';
      document.getElementById('explanationInput').value = q.explanation || '';

      // Radio correct answer
      const radio = document.querySelector(`input[name="correctAnswerRadio"][value="${q.correct_answer}"]`);
      if (radio) radio.checked = true;

      this.updateImagePreview(q.image_url);

      const modalEl = document.getElementById('questionFormModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    } catch (e) {
      alert('Gagal mengambil data soal: ' + e.message);
    }
  }

  async handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya berkas gambar (PNG, JPG, JPEG, SVG) yang diperbolehkan!');
      return;
    }

    const uploadStatus = document.getElementById('imageUploadStatus');
    if (uploadStatus) {
      uploadStatus.innerHTML = '<span class="spinner-border spinner-border-sm text-warning me-1"></span> Mengunggah gambar...';
    }

    try {
      const res = await window.apiClient.uploadImage(file);
      this.uploadedImageUrl = res.imageUrl;
      document.getElementById('questionImageUrlInput').value = res.imageUrl;
      this.updateImagePreview(res.imageUrl);

      if (uploadStatus) {
        uploadStatus.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Gambar berhasil diunggah!</span>';
      }
    } catch (err) {
      if (uploadStatus) {
        uploadStatus.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>${err.message}</span>`;
      }
    }
  }

  updateImagePreview(url) {
    const container = document.getElementById('imagePreviewContainer');
    const img = document.getElementById('imagePreviewEl');
    if (!container || !img) return;

    if (url && url.trim()) {
      img.src = url;
      container.classList.remove('d-none');
    } else {
      img.src = '';
      container.classList.add('d-none');
    }
  }

  async handleSaveQuestion(e) {
    e.preventDefault();

    const catId = parseInt(document.getElementById('questionCategorySelect').value, 10);
    const difficulty = document.getElementById('questionDifficultySelect').value;
    const text = document.getElementById('questionTextInput').value.trim();
    const optA = document.getElementById('optionAInput').value.trim();
    const optB = document.getElementById('optionBInput').value.trim();
    const optC = document.getElementById('optionCInput').value.trim();
    const optD = document.getElementById('optionDInput').value.trim();
    const explanation = document.getElementById('explanationInput').value.trim();
    const correctRadio = document.querySelector('input[name="correctAnswerRadio"]:checked');

    let imageUrl = document.getElementById('questionImageUrlInput').value.trim();
    if (this.uploadedImageUrl) imageUrl = this.uploadedImageUrl;

    if (!text || !optA || !optB || !optC || !optD || !correctRadio) {
      alert('Mohon lengkapi teks pertanyaan, semua opsi pilihan A-D, dan pilih kunci jawaban yang benar!');
      return;
    }

    const payload = {
      category_id: catId,
      difficulty: difficulty,
      level_tier: difficulty === 'sulit' ? 3 : (difficulty === 'sedang' ? 2 : 1),
      question_text: text,
      image_url: imageUrl,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: correctRadio.value,
      explanation: explanation
    };

    try {
      if (this.currentEditingId) {
        await window.apiClient.updateQuestion(this.currentEditingId, payload);
      } else {
        await window.apiClient.createQuestion(payload);
      }

      // Hide modal
      const modalEl = document.getElementById('questionFormModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      await this.loadQuestions();
    } catch (err) {
      alert('Gagal menyimpan soal: ' + err.message);
    }
  }

  async handleDeleteQuestion(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pertanyaan ini?')) return;
    try {
      await window.apiClient.deleteQuestion(id);
      await this.loadQuestions();
    } catch (err) {
      alert('Gagal menghapus soal: ' + err.message);
    }
  }

  async handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const parsedQuestions = this.parseCsvText(text);

        if (parsedQuestions.length === 0) {
          alert('Tidak ada baris soal yang valid ditemukan dalam berkas CSV!');
          return;
        }

        const confirmImport = confirm(`Ditemukan ${parsedQuestions.length} soal. Lanjutkan impor ke bank soal?`);
        if (!confirmImport) return;

        const res = await window.apiClient.bulkImportQuestions(parsedQuestions);
        alert(res.message || `Berhasil mengimpor ${res.importedCount} soal!`);
        e.target.value = ''; // Reset input
        await this.loadQuestions();
      } catch (err) {
        alert('Terjadi kesalahan saat memproses CSV: ' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  parseCsvText(csv) {
    // Robust CSV parser supporting quotes, commas, multiline
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    // Remove BOM if present
    const cleanCsv = csv.replace(/^\uFEFF/, '');

    for (let i = 0; i < cleanCsv.length; i++) {
      const char = cleanCsv[i];
      const nextChar = cleanCsv[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    // Header index mapping
    const headers = rows[0].map(h => h.toLowerCase());
    const dataRows = rows.slice(1);

    const questions = [];
    dataRows.forEach(cols => {
      if (cols.length < 6) return;

      // Default column mapping if matching headers or standard layout
      // Expected layout: Kategori(0), Kesulitan(1), Soal(2), Gambar(3), A(4), B(5), C(6), D(7), Kunci(8), Penjelasan(9)
      const qText = cols[2] || cols[0];
      const optA = cols[4] || '';
      const optB = cols[5] || '';
      const optC = cols[6] || '';
      const optD = cols[7] || '';
      const key = (cols[8] || 'A').toUpperCase().trim();

      if (qText && optA && optB && optC && optD && ['A', 'B', 'C', 'D'].includes(key)) {
        // Map category name to ID
        const catName = cols[0] || '';
        const matchedCat = this.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());

        const diff = (cols[1] || 'mudah').toLowerCase();
        const validDiff = ['mudah', 'sedang', 'sulit'].includes(diff) ? diff : 'mudah';

        questions.push({
          category_id: matchedCat ? matchedCat.id : 1,
          difficulty: validDiff,
          question_text: qText,
          image_url: cols[3] || '',
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_answer: key,
          explanation: cols[9] || ''
        });
      }
    });

    return questions;
  }
}

window.adminManager = new AdminManager();
