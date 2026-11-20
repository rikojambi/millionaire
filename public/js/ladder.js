/**
 * Prize Ladder Manager (Pengaturan Hadiah & Tangga Hadiah Game)
 */
class LadderManager {
  constructor() {
    this.ladder = [];
    this.timerSeconds = 45;
    this.timerEnabled = true;
    this.lifelines = {
      fifty_fifty: true,
      audience: true,
      switch_question: true
    };
  }

  formatRupiah(num) {
    if (isNaN(num)) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  }

  parseRupiah(str) {
    if (typeof str === 'number') return str;
    const clean = String(str).replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  }

  async loadSettings() {
    try {
      const data = await window.apiClient.getSettings();
      if (data.ladder && Array.isArray(data.ladder)) {
        this.ladder = data.ladder;
      }
      if (data.timer_seconds !== undefined) {
        this.timerSeconds = parseInt(data.timer_seconds, 10) || 45;
      }
      if (data.timer_enabled !== undefined) {
        this.timerEnabled = data.timer_enabled === true || data.timer_enabled === 'true';
      }
      if (data.lifelines) {
        this.lifelines = typeof data.lifelines === 'string' ? JSON.parse(data.lifelines) : data.lifelines;
      }
    } catch (e) {
      console.warn('Menggunakan tangga hadiah default lokal:', e);
      this.ladder = this.getDefaultLadder();
    }
    return this.ladder;
  }

  getDefaultLadder() {
    return [
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
  }

  // Find last reached guaranteed safe prize
  getGuaranteedPrize(currentLevelIndex) {
    // currentLevelIndex is 0-indexed (0 to 14)
    let guaranteed = { prize: 0, prize_text: 'Rp 0' };
    for (let i = 0; i < currentLevelIndex; i++) {
      if (this.ladder[i] && this.ladder[i].is_safe) {
        guaranteed = this.ladder[i];
      }
    }
    return guaranteed;
  }

  // Render the in-game ladder sidebar
  renderInGameLadder(containerElement, currentLevelIndex) {
    if (!containerElement) return;
    // Show top down: level 15 down to level 1
    const items = [...this.ladder].reverse();

    let html = '';
    items.forEach(item => {
      const idx = item.level - 1;
      const isCurrent = idx === currentLevelIndex;
      const isPassed = idx < currentLevelIndex;
      const isSafe = item.is_safe;

      let cls = 'ladder-item';
      if (isCurrent) cls += ' current-level';
      else if (isPassed) cls += ' passed-level';
      if (isSafe) cls += ' safe-level';

      let icon = '';
      if (isPassed) {
        icon = '<i class="bi bi-check-circle-fill text-success"></i>';
      } else if (isSafe) {
        icon = '<i class="bi bi-shield-lock-fill text-warning"></i>';
      }

      html += `
        <div class="${cls}" data-level="${item.level}">
          <span class="level-num">${item.level}</span>
          <span class="level-prize">${item.prize_text || this.formatRupiah(item.prize)}</span>
          <span class="level-icon">${icon}</span>
        </div>
      `;
    });

    containerElement.innerHTML = html;

    // Scroll active into view smoothly
    const activeEl = containerElement.querySelector('.current-level');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Render teacher admin ladder configuration table/inputs
  renderAdminLadderTable(containerElement) {
    if (!containerElement) return;

    let html = `
      <div class="table-responsive">
        <table class="table table-dark table-hover align-middle admin-ladder-table">
          <thead>
            <tr>
              <th style="width: 80px;" class="text-center">Level</th>
              <th>Nominal Hadiah (Rp)</th>
              <th style="width: 140px;" class="text-center">Hadiah Aman</th>
              <th style="width: 90px;" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody id="ladderTableBody">
    `;

    this.ladder.forEach((item, index) => {
      html += `
        <tr data-index="${index}">
          <td class="text-center fw-bold fs-5 text-warning">${item.level}</td>
          <td>
            <div class="input-group">
              <span class="input-group-text bg-secondary text-white border-secondary">Rp</span>
              <input type="number" class="form-control form-control-lg ladder-prize-input" 
                value="${item.prize}" step="50000" min="0" required>
            </div>
            <small class="text-muted formatted-preview">${this.formatRupiah(item.prize)}</small>
          </td>
          <td class="text-center">
            <div class="form-check form-switch d-inline-block">
              <input class="form-check-input ladder-safe-switch" type="checkbox" role="switch"
                style="width: 3.2em; height: 1.6em; cursor: pointer;"
                ${item.is_safe ? 'checked' : ''}>
            </div>
          </td>
          <td class="text-center">
            ${this.ladder.length > 5 ? `
              <button type="button" class="btn btn-outline-danger btn-sm btn-delete-ladder-level" title="Hapus level">
                <i class="bi bi-trash"></i>
              </button>
            ` : '<span class="text-muted">-</span>'}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="d-flex justify-content-between align-items-center mt-3">
        <button type="button" class="btn btn-outline-primary" id="btnAddLadderLevel">
          <i class="bi bi-plus-circle me-1"></i> Tambah Level Hadiah
        </button>
        <span class="text-info fs-6">Total Level: <strong>${this.ladder.length}</strong></span>
      </div>
    `;

    containerElement.innerHTML = html;

    // Attach listeners for interactive preview & deletion
    const inputs = containerElement.querySelectorAll('.ladder-prize-input');
    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 0;
        const preview = e.target.closest('td').querySelector('.formatted-preview');
        if (preview) preview.textContent = this.formatRupiah(val);
      });
    });

    const delButtons = containerElement.querySelectorAll('.btn-delete-ladder-level');
    delButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const idx = parseInt(row.getAttribute('data-index'), 10);
        this.removeLevel(idx);
        this.renderAdminLadderTable(containerElement);
      });
    });

    const addBtn = containerElement.querySelector('#btnAddLadderLevel');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addNewLevel();
        this.renderAdminLadderTable(containerElement);
      });
    }
  }

  addNewLevel() {
    const nextLevel = this.ladder.length + 1;
    const lastPrize = this.ladder.length > 0 ? this.ladder[this.ladder.length - 1].prize : 100000;
    const newPrize = lastPrize * 2;
    this.ladder.push({
      level: nextLevel,
      prize: newPrize,
      prize_text: this.formatRupiah(newPrize),
      is_safe: false
    });
  }

  removeLevel(index) {
    if (this.ladder.length <= 5) return;
    this.ladder.splice(index, 1);
    // Renumber levels
    this.ladder.forEach((item, idx) => {
      item.level = idx + 1;
    });
  }

  collectFormData(containerElement) {
    const rows = containerElement.querySelectorAll('#ladderTableBody tr');
    const newLadder = [];
    rows.forEach((row, idx) => {
      const prizeInput = row.querySelector('.ladder-prize-input');
      const safeSwitch = row.querySelector('.ladder-safe-switch');
      const prize = parseInt(prizeInput.value, 10) || 0;
      newLadder.push({
        level: idx + 1,
        prize: prize,
        prize_text: this.formatRupiah(prize),
        is_safe: safeSwitch.checked
      });
    });
    this.ladder = newLadder;
    return newLadder;
  }
}

window.ladderManager = new LadderManager();
