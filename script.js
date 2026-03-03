// State Management
const state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    view: 'auth',
    location: null,
    history: JSON.parse(localStorage.getItem('history')) || [],
    currentDate: new Date()
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
    navItems: document.querySelectorAll('.nav-item')
};

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
    }

    if (viewName === 'calendar') {
        renderCalendar();
    }

    // Update Nav Active State
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    initIcons();
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
    if (state.view === 'dashboard') setTimeout(updateClock, 1000);
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

    const entry = {
        id: Date.now(),
        date: now.toISOString(),
        type: 'work',
        notes: notes,
        location: state.location
    };

    state.history.push(entry);
    localStorage.setItem('history', JSON.stringify(state.history));

    alert('Timbratura effettuata con successo!');
    document.getElementById('clock-notes').value = '';
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
    }
}

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
