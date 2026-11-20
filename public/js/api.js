/**
 * Millionaire API Client Module
 * Communicates with backend endpoints with offline fallback resilience.
 */
class ApiClient {
  constructor() {
    this.token = localStorage.getItem('millionaire_token') || null;
    this.user = JSON.parse(localStorage.getItem('millionaire_user') || 'null');
  }

  setSession(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem('millionaire_token', token);
      localStorage.setItem('millionaire_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('millionaire_token');
      localStorage.removeItem('millionaire_user');
    }
  }

  isLoggedIn() {
    return !!this.token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      if (res.status === 401 && this.token) {
        this.setSession(null, null);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `HTTP error ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API] Request failed for ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth
  async login(username, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.success && res.token) {
      this.setSession(res.token, res.user);
    }
    return res;
  }

  async logout() {
    this.setSession(null, null);
    return { success: true };
  }

  async checkAuth() {
    if (!this.token) return { authenticated: false };
    try {
      return await this.request('/api/auth/me');
    } catch (e) {
      return { authenticated: false };
    }
  }

  async changePassword(newPassword) {
    return await this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  }

  // Categories
  async getCategories() {
    return await this.request('/api/categories');
  }

  async createCategory(name, description) {
    return await this.request('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  // Questions
  async getQuestions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.search) params.append('search', filters.search);
    return await this.request(`/api/questions?${params.toString()}`);
  }

  async getQuestionById(id) {
    return await this.request(`/api/questions/${id}`);
  }

  async createQuestion(data) {
    return await this.request('/api/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateQuestion(id, data) {
    return await this.request(`/api/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteQuestion(id) {
    return await this.request(`/api/questions/${id}`, {
      method: 'DELETE'
    });
  }

  async bulkImportQuestions(questions) {
    return await this.request('/api/questions/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ questions })
    });
  }

  async uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await this.request('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              data: reader.result
            })
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
      reader.readAsDataURL(file);
    });
  }

  // Game Session Questions
  async getGameQuestions(categoryId = 'all') {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'all') {
      params.append('categoryId', categoryId);
    }
    return await this.request(`/api/game/questions?${params.toString()}`);
  }

  // Settings
  async getSettings() {
    return await this.request('/api/settings');
  }

  async saveSettings(settings) {
    return await this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async resetSettings() {
    return await this.request('/api/settings/reset', {
      method: 'POST'
    });
  }

  // History
  async getHistory() {
    return await this.request('/api/history');
  }

  async saveGameHistory(entry) {
    return await this.request('/api/history', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  }

  async clearHistory() {
    return await this.request('/api/history', {
      method: 'DELETE'
    });
  }
}

window.apiClient = new ApiClient();
