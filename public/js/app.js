/**
 * Main Application Controller (App Orchestrator)
 * Manages views, navbar state, teacher authentication modals, fullscreen, and history.
 */
class App {
  constructor() {
    this.currentView = 'homeView';
    this.pendingAdminTarget = null;
  }

  async init() {
    // Check teacher session
    await this.refreshAuthStatus();

    // Setup global navigation
    this.setupNavigation();

    // Setup sound toggle
    this.setupAudioControls();

    // Setup fullscreen button
    this.setupFullscreen();

    // Setup start game modal
    this.setupStartGame();

    // Setup history view listeners
    this.setupHistory();

    // Setup prize settings listeners
    this.setupPrizeSettings();

    // Setup login modal listeners
    this.setupAuthModals();

    // Initialize admin manager
    await window.adminManager.init();

    // Default view: Home
    this.switchView('homeView');
  }

  setupNavigation() {
    // Menu buttons on Home View
    document.getElementById('btnMenuStart')?.addEventListener('click', () => {
      this.openStartGameModal();
    });

    document.getElementById('btnMenuAdmin')?.addEventListener('click', () => {
      this.accessAdminSection('adminView');
    });

    document.getElementById('btnMenuPrizes')?.addEventListener('click', () => {
      this.accessAdminSection('prizeSettingsView');
    });

    document.getElementById('btnMenuHistory')?.addEventListener('click', () => {
      this.loadHistoryView();
      this.switchView('historyView');
    });

    document.getElementById('btnMenuHelp')?.addEventListener('click', () => {
      this.switchView('helpView');
    });

    // Top Brand / Home button
    document.querySelectorAll('.btn-nav-home').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // If in middle of active game, confirm exit
        if (this.currentView === 'gameView' && window.gameEngine.state === 'PLAYING') {
          if (!confirm('Permainan sedang berlangsung. Kembali ke menu utama?')) return;
          window.gameEngine.stopTimer();
          window.soundEngine.stopBGM();
        }
        this.switchView('homeView');
      });
    });

    // Back to Home from any secondary view
    document.querySelectorAll('.btn-back-home').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView('homeView');
      });
    });
  }

  switchView(viewId) {
    const views = [
      'homeView',
      'gameView',
      'adminView',
      'prizeSettingsView',
      'historyView',
      'helpView',
      'resultView'
    ];

    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === viewId) {
          el.classList.remove('d-none');
          el.classList.add('fade-in');
        } else {
          el.classList.add('d-none');
          el.classList.remove('fade-in');
        }
      }
    });

    this.currentView = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Teacher Protected Sections ---
  accessAdminSection(targetView) {
    if (window.apiClient.isLoggedIn()) {
      if (targetView === 'adminView') {
        window.adminManager.loadQuestions();
      } else if (targetView === 'prizeSettingsView') {
        this.loadPrizeSettingsView();
      }
      this.switchView(targetView);
    } else {
      this.pendingAdminTarget = targetView;
      const modalEl = document.getElementById('teacherLoginModal');
      if (modalEl) {
        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
      }
    }
  }

  setupAuthModals() {
    const loginForm = document.getElementById('teacherLoginForm');
    const loginError = document.getElementById('teacherLoginError');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUsername').value.trim();
        const pass = document.getElementById('loginPassword').value.trim();

        if (loginError) loginError.classList.add('d-none');

        try {
          const res = await window.apiClient.login(user, pass);
          if (res.success) {
            // Close modal
            const modalEl = document.getElementById('teacherLoginModal');
            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();

            await this.refreshAuthStatus();

            // Navigate to pending section
            const target = this.pendingAdminTarget || 'adminView';
            this.pendingAdminTarget = null;
            this.accessAdminSection(target);
          }
        } catch (err) {
          if (loginError) {
            loginError.textContent = err.message || 'Login gagal, periksa username dan password.';
            loginError.classList.remove('d-none');
          }
        }
      });
    }

    // Logout button
    document.getElementById('btnLogoutTeacher')?.addEventListener('click', async () => {
      await window.apiClient.logout();
      await this.refreshAuthStatus();
      this.switchView('homeView');
    });

    // Quick open login button in navbar if not logged in
    document.getElementById('btnNavTeacherLogin')?.addEventListener('click', () => {
      this.accessAdminSection('adminView');
    });
  }

  async refreshAuthStatus() {
    const statusData = await window.apiClient.checkAuth();
    const isTeacher = statusData.authenticated;

    const navLoggedOut = document.getElementById('navAuthLoggedOut');
    const navLoggedIn = document.getElementById('navAuthLoggedIn');
    const teacherName = document.getElementById('navTeacherUsername');

    if (isTeacher) {
      if (navLoggedOut) navLoggedOut.classList.add('d-none');
      if (navLoggedIn) navLoggedIn.classList.remove('d-none');
      if (teacherName) teacherName.textContent = statusData.user.username;
    } else {
      if (navLoggedOut) navLoggedOut.classList.remove('d-none');
      if (navLoggedIn) navLoggedIn.classList.add('d-none');
    }
  }

  // --- Audio Controls ---
  setupAudioControls() {
    const btn = document.getElementById('btnToggleAudio');
    const icon = document.getElementById('audioToggleIcon');

    const updateIcon = () => {
      const isMuted = window.soundEngine.isMuted();
      if (icon) {
        icon.className = isMuted ? 'bi bi-volume-mute-fill text-danger' : 'bi bi-volume-up-fill text-warning';
      }
    };

    updateIcon();

    if (btn) {
      btn.addEventListener('click', () => {
        window.soundEngine.toggleMute();
        updateIcon();
      });
    }
  }

  // --- Fullscreen ---
  setupFullscreen() {
    const btn = document.getElementById('btnToggleFullscreen');
    const icon = document.getElementById('fullscreenToggleIcon');

    if (btn) {
      btn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Gagal beralih ke layar penuh:', err);
          });
          if (icon) icon.className = 'bi bi-fullscreen-exit';
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
          if (icon) icon.className = 'bi bi-fullscreen';
        }
      });
    }

    document.addEventListener('fullscreenchange', () => {
      if (icon) {
        icon.className = document.fullscreenElement ? 'bi bi-fullscreen-exit' : 'bi bi-fullscreen';
      }
    });
  }

  // --- Start Game Flow ---
  setupStartGame() {
    // In-game answer buttons
    ['A', 'B', 'C', 'D'].forEach(opt => {
      const btn = document.getElementById(`optBtn_${opt}`);
      if (btn) {
        btn.addEventListener('click', () => {
          window.gameEngine.selectOption(opt);
        });
      }
    });

    // Confirm Lock In button
    document.getElementById('btnConfirmLockIn')?.addEventListener('click', () => {
      window.gameEngine.confirmFinalAnswer();
    });

    // Lifeline buttons
    document.getElementById('lifeline5050')?.addEventListener('click', () => {
      window.gameEngine.use5050();
    });

    document.getElementById('lifelineAudience')?.addEventListener('click', () => {
      window.gameEngine.useAudiencePoll();
    });

    document.getElementById('lifelineSwitch')?.addEventListener('click', () => {
      window.gameEngine.useSwitchQuestion();
    });

    // Walk away button
    document.getElementById('btnWalkAway')?.addEventListener('click', () => {
      window.gameEngine.promptWalkAway();
    });

    // Confirm walk away modal button
    document.getElementById('btnConfirmWalkAwayModal')?.addEventListener('click', () => {
      const modalEl = document.getElementById('walkAwayConfirmModal');
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
      window.gameEngine.confirmWalkAway();
    });

    // Start game form submit
    const startForm = document.getElementById('startGameForm');
    if (startForm) {
      startForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerName = document.getElementById('inputPlayerName').value.trim();
        const categoryId = document.getElementById('gameCategorySelect').value;

        // Hide modal
        const modalEl = document.getElementById('startGameModal');
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();

        try {
          this.switchView('gameView');
          await window.gameEngine.startNewGame(playerName, categoryId);
        } catch (err) {
          alert('Gagal memulai permainan: ' + err.message);
          this.switchView('homeView');
        }
      });
    }
  }

  openStartGameModal() {
    const modalEl = document.getElementById('startGameModal');
    if (modalEl) {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  // --- Prize Settings ---
  setupPrizeSettings() {
    document.getElementById('btnSavePrizeSettings')?.addEventListener('click', async () => {
      const container = document.getElementById('adminLadderTableContainer');
      const newLadder = window.ladderManager.collectFormData(container);

      const timerSec = parseInt(document.getElementById('settingTimerDuration').value, 10) || 45;
      const timerActive = document.getElementById('settingTimerSwitch').checked;

      const lifelines = {
        fifty_fifty: document.getElementById('settingLifeline5050').checked,
        audience: document.getElementById('settingLifelineAudience').checked,
        switch_question: document.getElementById('settingLifelineSwitch').checked
      };

      try {
        await window.apiClient.saveSettings({
          ladder: newLadder,
          timer_seconds: timerSec,
          timer_enabled: timerActive,
          lifelines: lifelines
        });
        alert('Pengaturan hadiah dan aturan permainan berhasil disimpan!');
      } catch (err) {
        alert('Gagal menyimpan pengaturan: ' + err.message);
      }
    });

    document.getElementById('btnResetPrizeSettings')?.addEventListener('click', async () => {
      if (!confirm('Kembalikan tangga hadiah ke konfigurasi standar 15 level (Rp 50.000 s/d Rp 1 Miliar)?')) return;
      try {
        await window.apiClient.resetSettings();
        await this.loadPrizeSettingsView();
        alert('Pengaturan hadiah berhasil direset ke standar awal!');
      } catch (err) {
        alert('Gagal mereset: ' + err.message);
      }
    });
  }

  async loadPrizeSettingsView() {
    await window.ladderManager.loadSettings();

    // Render ladder table
    const container = document.getElementById('adminLadderTableContainer');
    window.ladderManager.renderAdminLadderTable(container);

    // Fill timer & lifelines inputs
    const timerInput = document.getElementById('settingTimerDuration');
    const timerSwitch = document.getElementById('settingTimerSwitch');
    if (timerInput) timerInput.value = window.ladderManager.timerSeconds;
    if (timerSwitch) timerSwitch.checked = window.ladderManager.timerEnabled;

    const lConfig = window.ladderManager.lifelines;
    if (document.getElementById('settingLifeline5050')) {
      document.getElementById('settingLifeline5050').checked = !!lConfig.fifty_fifty;
    }
    if (document.getElementById('settingLifelineAudience')) {
      document.getElementById('settingLifelineAudience').checked = !!lConfig.audience;
    }
    if (document.getElementById('settingLifelineSwitch')) {
      document.getElementById('settingLifelineSwitch').checked = !!lConfig.switch_question;
    }
  }

  // --- Game History ---
  setupHistory() {
    document.getElementById('btnClearHistory')?.addEventListener('click', async () => {
      if (!confirm('Apakah Anda yakin ingin menghapus seluruh riwayat permainan?')) return;
      try {
        await window.apiClient.clearHistory();
        await this.loadHistoryView();
      } catch (e) {
        alert('Gagal menghapus riwayat: ' + e.message);
      }
    });
  }

  async loadHistoryView() {
    const listBody = document.getElementById('historyTableBody');
    if (!listBody) return;

    listBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <span class="spinner-border spinner-border-sm me-2"></span> Memuat riwayat permainan...
        </td>
      </tr>
    `;

    try {
      const items = await window.apiClient.getHistory();
      if (items.length === 0) {
        listBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-muted">
              <i class="bi bi-clock-history fs-2 d-block mb-2"></i>
              Belum ada riwayat permainan yang tercatat. Mainkan sesi game pertama Anda!
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      items.forEach((item, idx) => {
        let statusBadge = '<span class="badge bg-danger">Game Over</span>';
        if (item.status === 'won') {
          statusBadge = '<span class="badge bg-success"><i class="bi bi-trophy-fill me-1"></i>JUARA 1 MILIAR</span>';
        } else if (item.status === 'walked_away') {
          statusBadge = '<span class="badge bg-info text-dark"><i class="bi bi-door-open-fill me-1"></i>Berhenti (Walk Away)</span>';
        }

        const dateStr = item.played_at ? new Date(item.played_at).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-';

        const minutes = Math.floor(item.duration_seconds / 60);
        const seconds = item.duration_seconds % 60;
        const durationStr = `${minutes}m ${seconds}d`;

        html += `
          <tr>
            <td class="text-center text-muted fw-bold">${idx + 1}</td>
            <td class="fw-bold text-light">${item.player_name}</td>
            <td><span class="badge bg-secondary">${item.category_name}</span></td>
            <td>Level ${item.highest_level}</td>
            <td class="fw-bold text-warning fs-6">${item.final_prize_text || 'Rp 0'}</td>
            <td>${statusBadge}</td>
            <td class="text-muted small">${dateStr} (${durationStr})</td>
          </tr>
        `;
      });

      listBody.innerHTML = html;
    } catch (e) {
      listBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-danger">Gagal memuat riwayat: ${e.message}</td>
        </tr>
      `;
    }
  }

  // --- Result View & Learning Evaluation ---
  showResultView(result) {
    this.switchView('resultView');

    const titleEl = document.getElementById('resultTitle');
    const descEl = document.getElementById('resultSubtitle');
    const playerEl = document.getElementById('resultPlayerName');
    const prizeEl = document.getElementById('resultPrizeWon');
    const statsEl = document.getElementById('resultStatsSummary');

    let isWon = result.status === 'won';
    let isWalked = result.status === 'walked_away';

    if (isWon) {
      titleEl.innerHTML = '🎉 SELAMAT! ANDA JUARA 1 MILIAR! 🎉';
      titleEl.className = 'display-5 fw-bold text-warning text-center victory-glow mb-2';
      descEl.textContent = 'Luar biasa! Seluruh 15 level pertanyaan edukasi berhasil dijawab dengan sempurna!';
    } else if (isWalked) {
      titleEl.innerHTML = '🛡️ PERMAINAN BERAKHIR: MEMBAWA HADIAH 🛡️';
      titleEl.className = 'display-5 fw-bold text-info text-center mb-2';
      descEl.textContent = 'Pemain memilih berhenti dengan bijak dan mengamankan hadiah pencapaian!';
    } else {
      titleEl.innerHTML = 'PERMAINAN BERAKHIR';
      titleEl.className = 'display-5 fw-bold text-danger text-center mb-2';
      descEl.textContent = 'Jawaban salah atau waktu habis. Hadiah mengikuti ketentuan titik aman terakhir.';
    }

    if (playerEl) playerEl.textContent = result.player_name;
    if (prizeEl) prizeEl.textContent = result.final_prize_text;

    const minutes = Math.floor(result.duration_seconds / 60);
    const seconds = result.duration_seconds % 60;

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="row text-center g-3 my-3">
          <div class="col-4">
            <div class="p-3 rounded bg-dark border border-secondary">
              <div class="text-muted small">Level Tertinggi</div>
              <div class="fs-4 fw-bold text-light">${result.highest_level}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-3 rounded bg-dark border border-secondary">
              <div class="text-muted small">Jawaban Benar</div>
              <div class="fs-4 fw-bold text-success">${result.levels_completed}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-3 rounded bg-dark border border-secondary">
              <div class="text-muted small">Durasi Main</div>
              <div class="fs-4 fw-bold text-info">${minutes}m ${seconds}s</div>
            </div>
          </div>
        </div>
      `;
    }

    // Render Learning Evaluation Accordion
    this.renderLearningEvaluation(result.review_data || []);

    // Result buttons
    document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
      this.openStartGameModal();
    });

    document.getElementById('btnPrintEvaluation')?.addEventListener('click', () => {
      window.print();
    });
  }

  renderLearningEvaluation(reviews) {
    const container = document.getElementById('resultEvaluationList');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-3">Tidak ada catatan review pertanyaan.</div>';
      return;
    }

    let html = '<div class="accordion" id="accordionEvaluation">';
    reviews.forEach((item, idx) => {
      const isCorrect = item.is_correct;
      const statusIcon = isCorrect
        ? '<i class="bi bi-check-circle-fill text-success me-2"></i>'
        : '<i class="bi bi-x-circle-fill text-danger me-2"></i>';

      const statusBadge = isCorrect
        ? '<span class="badge bg-success ms-auto">BENAR</span>'
        : '<span class="badge bg-danger ms-auto">SALAH</span>';

      html += `
        <div class="accordion-item bg-dark border-secondary mb-2 rounded overflow-hidden">
          <h2 class="accordion-header" id="headingEval_${idx}">
            <button class="accordion-button collapsed bg-dark text-light border-secondary" type="button" 
              data-bs-toggle="collapse" data-bs-target="#collapseEval_${idx}" aria-expanded="false">
              ${statusIcon}
              <span class="fw-bold me-2">Level ${item.level} (${item.prize_text}):</span>
              <span class="text-truncate text-secondary d-none d-md-inline" style="max-width: 400px;">${item.question_text}</span>
              ${statusBadge}
            </button>
          </h2>
          <div id="collapseEval_${idx}" class="accordion-collapse collapse" data-bs-parent="#accordionEvaluation">
            <div class="accordion-body bg-black text-light border-top border-secondary">
              <h6 class="text-warning fw-bold mb-2">${item.question_text}</h6>
              ${item.image_url ? `<div class="mb-3"><img src="${item.image_url}" class="img-fluid rounded border border-secondary" style="max-height: 220px;" alt="Soal"></div>` : ''}

              <div class="row g-2 mb-3">
                ${['A', 'B', 'C', 'D'].map(k => {
                  let optCls = 'border-secondary text-light';
                  let icon = `<strong class="me-2">${k}.</strong>`;
                  if (k === item.correct_answer) {
                    optCls = 'border-success bg-success bg-opacity-25 text-success fw-bold';
                    icon = `<i class="bi bi-check-circle-fill me-2 text-success"></i><strong>${k}.</strong>`;
                  } else if (k === item.player_choice && !item.is_correct) {
                    optCls = 'border-danger bg-danger bg-opacity-25 text-danger fw-bold';
                    icon = `<i class="bi bi-x-circle-fill me-2 text-danger"></i><strong>${k}.</strong>`;
                  }
                  return `
                    <div class="col-md-6">
                      <div class="p-2 rounded border ${optCls} small">
                        ${icon} ${item.options?.[k] || '-'}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="p-3 rounded bg-secondary bg-opacity-25 border border-info border-opacity-50">
                <div class="text-info fw-bold mb-1"><i class="bi bi-lightbulb-fill me-1"></i>Pembahasan Edukatif:</div>
                <div class="text-light small">${item.explanation}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
