// State Management
const state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    view: 'auth',
    location: null,
    history: JSON.parse(localStorage.getItem('history')) || [],
    currentDate: new Date(),
    weeklyHours: parseFloat(localStorage.getItem('weeklyHours')) || 0,
    startTime: localStorage.getItem('startTime') ? parseInt(localStorage.getItem('startTime')) : null,
    lastResetWeek: localStorage.getItem('lastResetWeek') || null,
    selectedDate: null
};

// Initialize Lucide Icons
function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// UI Elements
const elements = {
    authSection: document.getElementById('auth-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    calendarSection: document.getElementById('calendar-section'),
    header: document.getElementById('main-header'),
    bottomNav: document.getElementById('bottom-nav'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    sliderThumb: document.getElementById('slider-thumb'),
    sliderTrack: document.getElementById('slider-track'),
    geoStatus: document.getElementById('geo-status'),
    geoLabel: document.getElementById('geo-label'),
    calendarDays: document.getElementById('calendar-days'),
    monthDisplay: document.getElementById('current-month-year'),
    logoutBtn: document.getElementById('logout-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    weeklyHoursVal: document.getElementById('weekly-hours-val'),
    resetHoursBtn: document.getElementById('reset-hours'),
    sliderText: document.querySelector('.slider-text'),
    dayDetails: document.getElementById('day-details'),
    dayEntriesList: document.getElementById('day-entries-list'),
    selectedDayLabel: document.getElementById('selected-day-label'),
    closeDayDetails: document.getElementById('close-day-details'),
    clearHistoryBtn: document.getElementById('clear-history')
};

// ... in state initialization ...
state.selectedDate = null;

// Helper: Navigation
function navigate(viewName) {
    state.view = viewName;

    // Toggle Sections
    elements.authSection.classList.toggle('hidden', viewName !== 'auth');
    elements.dashboardSection.classList.toggle('hidden', viewName !== 'dashboard');
    elements.calendarSection.classList.toggle('hidden', viewName !== 'calendar');

    // Toggle UI Shell
    elements.header.classList.toggle('hidden', viewName === 'auth');
    elements.bottomNav.classList.toggle('hidden', viewName === 'auth');

    if (viewName === 'dashboard') {
        updateClock();
        requestLocation();
        updateGreeting();
        checkWeeklyReset();
        updateWeeklyDisplay();
    }

    if (viewName === 'calendar') {
        renderCalendar();
    }

    // Update Nav Active State
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update Slider text based on clock state
    if (state.startTime) {
        elements.sliderText.textContent = "Scorri per Uscire";
    } else {
        elements.sliderText.textContent = "Scorri per Timbrare";
    }

    initIcons();
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

function checkWeeklyReset() {
    const currentWeek = getWeekNumber(new Date());
    if (state.lastResetWeek !== currentWeek) {
        resetWeeklyHours(false); // Reset without alert
        state.lastResetWeek = currentWeek;
        localStorage.setItem('lastResetWeek', currentWeek);
    }
}

function updateWeeklyDisplay() {
    let currentSessionHours = 0;
    if (state.startTime) {
        const diffMs = Date.now() - state.startTime;
        currentSessionHours = diffMs / (1000 * 60 * 60);
    }
    const total = state.weeklyHours + currentSessionHours;
    elements.weeklyHoursVal.textContent = `${total.toFixed(2)}h`;
}

function resetWeeklyHours(interactive = true) {
    if (interactive && !confirm("Vuoi resettare il conteggio delle ore settimanali?")) return;

    state.weeklyHours = 0;
    state.startTime = null;
    localStorage.removeItem('startTime');
    localStorage.setItem('weeklyHours', 0);
    updateWeeklyDisplay();
    if (interactive) {
        elements.sliderText.textContent = "Scorri per Timbrare";
        alert("Conteggio resettato con successo.");
    }
}

// Authentication Logic
elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        elements.loginForm.classList.toggle('active', tab === 'login');
        elements.registerForm.classList.toggle('active', tab === 'register');
    });
});

elements.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('reg-phone').value;
    const company = document.getElementById('reg-company').value;
    const role = document.getElementById('reg-role').value;

    const user = { phone, company, role, name: role.toUpperCase() };
    localStorage.setItem('user', JSON.stringify(user));
    state.user = user;

    alert(`Registrazione completata! Inserisci il codice SMS che riceverai al numero ${phone}`);
    navigate('auth'); // Stay on auth to login
    document.querySelector('[data-tab="login"]').click();
});

elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('login-submit');
    const otpGroup = document.getElementById('otp-group');

    if (otpGroup.classList.contains('hidden')) {
        // Step 1: Request Code
        submitBtn.textContent = 'Verifica Codice';
        otpGroup.classList.remove('hidden');
        alert('Codice SMS inviato: 123456 (Simulazione)');
    } else {
        // Step 2: Verify Code
        const otp = document.getElementById('login-otp').value;
        if (otp === '123456') {
            state.user = state.user || { name: 'Operatore', role: 'OSS' };
            navigate('dashboard');
        } else {
            alert('Codice non valido. Riprova con 123456');
        }
    }
});

// Geolocation
function requestLocation() {
    if (!navigator.geolocation) {
        updateGeoStatus('error', 'GPS non supportato');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updateGeoStatus('success', 'Localizzato correttamente');
        },
        (err) => {
            updateGeoStatus('error', 'Attiva il GPS per timbrare');
        }
    );
}

function updateGeoStatus(type, message) {
    elements.geoStatus.className = `status-badge ${type}`;
    elements.geoLabel.textContent = message;
    initIcons();
}

// Real-time Clock
function updateClock() {
    const now = new Date();
    document.getElementById('real-time-clock').textContent = now.toLocaleTimeString('it-IT');
    if (state.view === 'dashboard') {
        updateWeeklyDisplay();
        setTimeout(updateClock, 1000);
    }
}

function updateGreeting() {
    if (state.user) {
        document.getElementById('user-display-name').textContent = state.user.name;
    }
}

// Slider Confirmation Logic
let isDragging = false;
let startX = 0;
const thumb = elements.sliderThumb;
const track = elements.sliderTrack;

thumb.addEventListener('mousedown', startDrag);
thumb.addEventListener('touchstart', startDrag, { passive: true });

window.addEventListener('mousemove', drag);
window.addEventListener('touchmove', drag, { passive: false });

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

function startDrag(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    thumb.style.transition = 'none';
}

function drag(e) {
    if (!isDragging) return;

    const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    let deltaX = currentX - startX;
    const maxX = track.offsetWidth - thumb.offsetWidth - 8;

    if (deltaX < 0) deltaX = 0;
    if (deltaX > maxX) deltaX = maxX;

    thumb.style.transform = `translateX(${deltaX}px)`;

    // Change color based on progress (Green to Red as requested)
    const progress = deltaX / maxX;
    const red = Math.floor(progress * 214); // 0 to 214
    const green = Math.floor(184 - (progress * 136)); // 184 to 48
    const blue = Math.floor(148 - (progress * 99)); // 148 to 49

    thumb.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    const maxX = track.offsetWidth - thumb.offsetWidth - 8;
    const currentTransform = new WebKitCSSMatrix(getComputedStyle(thumb).transform).m41;

    if (currentTransform > maxX * 0.9) {
        // Logic for successful clock-in
        handleClockIn();
    } else {
        // Reset slider
        thumb.style.transition = 'all 0.3s';
        thumb.style.transform = 'translateX(0)';
        thumb.style.backgroundColor = 'var(--primary)';
    }
}

function handleClockIn() {
    if (!state.location) {
        alert('Impossibile timbrare senza posizione GPS.');
        resetSlider();
        return;
    }

    const notes = document.getElementById('clock-notes').value;
    const now = new Date();

    if (!state.startTime) {
        // Clock In
        state.startTime = now.getTime();
        localStorage.setItem('startTime', state.startTime);
        elements.sliderText.textContent = "Scorri per Uscire";
        alert('Turno iniziato correttamente!');
    } else {
        // Clock Out
        const diffMs = now.getTime() - state.startTime;
        const diffHrs = diffMs / (1000 * 60 * 60);

        state.weeklyHours += diffHrs;
        localStorage.setItem('weeklyHours', state.weeklyHours.toFixed(4));

        const entry = {
            id: Date.now(),
            date: now.toISOString(),
            duration: diffHrs.toFixed(2),
            type: 'work',
            notes: notes,
            location: state.location
        };

        state.history.push(entry);
        localStorage.setItem('history', JSON.stringify(state.history));

        state.startTime = null;
        localStorage.removeItem('startTime');
        elements.sliderText.textContent = "Scorri per Timbrare";

        alert(`Turno terminato. Hai lavorato ${diffHrs.toFixed(2)} ore.`);
        document.getElementById('clock-notes').value = '';
    }

    updateWeeklyDisplay();
    resetSlider();
    renderCalendar();
}

function resetSlider() {
    thumb.style.transition = 'all 0.3s';
    thumb.style.transform = 'translateX(0)';
    thumb.style.backgroundColor = 'var(--primary)';
}

// Calendar Logic
function renderCalendar() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    elements.monthDisplay.textContent = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(state.currentDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    elements.calendarDays.innerHTML = '';

    // Empty slots for start of month
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start
    for (let i = 0; i < offset; i++) {
        const emptyDiv = document.createElement('div');
        elements.calendarDays.appendChild(emptyDiv);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.textContent = d;

        const today = new Date();
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        // Find entries for this day
        const dayDate = new Date(year, month, d).toLocaleDateString();
        const dailyEntries = state.history.filter(h => new Date(h.date).toLocaleDateString() === dayDate);

        if (dailyEntries.length > 0) {
            dailyEntries.forEach(entry => {
                const status = document.createElement('span');
                status.className = `day-status ${entry.type}`;
                dayDiv.appendChild(status);
            });
        }

        elements.calendarDays.appendChild(dayDiv);

        dayDiv.onclick = () => showDayDetails(new Date(year, month, d));
    }
}

function showDayDetails(date) {
    state.selectedDate = date;
    const dateStr = date.toLocaleDateString();
    elements.selectedDayLabel.textContent = `Dettagli: ${dateStr}`;
    elements.dayDetails.classList.remove('hidden');

    const dayEntries = state.history.filter(h => new Date(h.date).toLocaleDateString() === dateStr);
    elements.dayEntriesList.innerHTML = '';

    if (dayEntries.length === 0) {
        elements.dayEntriesList.innerHTML = '<p class="text-muted">Nessun turno registrato.</p>';
        return;
    }

    dayEntries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'entry-item';

        let typeLabel = entry.type;
        if (typeLabel === 'holiday') typeLabel = 'Ferie';
        if (typeLabel === 'sick') typeLabel = 'Malattia';
        if (typeLabel === 'exit') typeLabel = 'Uscita Ant.';
        if (typeLabel === 'work') typeLabel = 'Lavoro';

        item.innerHTML = `
            <div class="entry-info">
                <span class="entry-type">${typeLabel}</span>
                <span class="entry-notes">${entry.notes || ''}</span>
            </div>
            <button class="delete-entry-btn" onclick="deleteEntry(${entry.id})">
                <i data-lucide="trash-2"></i>
                <span>Cancella</span>
            </button>
        `;
        elements.dayEntriesList.appendChild(item);
    });
    initIcons();
}

function deleteEntry(id) {
    if (!confirm("Sei sicuro di voler eliminare questa voce?")) return;

    state.history = state.history.filter(h => h.id !== id);
    localStorage.setItem('history', JSON.stringify(state.history));

    // Refresh display
    renderCalendar();

    // Update details if still open
    if (state.selectedDate) {
        showDayDetails(state.selectedDate);
    }
}

function clearHistory() {
    if (!confirm("Sei sicuro di voler svuotare tutta la cronologia? Questa azione non può essere annullata.")) return;

    state.history = [];
    localStorage.removeItem('history');
    state.weeklyHours = 0;
    localStorage.setItem('weeklyHours', 0);

    renderCalendar();
    elements.dayDetails.classList.add('hidden');
    updateWeeklyDisplay();
    alert("Cronologia svuotata correttamente.");
}

elements.closeDayDetails.onclick = () => {
    elements.dayDetails.classList.add('hidden');
};

document.getElementById('prev-month').onclick = () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderCalendar();
};

document.getElementById('next-month').onclick = () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderCalendar();
};

// Nav Listeners
elements.navItems.forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.view));
});

document.getElementById('go-to-calendar').onclick = () => navigate('calendar');
document.getElementById('back-to-dash').onclick = () => navigate('dashboard');
elements.resetHoursBtn.onclick = () => resetWeeklyHours(true);
if (elements.clearHistoryBtn) elements.clearHistoryBtn.onclick = clearHistory;

elements.logoutBtn.onclick = () => {
    localStorage.removeItem('user');
    state.user = null;
    navigate('auth');
};

// Leave Request Integration
document.querySelector('.add-btn').onclick = () => {
    const type = document.getElementById('leave-type').value;
    const date = document.getElementById('leave-date').value;

    if (!date) {
        alert('Seleziona una data');
        return;
    }

    const entry = {
        id: Date.now(),
        date: new Date(date).toISOString(),
        type: type === 'ferie' ? 'holiday' : (type === 'malattia' ? 'sick' : 'exit'),
        notes: `Richiesta ${type}`
    };

    state.history.push(entry);
    localStorage.setItem('history', JSON.stringify(state.history));
    renderCalendar();
    alert('Richiesta inserita nel calendario.');
};

// Initial Load
if (state.user) {
    navigate('dashboard');
} else {
    navigate('auth');
}
initIcons();
