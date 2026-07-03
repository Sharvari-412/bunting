(function () {
  const ACCENTS = ['#F4B740', '#FF6F59', '#2EC4B6'];
  let birthdays = [];
  let currentUser = null;
  const noteTimers = {}; // debounce timers, one per birthday id

  // ---------- Element refs ----------
  const authView = document.getElementById('authView');
  const appView = document.getElementById('appView');
  const authForm = document.getElementById('authForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const authMsg = document.getElementById('authMsg');
  const signUpBtn = document.getElementById('signUpBtn');
  const signOutBtn = document.getElementById('signOutBtn');

  const garlandEl = document.getElementById('garland');
  const listRegion = document.getElementById('listRegion');
  const listCount = document.getElementById('listCount');
  const form = document.getElementById('birthdayForm');
  const nameInput = document.getElementById('nameInput');
  const dayInput = document.getElementById('dayInput');
  const monthInput = document.getElementById('monthInput');
  const yearInput = document.getElementById('yearInput');
  const formMsg = document.getElementById('formMsg');

  // ================= AUTH =================

  async function checkSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentUser = session.user;
      showApp();
    } else {
      showAuth();
    }
  }

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) showApp(); else showAuth();
  });

  function showAuth() {
    authView.style.display = 'block';
    appView.style.display = 'none';
  }

  function showApp() {
    authView.style.display = 'none';
    appView.style.display = 'block';
    loadBirthdays();
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMsg.textContent = '';
    const { error } = await sb.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (error) authMsg.textContent = error.message;
  });

  signUpBtn.addEventListener('click', async () => {
    authMsg.textContent = '';
    const { error } = await sb.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (error) {
      authMsg.textContent = error.message;
    } else {
      authMsg.style.color = 'var(--teal)';
      authMsg.textContent = 'Check your email to confirm your account, then sign in.';
    }
  });

  signOutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
  });

  // ================= COUNTDOWN =================

  function getCountdown(dateStr) {
    const now = new Date();
    const birth = new Date(dateStr + 'T00:00:00');
    let next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (next < now) next = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());

    const diffMs = next - now;
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const turningAge = next.getFullYear() - birth.getFullYear();

    return { days, hours, minutes, nextDate: next, turningAge };
  }

  function formatDate(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatCountdown(c) {
    if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "It's today! 🎂";
    if (c.days === 0) return `${c.hours}h ${c.minutes}m left`;
    return `${c.days}d ${c.hours}h ${c.minutes}m`;
  }

  // Recompute just the countdown text every minute, without a full re-fetch
  setInterval(() => {
    if (currentUser) refreshCountdownText();
  }, 60000);

  function refreshCountdownText() {
    document.querySelectorAll('[data-countdown-for]').forEach(el => {
      const b = birthdays.find(x => x.id === el.dataset.countdownFor);
      if (!b) return;
      const c = getCountdown(b.date);
      el.textContent = formatCountdown(c);
      el.classList.toggle('today', c.days === 0 && c.hours === 0 && c.minutes === 0);
    });
  }

  // ================= DATA =================

  function withComputed(list) {
    return list
      .map(b => ({ ...b, ...getCountdown(b.date) }))
      .sort((a, b) => a.days - b.days || a.hours - b.hours || a.minutes - b.minutes);
  }

  async function loadBirthdays() {
    listRegion.innerHTML = '<div class="loading">Loading your birthdays…</div>';
    const { data, error } = await sb
      .from('birthdays')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      listRegion.innerHTML = `<div class="empty-state"><div class="big">Something went wrong</div><div>${error.message}</div></div>`;
      return;
    }
    birthdays = data;
    render();
  }

  async function addBirthday(name, date) {
    const { error } = await sb
      .from('birthdays')
      .insert({ name, date, user_id: currentUser.id, notes: '' });
    if (error) {
      formMsg.textContent = error.message;
      return false;
    }
    await loadBirthdays();
    return true;
  }

  async function removeBirthday(id) {
    birthdays = birthdays.filter(b => b.id !== id);
    render();
    const { error } = await sb.from('birthdays').delete().eq('id', id);
    if (error) await loadBirthdays(); // resync if the delete failed
  }

  function saveNotes(id, notes) {
    clearTimeout(noteTimers[id]);
    noteTimers[id] = setTimeout(async () => {
      await sb.from('birthdays').update({ notes }).eq('id', id);
    }, 700); // debounce: waits until typing pauses before saving
  }

  // ================= RENDER =================

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    const sorted = withComputed(birthdays);

    // --- Garland ---
    garlandEl.innerHTML = '';
    if (sorted.length === 0) {
      garlandEl.innerHTML = '<div class="garland-empty">No flags yet — add a birthday below</div>';
    } else {
      sorted.slice(0, 10).forEach((b, i) => {
        const flag = document.createElement('div');
        flag.className = 'flag' + (i === 0 ? ' soonest' : '');
        const color = ACCENTS[i % ACCENTS.length];
        const shape = document.createElement('div');
        shape.className = 'flag-shape';
        shape.style.background = color;
        shape.textContent = b.days === 0 ? '🎂' : b.days;
        const label = document.createElement('div');
        label.className = 'flag-name';
        label.textContent = b.name.split(' ')[0];
        flag.appendChild(shape);
        flag.appendChild(label);
        garlandEl.appendChild(flag);
      });
    }

    // --- List ---
    listCount.textContent = sorted.length ? `${sorted.length} saved` : '';
    if (sorted.length === 0) {
      listRegion.innerHTML = `
        <div class="empty-state">
          <div class="big">The garland is bare</div>
          <div>Add the first birthday above to start the countdown.</div>
        </div>`;
      return;
    }

    const cards = sorted.map(b => {
      let badgeClass = '';
      let badgeText = `${b.days}d`;
      if (b.days === 0 && b.hours === 0 && b.minutes === 0) { badgeClass = 'today'; badgeText = 'TODAY'; }
      else if (b.days <= 7) { badgeClass = 'soon'; }

      return `
        <div class="card" data-id="${b.id}">
          <div class="badge ${badgeClass}">${badgeText}</div>
          <div class="card-info">
            <p class="card-name">${escapeHtml(b.name)}</p>
            <p class="card-date">${formatDate(b.nextDate)} · turning ${b.turningAge}</p>
            <span class="countdown" data-countdown-for="${b.id}">${formatCountdown(b)}</span>
            <label class="notes-label" for="notes-${b.id}">Gift ideas</label>
            <textarea class="notes-input" id="notes-${b.id}" data-id="${b.id}" placeholder="Jot down gift ideas, sizes, wish-list links…">${escapeHtml(b.notes || '')}</textarea>
          </div>
          <button class="del-btn" data-id="${b.id}" aria-label="Delete ${escapeHtml(b.name)}">✕</button>
        </div>`;
    }).join('');

    listRegion.innerHTML = `<div class="cards">${cards}</div>`;

    listRegion.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => removeBirthday(btn.dataset.id));
    });

    listRegion.querySelectorAll('.notes-input').forEach(area => {
      area.addEventListener('input', () => saveNotes(area.dataset.id, area.value));
    });
  }

  // ================= FORM =================

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    const name = nameInput.value.trim();
    const day = dayInput.value;
    const month = monthInput.value;
    const year = yearInput.value;

    if (!name || !day || !month || !year) {
      formMsg.textContent = 'Add a name and a full date to continue.';
      return;
    }

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const testDate = new Date(date);
    if (isNaN(testDate.getTime()) || testDate.getDate() !== Number(day)) {
      formMsg.textContent = "That date doesn't look valid — double check the day and month.";
      return;
    }

    const ok = await addBirthday(name, date);
    if (ok) {
      nameInput.value = '';
      dayInput.value = '';
      monthInput.value = '';
      yearInput.value = '';
      nameInput.focus();
    }
  });

  checkSession();
})();