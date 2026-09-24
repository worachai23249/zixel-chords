/* ZIXEL CHORDS - SHARED NAVIGATION & AUTH CONTROLLER */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  async function checkSharedAuth() {
    const token = localStorage.getItem('zc_auth_token');
    const authChip = $('#authAvatarChip');
    const authIcon = $('#authDefaultIcon');
    const authLabel = $('#authBtnLabel');
    const authTrigger = $('#authTriggerBtn');
    const userDropdown = $('#userMenuDropdown');
    const userDisplayName = $('#userDisplayName');
    const userUsername = $('#userUsername');
    const userAvatarCircle = $('#userAvatarCircle');

    if (!token) {
      if (authChip) authChip.classList.add('hidden');
      if (authIcon) authIcon.classList.remove('hidden');
      if (authLabel) authLabel.textContent = 'เข้าสู่ระบบ';
      if (userDropdown) userDropdown.classList.add('hidden');
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Token expired or invalid');
      const data = await res.json();
      if (data.authenticated && data.user) {
        const u = data.user;
        const initial = (u.displayName || u.username || 'ZC').slice(0, 2).toUpperCase();
        if (authChip) {
          authChip.textContent = initial;
          authChip.classList.remove('hidden');
        }
        if (authIcon) authIcon.classList.add('hidden');
        if (authLabel) authLabel.textContent = u.displayName || u.username;
        if (userDisplayName) userDisplayName.textContent = u.displayName || u.username;
        if (userUsername) userUsername.textContent = '@' + u.username;
        if (userAvatarCircle) userAvatarCircle.textContent = initial;

        return u;
      } else {
        throw new Error('Not authenticated');
      }
    } catch (_) {
      localStorage.removeItem('zc_auth_token');
      if (authChip) authChip.classList.add('hidden');
      if (authIcon) authIcon.classList.remove('hidden');
      if (authLabel) authLabel.textContent = 'เข้าสู่ระบบ';
      return null;
    }
  }

  function initSharedNav() {
    const authTrigger = $('#authTriggerBtn');
    const userDropdown = $('#userMenuDropdown');
    const logoutBtn = $('#logoutBtn');

    if (authTrigger) {
      authTrigger.addEventListener('click', function (e) {
        const token = localStorage.getItem('zc_auth_token');
        if (token && userDropdown) {
          e.preventDefault();
          e.stopPropagation();
          userDropdown.classList.toggle('hidden');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();
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

    document.addEventListener('click', function (e) {
      if (userDropdown && !userDropdown.classList.contains('hidden')) {
        if (!userDropdown.contains(e.target) && e.target !== authTrigger) {
          userDropdown.classList.add('hidden');
        }
      }
    });



    checkSharedAuth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedNav);
  } else {
    initSharedNav();
  }

  window.checkSharedAuth = checkSharedAuth;
})();
