/* ZIXEL CHORDS - DEDICATED LOGIN & PROFILE CONTROLLER */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);

  let authMode = 'login'; // 'login' or 'register'

  function switchMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';

    const tabLogin = $('#authTabLogin');
    const tabRegister = $('#authTabRegister');
    const title = $('#authCardTitle');
    const displayNameGroup = $('#displayNameGroup');
    const submitLabel = $('#authSubmitLabel');
    const switchText = $('#authSwitchText');
    const switchReg = $('#authSwitchToRegister');
    const switchLog = $('#authSwitchToLogin');
    const errorMsg = $('#authErrorMsg');

    if (tabLogin) tabLogin.classList.toggle('active', isLogin);
    if (tabRegister) tabRegister.classList.toggle('active', !isLogin);
    if (title) title.textContent = isLogin ? 'เข้าสู่ระบบ Zixel' : 'สมัครสมาชิก Zixel';
    if (displayNameGroup) displayNameGroup.classList.toggle('hidden', isLogin);
    if (submitLabel) submitLabel.textContent = isLogin ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้';
    if (switchText) switchText.textContent = isLogin ? 'ยังไม่มีบัญชีใช่ไหม?' : 'มีบัญชีอยู่แล้วใช่ไหม?';
    if (switchReg) switchReg.classList.toggle('hidden', !isLogin);
    if (switchLog) switchLog.classList.toggle('hidden', isLogin);
    if (errorMsg) errorMsg.classList.add('hidden');
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const usernameInput = $('#authUsername');
    const passwordInput = $('#authPassword');
    const displayNameInput = $('#authDisplayName');
    const errorMsg = $('#authErrorMsg');
    const submitBtn = $('#authSubmitBtn');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const displayName = displayNameInput ? displayNameInput.value.trim() : '';

    if (!username || !password) {
      if (errorMsg) {
        errorMsg.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
        errorMsg.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (errorMsg) errorMsg.classList.add('hidden');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = { username, password };
      if (authMode === 'register' && displayName) payload.displayName = displayName;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'การดำเนินการล้มเหลว');

      localStorage.setItem('zc_auth_token', data.token);
      renderDashboard(data.user);
    } catch (err) {
      if (errorMsg) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function renderDashboard(user) {
    const authBox = $('#authBox');
    const profileBox = $('#profileDashboard');

    if (authBox) authBox.classList.add('hidden');
    if (profileBox) profileBox.classList.remove('hidden');

    const initial = (user.displayName || user.username || 'ZC').slice(0, 2).toUpperCase();
    const avatarEl = $('#profileAvatar');
    const nameEl = $('#profileDisplayName');
    const userEl = $('#profileUsername');
    const songCountEl = $('#profileSongCount');

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = user.displayName || user.username;
    if (userEl) userEl.textContent = '@' + user.username;

    // Fetch library count
    try {
      const res = await fetch('/api/library');
      if (res.ok) {
        const songs = await res.json();
        if (songCountEl) songCountEl.textContent = Array.isArray(songs) ? songs.length : '0';
      }
    } catch (_) {
      if (songCountEl) songCountEl.textContent = '0';
    }
  }

  async function checkUserSession() {
    const token = localStorage.getItem('zc_auth_token');
    if (!token) {
      const authBox = $('#authBox');
      const profileBox = $('#profileDashboard');
      if (authBox) authBox.classList.remove('hidden');
      if (profileBox) profileBox.classList.add('hidden');
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Not valid');
      const data = await res.json();
      if (data.authenticated && data.user) {
        renderDashboard(data.user);
      } else {
        throw new Error('Not authenticated');
      }
    } catch (_) {
      localStorage.removeItem('zc_auth_token');
      const authBox = $('#authBox');
      const profileBox = $('#profileDashboard');
      if (authBox) authBox.classList.remove('hidden');
      if (profileBox) profileBox.classList.add('hidden');
    }
  }

  function initLoginPage() {
    checkUserSession();

    const tabLogin = $('#authTabLogin');
    const tabRegister = $('#authTabRegister');
    const switchReg = $('#authSwitchToRegister');
    const switchLog = $('#authSwitchToLogin');
    const authForm = $('#authForm');
    const logoutBtn = $('#profileLogoutBtn');

    if (tabLogin) tabLogin.addEventListener('click', () => switchMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchMode('register'));
    if (switchReg) switchReg.addEventListener('click', (e) => { e.preventDefault(); switchMode('register'); });
    if (switchLog) switchLog.addEventListener('click', (e) => { e.preventDefault(); switchMode('login'); });
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('zc_auth_token');
        try {
          if (token) {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + token }
            });
          }
        } catch (_) {}
        localStorage.removeItem('zc_auth_token');
        window.location.reload();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
  } else {
    initLoginPage();
  }
})();
