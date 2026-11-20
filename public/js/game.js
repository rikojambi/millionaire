/**
 * Millionaire Game Engine
 * Manages game sessions, timer, question progression, lifelines, suspense and evaluation.
 */
class GameEngine {
  constructor() {
    this.playerName = 'Siswa';
    this.categoryFilter = 'all';
    this.questions = [];
    this.reserveQuestions = [];
    this.currentIndex = 0;
    this.currentQuestion = null;
    this.selectedOption = null;
    this.state = 'IDLE'; // IDLE, PLAYING, LOCKED, EVALUATING, FINISHED

    // Timer
    this.timerSeconds = 45;
    this.timerRemaining = 45;
    this.timerInterval = null;
    this.timerEnabled = true;

    // Lifelines availability in current session
    this.lifelinesUsed = {
      fifty_fifty: false,
      audience: false,
      switch_question: false
    };
    this.activeHiddenOptions = [];

    // Session log for review
    this.sessionReview = [];
    this.startTime = null;
  }

  async startNewGame(playerName, categoryId) {
    this.playerName = playerName && playerName.trim() ? playerName.trim() : 'Pemain Edukasi';
    this.categoryFilter = categoryId || 'all';

    // Load ladder and settings
    await window.ladderManager.loadSettings();
    this.timerEnabled = window.ladderManager.timerEnabled;
    this.timerSeconds = window.ladderManager.timerSeconds || 45;

    // Fetch questions from API
    const data = await window.apiClient.getGameQuestions(this.categoryFilter);
    if (!data.questions || data.questions.length === 0) {
      throw new Error('Bank soal kosong untuk kategori ini! Silakan tambahkan soal terlebih dahulu.');
    }

    this.questions = data.questions;
    this.reserveQuestions = data.reserves || [];
    this.currentIndex = 0;
    this.lifelinesUsed = {
      fifty_fifty: false,
      audience: false,
      switch_question: false
    };
    this.activeHiddenOptions = [];
    this.sessionReview = [];
    this.startTime = Date.now();
    this.state = 'PLAYING';

    this.renderLifelineButtons();
    this.loadQuestionAt(0);
  }

  loadQuestionAt(index) {
    if (index >= this.questions.length || index >= window.ladderManager.ladder.length) {
      this.handleGameWon();
      return;
    }

    this.currentIndex = index;
    this.currentQuestion = this.questions[index];
    this.selectedOption = null;
    this.activeHiddenOptions = [];
    this.state = 'PLAYING';

    // Update ladder UI
    window.ladderManager.renderInGameLadder(
      document.getElementById('gameLadderContainer'),
      this.currentIndex
    );

    // Audio ambience tier: Level 1-5 (tier 1), Level 6-10 (tier 2), Level 11-15 (tier 3)
    let tier = 1;
    if (index >= 10) tier = 3;
    else if (index >= 5) tier = 2;
    window.soundEngine.startBGM(tier);

    // Render Question & Options
    this.renderQuestionUI();

    // Start timer if enabled
    this.startTimer();
  }

  renderQuestionUI() {
    const q = this.currentQuestion;
    const currentLadderItem = window.ladderManager.ladder[this.currentIndex] || { prize_text: 'Rp 0', level: this.currentIndex + 1 };

    // Update Header badges
    const levelBadge = document.getElementById('gameCurrentLevelBadge');
    const prizeBadge = document.getElementById('gameCurrentPrizeBadge');
    const categoryBadge = document.getElementById('gameCurrentCategoryBadge');

    if (levelBadge) levelBadge.textContent = `Pertanyaan ${this.currentIndex + 1} dari ${window.ladderManager.ladder.length}`;
    if (prizeBadge) prizeBadge.textContent = currentLadderItem.prize_text;
    if (categoryBadge) categoryBadge.textContent = q.category_name || 'Pengetahuan Umum';

    // Update Question text
    const textEl = document.getElementById('questionText');
    if (textEl) {
      textEl.textContent = q.question_text;
    }

    // Question Image handling
    const imgContainer = document.getElementById('questionImageContainer');
    const imgEl = document.getElementById('questionImage');
    if (q.image_url && q.image_url.trim()) {
      imgEl.src = q.image_url;
      imgContainer.classList.remove('d-none');
    } else {
      imgContainer.classList.add('d-none');
      imgEl.src = '';
    }

    // Options rendering
    const options = [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d }
    ];

    options.forEach(opt => {
      const btn = document.getElementById(`optBtn_${opt.key}`);
      const textSpan = document.getElementById(`optText_${opt.key}`);
      if (btn && textSpan) {
        textSpan.textContent = opt.text;
        btn.className = 'btn btn-option w-100 text-start';
        btn.disabled = false;
        btn.style.visibility = 'visible';
      }
    });

    // Hide Confirm Bar initially
    this.toggleLockInBar(false);
  }

  selectOption(optKey) {
    if (this.state !== 'PLAYING') return;
    if (this.activeHiddenOptions.includes(optKey)) return;

    window.soundEngine.playSelect();
    this.selectedOption = optKey;

    // Reset visual highlight on options
    ['A', 'B', 'C', 'D'].forEach(k => {
      const btn = document.getElementById(`optBtn_${k}`);
      if (btn && !this.activeHiddenOptions.includes(k)) {
        btn.classList.remove('selected', 'final-locked');
        if (k === optKey) {
          btn.classList.add('selected');
        }
      }
    });

    // Show Final Answer confirmation prompt
    this.toggleLockInBar(true, optKey);
  }

  toggleLockInBar(show, optKey = '') {
    const bar = document.getElementById('lockInActionContainer');
    const selectedText = document.getElementById('lockInSelectedText');
    if (!bar) return;

    if (show) {
      if (selectedText) selectedText.textContent = `Pilihan Anda: [ ${optKey} ]`;
      bar.classList.remove('d-none');
    } else {
      bar.classList.add('d-none');
    }
  }

  confirmFinalAnswer() {
    if (!this.selectedOption || this.state !== 'PLAYING') return;

    this.state = 'LOCKED';
    this.stopTimer();
    this.toggleLockInBar(false);

    // Visual lock-in state on chosen button
    const chosenBtn = document.getElementById(`optBtn_${this.selectedOption}`);
    if (chosenBtn) {
      chosenBtn.classList.remove('selected');
      chosenBtn.classList.add('final-locked');
    }

    // Disable all option buttons
    ['A', 'B', 'C', 'D'].forEach(k => {
      const b = document.getElementById(`optBtn_${k}`);
      if (b) b.disabled = true;
    });

    // Dramatic Suspense Sound
    window.soundEngine.playLockIn();

    // Dramatic suspense delay before reveal (2.2 seconds for game show tension!)
    setTimeout(() => {
      this.evaluateAnswer();
    }, 2200);
  }

  evaluateAnswer() {
    const q = this.currentQuestion;
    const isCorrect = this.selectedOption === q.correct_answer;
    const currentLadder = window.ladderManager.ladder[this.currentIndex];

    // Record review entry
    this.sessionReview.push({
      level: this.currentIndex + 1,
      prize_text: currentLadder.prize_text,
      question_text: q.question_text,
      image_url: q.image_url,
      player_choice: this.selectedOption,
      correct_answer: q.correct_answer,
      is_correct: isCorrect,
      explanation: q.explanation || 'Tidak ada penjelasan khusus.',
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d
      }
    });

    const chosenBtn = document.getElementById(`optBtn_${this.selectedOption}`);
    const correctBtn = document.getElementById(`optBtn_${q.correct_answer}`);

    if (isCorrect) {
      if (chosenBtn) {
        chosenBtn.classList.remove('final-locked');
        chosenBtn.classList.add('correct');
      }

      const isSafeHaven = currentLadder.is_safe;
      const isLastLevel = this.currentIndex === window.ladderManager.ladder.length - 1;

      if (isSafeHaven || isLastLevel) {
        window.soundEngine.playMilestoneWin();
      } else {
        window.soundEngine.playCorrect();
      }

      // Show brief congratulatory toast / modal then progress
      setTimeout(() => {
        if (isLastLevel) {
          this.handleGameWon();
        } else {
          this.loadQuestionAt(this.currentIndex + 1);
        }
      }, 2000);
    } else {
      // Wrong Answer!
      if (chosenBtn) {
        chosenBtn.classList.remove('final-locked');
        chosenBtn.classList.add('wrong');
      }
      if (correctBtn) {
        correctBtn.classList.add('correct', 'pulse-correct');
      }

      window.soundEngine.playWrong();

      setTimeout(() => {
        this.handleGameOver('wrong');
      }, 3000);
    }
  }

  // Timer Management
  startTimer() {
    this.stopTimer();
    const timerWrapper = document.getElementById('gameTimerWrapper');
    const timerVal = document.getElementById('gameTimerSeconds');
    const timerCircle = document.getElementById('gameTimerBar');

    if (!this.timerEnabled || this.timerSeconds <= 0) {
      if (timerWrapper) timerWrapper.classList.add('d-none');
      return;
    }

    if (timerWrapper) timerWrapper.classList.remove('d-none');
    this.timerRemaining = this.timerSeconds;
    if (timerVal) timerVal.textContent = this.timerRemaining;

    this.timerInterval = setInterval(() => {
      this.timerRemaining--;
      if (timerVal) timerVal.textContent = this.timerRemaining;

      // Update circular / bar progress
      if (timerCircle) {
        const pct = (this.timerRemaining / this.timerSeconds) * 100;
        timerCircle.style.width = `${pct}%`;
        if (this.timerRemaining <= 10) {
          timerCircle.className = 'progress-bar bg-danger progress-bar-striped progress-bar-animated';
        } else if (this.timerRemaining <= 20) {
          timerCircle.className = 'progress-bar bg-warning';
        } else {
          timerCircle.className = 'progress-bar bg-info';
        }
      }

      if (this.timerRemaining <= 10 && this.timerRemaining > 0) {
        window.soundEngine.playTick();
      }

      if (this.timerRemaining <= 0) {
        this.stopTimer();
        this.handleTimeout();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeout() {
    if (this.state !== 'PLAYING') return;
    this.state = 'EVALUATING';
    window.soundEngine.playWrong();

    // Show correct answer
    const q = this.currentQuestion;
    const correctBtn = document.getElementById(`optBtn_${q.correct_answer}`);
    if (correctBtn) correctBtn.classList.add('correct');

    this.sessionReview.push({
      level: this.currentIndex + 1,
      prize_text: window.ladderManager.ladder[this.currentIndex].prize_text,
      question_text: q.question_text,
      image_url: q.image_url,
      player_choice: 'Waktu Habis',
      correct_answer: q.correct_answer,
      is_correct: false,
      explanation: q.explanation || 'Waktu berpikir telah habis.',
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d
      }
    });

    setTimeout(() => {
      this.handleGameOver('timeout');
    }, 2800);
  }

  // --- Lifelines ---
  renderLifelineButtons() {
    const config = window.ladderManager.lifelines;

    const btn50 = document.getElementById('lifeline5050');
    const btnAud = document.getElementById('lifelineAudience');
    const btnSw = document.getElementById('lifelineSwitch');

    if (btn50) {
      btn50.style.display = config.fifty_fifty ? 'inline-flex' : 'none';
      btn50.disabled = this.lifelinesUsed.fifty_fifty;
      btn50.classList.toggle('used', this.lifelinesUsed.fifty_fifty);
    }
    if (btnAud) {
      btnAud.style.display = config.audience ? 'inline-flex' : 'none';
      btnAud.disabled = this.lifelinesUsed.audience;
      btnAud.classList.toggle('used', this.lifelinesUsed.audience);
    }
    if (btnSw) {
      btnSw.style.display = config.switch_question ? 'inline-flex' : 'none';
      btnSw.disabled = this.lifelinesUsed.switch_question;
      btnSw.classList.toggle('used', this.lifelinesUsed.switch_question);
    }
  }

  use5050() {
    if (this.state !== 'PLAYING' || this.lifelinesUsed.fifty_fifty) return;

    window.soundEngine.playLifeline5050();
    this.lifelinesUsed.fifty_fifty = true;
    this.renderLifelineButtons();

    const correct = this.currentQuestion.correct_answer;
    const incorrect = ['A', 'B', 'C', 'D'].filter(k => k !== correct);

    // Randomly pick 2 incorrect options to hide
    const shuffled = [...incorrect].sort(() => Math.random() - 0.5);
    const toHide = shuffled.slice(0, 2);
    this.activeHiddenOptions = toHide;

    toHide.forEach(k => {
      const btn = document.getElementById(`optBtn_${k}`);
      if (btn) {
        btn.classList.add('hidden-option');
        btn.disabled = true;
      }
    });

    // If currently selected option is one of the hidden, reset selection
    if (this.selectedOption && toHide.includes(this.selectedOption)) {
      this.selectedOption = null;
      this.toggleLockInBar(false);
    }
  }

  useAudiencePoll() {
    if (this.state !== 'PLAYING' || this.lifelinesUsed.audience) return;

    window.soundEngine.playLifelineAudience();
    this.lifelinesUsed.audience = true;
    this.renderLifelineButtons();

    const correct = this.currentQuestion.correct_answer;
    const tier = this.currentIndex < 5 ? 1 : (this.currentIndex < 10 ? 2 : 3);

    // Realistic simulation percentages based on difficulty
    let correctPct = 75;
    if (tier === 2) correctPct = 58;
    if (tier === 3) correctPct = 42;

    // Jitter
    correctPct += Math.floor(Math.random() * 10) - 5;
    let remaining = 100 - correctPct;

    const incorrect = ['A', 'B', 'C', 'D'].filter(k => k !== correct);
    const r1 = Math.floor(Math.random() * (remaining - 10)) + 3;
    remaining -= r1;
    const r2 = Math.floor(Math.random() * (remaining - 4)) + 2;
    const r3 = remaining - r2;

    const polls = {
      [correct]: correctPct,
      [incorrect[0]]: r1,
      [incorrect[1]]: r2,
      [incorrect[2]]: r3
    };

    // If 50:50 was already used, set hidden options to 0% and redistribute
    if (this.activeHiddenOptions.length > 0) {
      let extra = 0;
      this.activeHiddenOptions.forEach(k => {
        extra += polls[k];
        polls[k] = 0;
      });
      const visible = ['A', 'B', 'C', 'D'].filter(k => !this.activeHiddenOptions.includes(k));
      if (visible.includes(correct)) {
        polls[correct] += Math.floor(extra * 0.7);
        const other = visible.find(k => k !== correct);
        if (other) polls[other] += Math.ceil(extra * 0.3);
      }
    }

    this.showAudienceModal(polls);
  }

  showAudienceModal(polls) {
    const modalEl = document.getElementById('audiencePollModal');
    if (!modalEl) return;

    ['A', 'B', 'C', 'D'].forEach(k => {
      const val = polls[k] || 0;
      const bar = document.getElementById(`audienceBar_${k}`);
      const valText = document.getElementById(`audienceVal_${k}`);
      if (bar) {
        bar.style.height = `${val}%`;
      }
      if (valText) {
        valText.textContent = `${val}%`;
      }
    });

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }

  useSwitchQuestion() {
    if (this.state !== 'PLAYING' || this.lifelinesUsed.switch_question) return;
    if (this.reserveQuestions.length === 0) {
      alert('Tidak ada soal cadangan yang tersedia di bank soal!');
      return;
    }

    window.soundEngine.playLifelineSwitch();
    this.lifelinesUsed.switch_question = true;
    this.renderLifelineButtons();

    // Take next reserve question
    const newQuestion = this.reserveQuestions.shift();
    this.currentQuestion = newQuestion;
    this.questions[this.currentIndex] = newQuestion;
    this.selectedOption = null;
    this.activeHiddenOptions = [];

    // Re-render
    this.renderQuestionUI();
    this.startTimer();
  }

  // --- Walk Away (Berhenti & Ambil Hadiah) ---
  promptWalkAway() {
    if (this.state !== 'PLAYING') return;

    // Previous level reached prize
    const lastWon = this.currentIndex > 0
      ? window.ladderManager.ladder[this.currentIndex - 1]
      : { prize: 0, prize_text: 'Rp 0' };

    const modalPrompt = document.getElementById('walkAwayPrizeText');
    if (modalPrompt) {
      modalPrompt.textContent = lastWon.prize_text;
    }

    const modalEl = document.getElementById('walkAwayConfirmModal');
    if (modalEl) {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  confirmWalkAway() {
    this.stopTimer();
    window.soundEngine.stopBGM();
    window.soundEngine.playWalkAway();

    const lastWon = this.currentIndex > 0
      ? window.ladderManager.ladder[this.currentIndex - 1]
      : { prize: 0, prize_text: 'Rp 0' };

    this.finalizeGame({
      status: 'walked_away',
      finalPrize: lastWon.prize,
      finalPrizeText: lastWon.prize_text,
      levelsCompleted: this.currentIndex,
      highestLevel: this.currentIndex
    });
  }

  handleGameOver(reason) {
    this.stopTimer();
    window.soundEngine.stopBGM();

    // Calculate safe prize
    const safePrize = window.ladderManager.getGuaranteedPrize(this.currentIndex);

    this.finalizeGame({
      status: 'game_over',
      reason: reason,
      finalPrize: safePrize.prize,
      finalPrizeText: safePrize.prize_text,
      levelsCompleted: this.currentIndex,
      highestLevel: this.currentIndex + 1
    });
  }

  handleGameWon() {
    this.stopTimer();
    window.soundEngine.stopBGM();
    window.soundEngine.playMilestoneWin();

    const topLadder = window.ladderManager.ladder[window.ladderManager.ladder.length - 1];

    this.finalizeGame({
      status: 'won',
      finalPrize: topLadder.prize,
      finalPrizeText: topLadder.prize_text,
      levelsCompleted: window.ladderManager.ladder.length,
      highestLevel: window.ladderManager.ladder.length
    });
  }

  async finalizeGame(resultData) {
    this.state = 'FINISHED';
    const duration = Math.round((Date.now() - (this.startTime || Date.now())) / 1000);

    const historyPayload = {
      player_name: this.playerName,
      category_name: this.categoryFilter === 'all' ? 'Semua Kategori' : (this.currentQuestion?.category_name || 'Edukasi'),
      levels_completed: resultData.levelsCompleted,
      highest_level: resultData.highestLevel,
      final_prize: resultData.finalPrize,
      final_prize_text: resultData.finalPrizeText,
      status: resultData.status,
      duration_seconds: duration,
      review_data: this.sessionReview
    };

    // Save to server
    try {
      await window.apiClient.saveGameHistory(historyPayload);
    } catch (e) {
      console.warn('Gagal menyimpan riwayat permainan ke server:', e);
    }

    // Switch to Result View
    window.app.showResultView(historyPayload);
  }
}

window.gameEngine = new GameEngine();
