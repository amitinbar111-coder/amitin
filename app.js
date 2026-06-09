/**
 * app.js - לוגיקת האפליקציה, רינדור ממשקים וניהול אינטראקציות משתמש
 */

// מצב גלובלי של האפליקציה (State)
const AppState = {
    currentView: 'calendar',       // calendar, admin, settings
    adminActiveTab: 'cars',        // cars, permissions
    selectedDate: '',              // YYYY-MM-DD
    activeBookingIdForDetail: null,// מזהה הזמנה פעילה לצורך תצוגת פרטים
    theme: 'dark'                  // dark, light
};

const App = {
    // --- אתחול האפליקציה ---
    init() {
        console.log("Initializing Car Sharing Fleet App...");
        
        // הגדרת תאריך ראשוני כיום הנוכחי
        AppState.selectedDate = this.getTodayDateString();
        
        // טעינת הגדרת ערכת הנושא מ-localStorage
        const savedTheme = localStorage.getItem('cs_theme') || 'dark';
        this.setTheme(savedTheme);

        // רישום מאזינים לאירועי טפסים וכפתורים
        this.registerEventListeners();
        
        // בדיקת חיבור משתמש
        this.checkAuthStatus();
        
        // בדיקה והפעלת Google GSI במידת הצורך
        this.initGoogleSignIn();
    },

    // פונקציות עזר לתאריכים
    getTodayDateString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    formatHebrewDate(dateStr) {
        const d = new Date(dateStr);
        const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        return `${days[d.getDay()]}, ${d.getDate()} ב${months[d.getMonth()]} ${d.getFullYear()}`;
    },

    // רישום מאזיני אירועים
    registerEventListeners() {
        // כפתור שינוי ערכת נושא
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            const nextTheme = AppState.theme === 'dark' ? 'light' : 'dark';
            this.setTheme(nextTheme);
        });

        // כפתור כניסה עם גוגל (מדמה)
        document.getElementById('google-signin-btn-mock').addEventListener('click', () => {
            this.showMockGoogleLoginWindow();
        });

        // כפתור פתיחת מודל הזמנה
        document.getElementById('btn-open-booking-modal').addEventListener('click', () => {
            this.openBookingModal();
        });

        // כפתור פתיחת מודל הוספת רכב
        document.getElementById('btn-open-vehicle-modal').addEventListener('click', () => {
            this.openVehicleModal();
        });

        // כפתור פתיחת מודל הוספת משתמש
        document.getElementById('btn-open-user-modal').addEventListener('click', () => {
            this.openUserModal();
        });
        
        // הגדרת תאריך נוכחי בתיבת הבחירה (DatePicker)
        const datePicker = document.getElementById('datepicker');
        if (datePicker) {
            datePicker.value = AppState.selectedDate;
        }
    },

    // הגדרת ערכת נושא
    setTheme(theme) {
        AppState.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('cs_theme', theme);
        
        // עדכון אייקון
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            if (theme === 'light') {
                // אייקון ירח למעבר לכהה
                themeIcon.innerHTML = `<path d="M12 3c.132 0 .263 0 .393.007a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.999z"/>`;
            } else {
                // אייקון שמש למעבר לבהיר
                themeIcon.innerHTML = `<path d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-14c-.6 0-1-.4-1-1V2c0-.6.4-1 1-1s1 .4 1 1v1c0 .6-.4 1-1 1zm0 16c-.6 0-1 .4-1 1v1c0 .6.4 1 1 1s1-.4 1-1v-1c0-.6-.4-1-1-1zm8-9c0-.6.4-1 1-1h1c.6 0 1 .4 1 1s-.4 1-1 1h-1c-.6 0-1-.4-1-1zM2 12c0-.6.4-1 1-1h1c.6 0 1 .4 1 1s-.4 1-1 1H3c-.6 0-1-.4-1-1zm14.8-4.8c-.4-.4-.4-1 0-1.4l.7-.7c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-.7.7c-.4.4-1 .4-1.4 0zm-9.2 9.2c-.4-.4-.4-1 0-1.4l.7-.7c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-.7.7c-.4.4-1 .4-1.4 0zm9.2 0c.4-.4 1-.4 1.4 0l.7.7c.4.4.4 1 0 1.4s-1 .4-1.4 0l-.7-.7c-.4-.4-.4-1 0-1.4zM6.8 6.8c.4-.4 1-.4 1.4 0l.7.7c.4.4.4 1 0 1.4s-1 .4-1.4 0l-.7-.7c-.4-.4-.4-1 0-1.4z"/>`;
            }
        }
    },

    // --- אימות כניסה והתחברות (Auth & Google) ---
    checkAuthStatus() {
        const user = DB.getCurrentUser();
        if (user) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'flex';
            this.renderApp();
        } else {
            document.getElementById('app-screen').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
            this.renderSandboxUsers();
        }
    },

    // רינדור רשימת משתמשי הבדיקה במסך הכניסה
    renderSandboxUsers() {
        const container = document.getElementById('sandbox-users-list');
        if (!container) return;
        
        const users = DB.getUsers();
        container.innerHTML = users.map(u => {
            const letter = u.name.charAt(0);
            const badgeClass = u.role === 'admin' ? 'badge-admin' : 'badge-member';
            const roleText = u.role === 'admin' ? 'מנהל מערכת' : 'חבר קהילה';
            
            return `
                <div class="sandbox-user-card" onclick="App.handleMockLogin('${u.id}')">
                    <div class="user-avatar">${letter}</div>
                    <div class="user-details">
                        <div class="user-name">${u.name}</div>
                        <div class="user-role">${u.email}</div>
                    </div>
                    <span class="badge ${badgeClass}">${roleText}</span>
                </div>
            `;
        }).join('');
    },

    // התחברות עם משתמש בדיקה
    handleMockLogin(userId) {
        const user = DB.getUserById(userId);
        if (user) {
            DB.setCurrentUser(user);
            this.showToast(`ברוך הבא, ${user.name}! התחברת בהצלחה (Sandbox)`, 'success');
            this.checkAuthStatus();
        }
    },

    // פתיחת חלון התחברות גוגל מדומה (Mock popup window for nice UI)
    showMockGoogleLoginWindow() {
        const email = prompt("הזן כתובת אימייל מדומה של גוגל:", "yossi.cohen@gmail.com");
        if (!email) return;
        
        const name = prompt("הזן שם מלא עבור חשבון הגוגל:", "יוסי כהן");
        if (!name) return;

        const profile = {
            email: email,
            name: name,
            picture: ''
        };

        const user = DB.registerOrLoginUser(profile);
        this.showToast(`התחברת בהצלחה עם Google עבור ${user.name}`, 'success');
        this.checkAuthStatus();
    },

    // אתחול Google Identity Services (GIS)
    initGoogleSignIn() {
        const clientId = DB.getGoogleClientId();
        const gsiContainer = document.getElementById('google-gsi-container');
        const mockBtn = document.getElementById('google-signin-btn-mock');

        if (!clientId) {
            // אין מפתח גוגל - מציגים את כפתור הסימולציה
            if (gsiContainer) gsiContainer.style.display = 'none';
            if (mockBtn) mockBtn.style.display = 'flex';
            return;
        }

        // יש מפתח גוגל - מפעילים את ה-SDK האמיתי
        if (gsiContainer) gsiContainer.style.display = 'block';
        if (mockBtn) mockBtn.style.display = 'none';

        try {
            window.onload = () => {
                if (typeof google !== 'undefined') {
                    google.accounts.id.initialize({
                        client_id: clientId,
                        callback: (res) => this.handleGoogleCredentialResponse(res)
                    });
                    google.accounts.id.renderButton(
                        document.getElementById("google-gsi-container"),
                        { theme: AppState.theme === 'dark' ? "filled_black" : "outline", size: "large", width: 320 }
                    );
                }
            };
            
            // במידה והדף כבר נטען
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (res) => this.handleGoogleCredentialResponse(res)
                });
                google.accounts.id.renderButton(
                    document.getElementById("google-gsi-container"),
                    { theme: AppState.theme === 'dark' ? "filled_black" : "outline", size: "large", width: 320 }
                );
            }
        } catch (err) {
            console.error("שגיאה באתחול Google Identity Services:", err);
        }
    },

    // פענוח ה-Token מגוגל
    handleGoogleCredentialResponse(response) {
        try {
            const token = response.credential;
            // פענוח ה-JWT
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const profile = JSON.parse(jsonPayload);
            
            // רישום / כניסה
            const user = DB.registerOrLoginUser({
                email: profile.email,
                name: profile.name,
                picture: profile.picture
            });

            this.showToast(`שלום ${user.name}, כניסה באמצעות Google בוצעה בהצלחה!`, 'success');
            this.checkAuthStatus();
        } catch (e) {
            console.error("פענוח JWT נכשל:", e);
            this.showToast("התחברות גוגל נכשלה. נסה שנית.", 'error');
        }
    },

    handleLogout() {
        DB.logout();
        AppState.currentView = 'calendar'; // איפוס
        this.showToast("התנתקת מהמערכת", 'info');
        this.checkAuthStatus();
    },

    // --- רינדור ממשק האפליקציה (View Management) ---
    renderApp() {
        const currentUser = DB.getCurrentUser();
        if (!currentUser) return;

        // עדכון פרטי פרופיל בסרגל העליון
        document.getElementById('header-user-avatar').innerText = currentUser.name.charAt(0);
        document.getElementById('header-user-name').innerText = currentUser.name;
        
        const roleBadge = document.getElementById('header-user-role');
        if (currentUser.role === 'admin') {
            roleBadge.innerText = 'מנהל מערכת';
            roleBadge.className = 'badge badge-admin';
            // הצגת קישור מנהל
            document.getElementById('nav-admin').style.display = 'block';
        } else {
            roleBadge.innerText = 'חבר קהילה';
            roleBadge.className = 'badge badge-member';
            // הסתרת קישור מנהל
            document.getElementById('nav-admin').style.display = 'none';
            // הגנה - אם איכשהו משתמש רגיל נשאר בדף מנהל, נעביר אותו
            if (AppState.currentView === 'admin') {
                this.switchView('calendar');
                return;
            }
        }

        // ניווט אקטיבי בסרגל
        document.querySelectorAll('nav .nav-link').forEach(link => link.classList.remove('active'));
        const activeLink = document.getElementById(`nav-${AppState.currentView}`);
        if (activeLink) activeLink.classList.add('active');

        // הצגת המסך המתאים
        document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
        const activeView = document.getElementById(`view-${AppState.currentView}`);
        if (activeView) activeView.classList.add('active');

        // רינדור תוכן המסך הרלוונטי
        if (AppState.currentView === 'calendar') {
            this.renderCalendar();
        } else if (AppState.currentView === 'admin') {
            this.renderAdmin();
        } else if (AppState.currentView === 'settings') {
            this.renderSettings();
        }
    },

    switchView(viewName) {
        AppState.currentView = viewName;
        this.renderApp();
    },

    // --- לוח שנה / יומן הזמנות (Calendar Scheduler View) ---
    renderCalendar() {
        const todayStr = this.getTodayDateString();
        let displayStr = this.formatHebrewDate(AppState.selectedDate);
        if (AppState.selectedDate === todayStr) {
            displayStr += " (היום)";
        }
        
        document.getElementById('current-date-display').innerText = displayStr;
        document.getElementById('datepicker').value = AppState.selectedDate;

        const vehicles = DB.getVehicles();
        const bookings = DB.getBookingsByDate(AppState.selectedDate);
        const currentUser = DB.getCurrentUser();

        const container = document.getElementById('scheduler-rows-container');
        if (!container) return;

        if (vehicles.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                    לא נמצאו רכבים בצי. 
                    ${currentUser.role === 'admin' ? '<br><button class="btn btn-primary" style="margin-top: 15px;" onclick="App.switchView(\'admin\')">מעבר להוספת רכבים</button>' : 'אנא פנה למנהל המערכת להוספת רכבים.'}
                </div>
            `;
            this.renderDailyBookingsList();
            return;
        }

        // בניית השורות
        let rowsHtml = '';
        vehicles.forEach(car => {
            // האם למשתמש הנוכחי יש גישה לרכב זה?
            const hasAccess = currentUser.role === 'admin' || currentUser.permissions.includes(car.id);
            const accessClass = hasAccess ? '' : 'style="opacity: 0.55; position: relative;"';
            
            rowsHtml += `
                <div class="scheduler-row" ${accessClass}>
                    <!-- פרטי הרכב בצד -->
                    <div class="scheduler-car-info">
                        <div class="car-row-name">${car.name}</div>
                        <div class="car-row-plate">${car.licensePlate} | ${car.model}</div>
                        ${!hasAccess ? '<div style="font-size: 0.72rem; color: var(--danger); font-weight: 700; margin-top:4px;">🔒 אין הרשאת גישה</div>' : ''}
                    </div>

                    <!-- מסלול הזמן (Gantt timeline) -->
                    <div class="scheduler-timeline-track" id="track-${car.id}">
            `;

            // 1. ציור תאי הלחיצה הריקים להזמנה מהירה (רק אם יש גישה)
            for (let hour = 6; hour < 24; hour++) {
                const hourStr = String(hour).padStart(2, '0') + ':00';
                if (hasAccess) {
                    rowsHtml += `
                        <div class="timeline-click-cell" 
                             onclick="App.openBookingWithCell('${car.id}', '${hourStr}')" 
                             title="לחץ להזמנת רכב זה החל מ-${hourStr}">
                        </div>
                    `;
                } else {
                    rowsHtml += `<div class="timeline-click-cell" style="cursor: not-allowed;" title="אין לך הרשאה לרכב זה"></div>`;
                }
            }

            // 2. פילטר להזמנות של רכב זה ליום הנבחר ורינדור שלהן
            const carBookings = bookings.filter(b => b.vehicleId === car.id);
            carBookings.forEach(booking => {
                const pos = this.calculateTimelinePosition(booking.startTime, booking.endTime);
                
                // התאמת צבע לבלוק
                let blockClass = 'booking-other';
                if (booking.userId === currentUser.id) {
                    blockClass = 'booking-self';
                } else {
                    // אם המזמין הוא אדמין, נותן אינדיקציה
                    const bookingUser = DB.getUserById(booking.userId);
                    if (bookingUser && bookingUser.role === 'admin') {
                        blockClass = 'booking-admin-block';
                    }
                }

                // רינדור בלוק ההזמנה
                // self-note: absolute positioning is relative to .scheduler-timeline-track
                // in RTL we use `right` and `width`
                rowsHtml += `
                    <div class="booking-block ${blockClass}" 
                         style="right: ${pos.right}%; width: ${pos.width}%;"
                         onclick="App.openBookingDetails('${booking.id}', event)"
                         title="${booking.userName}: ${booking.startTime} - ${booking.endTime} (${booking.purpose})">
                        <span class="booking-block-title">${booking.userName}</span>
                        <span class="booking-block-time">${booking.startTime} - ${booking.endTime}</span>
                    </div>
                `;
            });

            rowsHtml += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = rowsHtml;
        this.renderDailyBookingsList();
    },

    // חישוב מיקום מבוסס אחוזים עבור לוח הזמנות ב-RTL (מ-06:00 עד 24:00)
    calculateTimelinePosition(startTime, endTime) {
        const toMinutes = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const startMin = toMinutes(startTime);
        const endMin = toMinutes(endTime);
        
        // גבולות יומן הזמנות: 06:00 עד 24:00 (בסך הכל 18 שעות = 1080 דקות)
        const timelineStart = 6 * 60; // 360 דקות
        const timelineDuration = 18 * 60; // 1080 דקות

        // הגבלה לגבולות הלוח
        let displayStart = Math.max(startMin, timelineStart);
        let displayEnd = Math.min(endMin, timelineStart + timelineDuration);

        // במקרה ששעות ההזמנה מחוץ לטווח הלוח
        if (displayStart >= displayEnd) {
            return { right: 0, width: 0 };
        }

        const rightPercent = ((displayStart - timelineStart) / timelineDuration) * 100;
        const widthPercent = ((displayEnd - displayStart) / timelineDuration) * 100;

        return {
            right: rightPercent,
            width: widthPercent
        };
    },

    // פתיחת מודל הזמנה בלחיצה על תא בלוח
    openBookingWithCell(carId, startTime) {
        // שעת הסיום ברירת המחדל היא שעה אחת קדימה
        const [h, m] = startTime.split(':').map(Number);
        const nextHour = String(h + 1).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        
        this.openBookingModal(carId, AppState.selectedDate, startTime, nextHour);
    },

    // שינוי תאריך (קודם / הבא)
    changeDate(offsetDays) {
        const d = new Date(AppState.selectedDate);
        d.setDate(d.getDate() + offsetDays);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        AppState.selectedDate = `${year}-${month}-${day}`;
        this.renderCalendar();
    },

    handleDateSelect(event) {
        AppState.selectedDate = event.target.value;
        this.renderCalendar();
    },

    // רשימת הזמנות יומית מתחת ללוח השנה
    renderDailyBookingsList() {
        const bookings = DB.getBookingsByDate(AppState.selectedDate);
        const container = document.getElementById('daily-bookings-list-container');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = `<div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">אין הזמנות רשומות ליום זה.</div>`;
            return;
        }

        // מיון הזמנות לפי שעת התחלה
        bookings.sort((a, b) => a.startTime.localeCompare(b.startTime));

        container.innerHTML = bookings.map(b => {
            const car = DB.getVehicleById(b.vehicleId);
            const carName = car ? `${car.name} (${car.licensePlate})` : 'רכב לא ידוע';
            
            return `
                <div class="booking-item-card" onclick="App.openBookingDetails('${b.id}')" style="cursor: pointer;">
                    <div class="booking-item-details">
                        <div class="booking-item-title">${carName}</div>
                        <div class="booking-item-meta">
                            <strong>${b.startTime} - ${b.endTime}</strong> | הוזמן על ידי: ${b.userName}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">🎯 מטרת נסיעה: ${b.purpose}</div>
                    </div>
                    <span style="color: var(--accent); font-weight: 700; font-size: 0.9rem;">פרטים 🔍</span>
                </div>
            `;
        }).join('');
    },

    // --- ממשק מנהל המערכת (Admin Control Panel) ---
    renderAdmin() {
        // מניעת כניסה למי שאינו מנהל
        const currentUser = DB.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            this.switchView('calendar');
            return;
        }

        // עדכון הלשונית האקטיבית (רכבים או הרשאות)
        document.querySelectorAll('.admin-menu-item').forEach(item => item.classList.remove('active'));
        document.getElementById(`admin-menu-${AppState.adminActiveTab}`).classList.add('active');

        document.querySelectorAll('.admin-tab-content').forEach(tab => tab.style.display = 'none');
        document.getElementById(`admin-tab-${AppState.adminActiveTab}`).style.display = 'block';

        if (AppState.adminActiveTab === 'cars') {
            this.renderAdminCars();
        } else if (AppState.adminActiveTab === 'permissions') {
            this.renderAdminPermissions();
        }
    },

    switchAdminTab(tabName) {
        AppState.adminActiveTab = tabName;
        this.renderAdmin();
    },

    // ניהול רכבים
    renderAdminCars() {
        const vehicles = DB.getVehicles();
        const container = document.getElementById('admin-vehicles-grid');
        if (!container) return;

        if (vehicles.length === 0) {
            container.innerHTML = `<div style="padding: 20px; color: var(--text-muted); text-align: center; grid-column: 1/-1;">אין רכבים פעילים בצי. לחץ על 'הוסף רכב חדש' למעלה.</div>`;
            return;
        }

        container.innerHTML = vehicles.map(v => {
            return `
                <div class="vehicle-card">
                    <div>
                        <div class="vehicle-card-header">
                            <span class="vehicle-card-name">${v.name}</span>
                        </div>
                        <div class="vehicle-card-plate">${v.licensePlate}</div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">דגם: ${v.model}</div>
                        <div class="vehicle-card-body">
                            ${v.notes ? v.notes : 'אין הערות מיוחדות לרכב זה.'}
                        </div>
                    </div>
                    <div class="vehicle-card-actions">
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="App.openEditVehicle('${v.id}')">✏️ עריכה</button>
                        <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="App.handleVehicleDelete('${v.id}')">🗑️ מחיקה</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ניהול הרשאות משתמשים
    renderAdminPermissions() {
        const users = DB.getUsers();
        const vehicles = DB.getVehicles();
        const currentUser = DB.getCurrentUser();
        const container = document.getElementById('admin-users-table-body');
        if (!container) return;

        container.innerHTML = users.map(u => {
            const letter = u.name.charAt(0);
            
            // יצירת רשימת הצ'קבוקסים עבור כל רכב בצי
            let checkBoxesHtml = '';
            vehicles.forEach(car => {
                // מנהלים מקבלים גישה מלאה תמיד (צ'קבוקס מסומן ומנוטרל)
                const isAdmin = u.role === 'admin';
                const hasAccess = isAdmin || (u.permissions && u.permissions.includes(car.id));
                const checkedAttr = hasAccess ? 'checked' : '';
                const disabledAttr = isAdmin ? 'disabled' : '';
                const activeTagClass = hasAccess ? 'checked' : '';
                
                checkBoxesHtml += `
                    <label class="vehicle-perm-tag ${activeTagClass}" title="${car.name}">
                        <input type="checkbox" 
                               value="${car.id}" 
                               ${checkedAttr} 
                               ${disabledAttr} 
                               onchange="App.handlePermissionToggle('${u.id}', '${car.id}', this.checked)">
                        <span>${car.name}</span>
                    </label>
                `;
            });

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar">${letter}</div>
                            <div>
                                <strong style="display: block;">${u.name}</strong>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">${u.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <select class="role-select" onchange="App.handleRoleChange('${u.id}', this.value)">
                            <option value="member" ${u.role === 'member' ? 'selected' : ''}>חבר (Member)</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>מנהל (Admin)</option>
                        </select>
                    </td>
                    <td>
                        <div class="permissions-list-cell">
                            ${checkBoxesHtml}
                        </div>
                    </td>
                    <td>
                        ${u.id !== currentUser.id ? `
                            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="App.handleUserDelete('${u.id}')" title="מחק משתמש">
                                🗑️ מחק
                            </button>
                        ` : '<span style="font-size: 0.82rem; color: var(--text-muted);">משתמש מחובר</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // שינוי הרשאת גישה של רכב בלחיצה (תג)
    handlePermissionToggle(userId, vehicleId, isChecked) {
        const user = DB.getUserById(userId);
        if (!user) return;

        let currentPerms = user.permissions ? [...user.permissions] : [];
        if (isChecked) {
            if (!currentPerms.includes(vehicleId)) {
                currentPerms.push(vehicleId);
            }
        } else {
            currentPerms = currentPerms.filter(id => id !== vehicleId);
        }

        DB.updateUserRoleAndPermissions(userId, user.role, currentPerms);
        this.showToast(`עודכנו הרשאות עבור ${user.name}`, 'success');
        this.renderAdminPermissions();
    },

    // שינוי תפקיד משתמש (חבר / מנהל)
    handleRoleChange(userId, newRole) {
        const user = DB.getUserById(userId);
        if (!user) return;

        // אם המשתמש משתנה למנהל, ניתן לו אוטומטית הרשאות לכל הרכבים
        let perms = user.permissions || [];
        if (newRole === 'admin') {
            perms = DB.getVehicles().map(v => v.id);
        }

        DB.updateUserRoleAndPermissions(userId, newRole, perms);
        this.showToast(`התפקיד של ${user.name} שונה ל-${newRole === 'admin' ? 'מנהל' : 'חבר'}`, 'success');
        
        // רענון המסך כולו (כי תפריטים עליונים עשויים להשתנות עבור המשתמש הנוכחי)
        this.renderApp();
    },

    // --- ממשק הגדרות (Settings View) ---
    renderSettings() {
        const clientId = DB.getGoogleClientId();
        document.getElementById('google-client-id-input').value = clientId;
    },

    saveGoogleSettings() {
        const input = document.getElementById('google-client-id-input').value.trim();
        if (!input) {
            this.showToast("נא להזין Google Client ID תקין", 'warning');
            return;
        }
        
        DB.setGoogleClientId(input);
        this.showToast("הגדרות Google Client ID נשמרו. המערכת תשתמש בהתחברות גוגל אמיתית בהפעלה הבאה.", 'success');
        
        // רענון האינטגרציה
        this.initGoogleSignIn();
    },

    clearGoogleSettings() {
        DB.setGoogleClientId('');
        document.getElementById('google-client-id-input').value = '';
        this.showToast("מפתח Google OAuth הוסר. הופעלה סימולציית Sandbox.", 'info');
        
        // רענון האינטגרציה
        this.initGoogleSignIn();
    },

    // --- לוגיקת מודלים (Modals Logic) ---
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    // מודל הזמנה
    openBookingModal(vehicleId = '', date = '', startTime = '09:00', endTime = '10:00') {
        const currentUser = DB.getCurrentUser();
        const vehicles = DB.getVehicles();

        // סינון רכבים: משתמש רגיל יכול להזמין רק רכבים שיש לו גישה אליהם
        const allowedVehicles = vehicles.filter(v => 
            currentUser.role === 'admin' || currentUser.permissions.includes(v.id)
        );

        const select = document.getElementById('booking-vehicle-select');
        if (allowedVehicles.length === 0) {
            this.showToast("אין לך הרשאה לאף רכב בצי. אנא פנה למנהל המערכת לקבלת גישה.", 'error');
            return;
        }

        // טעינת רכבים לבחירה
        select.innerHTML = allowedVehicles.map(v => `<option value="${v.id}">${v.name} (${v.licensePlate})</option>`).join('');

        if (vehicleId) {
            select.value = vehicleId;
        }

        // הגדרת תאריך ברירת מחדל
        document.getElementById('booking-date').value = date || AppState.selectedDate;
        
        // הגדרת שעות
        document.getElementById('booking-start-time').value = startTime;
        document.getElementById('booking-end-time').value = endTime;
        
        // ניקוי הערות
        document.getElementById('booking-purpose').value = '';

        this.openModal('booking-modal');
    },

    handleBookingSubmit(event) {
        event.preventDefault();

        const bookingData = {
            vehicleId: document.getElementById('booking-vehicle-select').value,
            date: document.getElementById('booking-date').value,
            startTime: document.getElementById('booking-start-time').value,
            endTime: document.getElementById('booking-end-time').value,
            purpose: document.getElementById('booking-purpose').value.trim()
        };

        try {
            DB.addBooking(bookingData);
            this.showToast("הזמנת הרכב נקלטה בהצלחה!", 'success');
            this.closeModal('booking-modal');
            
            // עדכון התאריך של הלוח לתאריך ההזמנה שבוצעה כדי שהמשתמש יראה אותה מיד
            AppState.selectedDate = bookingData.date;
            this.renderCalendar();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // מודל פרטי הזמנה
    openBookingDetails(bookingId, event) {
        if (event) {
            event.stopPropagation(); // מונע פתיחה של יצירת הזמנה חדשה ברקע השורה
        }

        const bookings = DB.getBookings();
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        AppState.activeBookingIdForDetail = bookingId;

        const car = DB.getVehicleById(booking.vehicleId);
        document.getElementById('detail-vehicle-name').innerText = car ? car.name : 'רכב לא ידוע';
        document.getElementById('detail-vehicle-plate').innerText = car ? car.licensePlate : '00-000-00';
        document.getElementById('detail-user-name').innerText = booking.userName;
        document.getElementById('detail-booking-date').innerText = this.formatHebrewDate(booking.date);
        document.getElementById('detail-start-time').innerText = booking.startTime;
        document.getElementById('detail-end-time').innerText = booking.endTime;
        document.getElementById('detail-purpose').innerText = booking.purpose || 'לא צוינה מטרה';

        // הרשאות כפתור ביטול: רק הבעלים של ההזמנה או אדמין
        const currentUser = DB.getCurrentUser();
        const btnCancel = document.getElementById('btn-cancel-booking');
        
        if (currentUser && (booking.userId === currentUser.id || currentUser.role === 'admin')) {
            btnCancel.style.display = 'block';
        } else {
            btnCancel.style.display = 'none';
        }

        this.openModal('booking-details-modal');
    },

    handleBookingCancel() {
        if (!AppState.activeBookingIdForDetail) return;

        if (confirm("האם אתה בטוח שברצונך לבטל הזמנה זו?")) {
            try {
                DB.deleteBooking(AppState.activeBookingIdForDetail);
                this.showToast("ההזמנה בוטלה בהצלחה", 'success');
                this.closeModal('booking-details-modal');
                this.renderCalendar();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        }
    },

    // מודל רכב (הוספה/עריכה)
    openVehicleModal() {
        document.getElementById('vehicle-modal-title').innerText = "הוספת רכב חדש לצי";
        document.getElementById('vehicle-id-input').value = '';
        document.getElementById('vehicle-name-input').value = '';
        document.getElementById('vehicle-model-input').value = '';
        document.getElementById('vehicle-plate-input').value = '';
        document.getElementById('vehicle-notes-input').value = '';
        
        this.openModal('vehicle-modal');
    },

    openEditVehicle(vehicleId) {
        const car = DB.getVehicleById(vehicleId);
        if (!car) return;

        document.getElementById('vehicle-modal-title').innerText = "עריכת פרטי רכב";
        document.getElementById('vehicle-id-input').value = car.id;
        document.getElementById('vehicle-name-input').value = car.name;
        document.getElementById('vehicle-model-input').value = car.model;
        document.getElementById('vehicle-plate-input').value = car.licensePlate;
        document.getElementById('vehicle-notes-input').value = car.notes || '';

        this.openModal('vehicle-modal');
    },

    handleVehicleSubmit(event) {
        event.preventDefault();

        const carData = {
            id: document.getElementById('vehicle-id-input').value,
            name: document.getElementById('vehicle-name-input').value.trim(),
            model: document.getElementById('vehicle-model-input').value.trim(),
            licensePlate: document.getElementById('vehicle-plate-input').value.trim(),
            notes: document.getElementById('vehicle-notes-input').value.trim()
        };

        DB.saveVehicle(carData);
        this.showToast(carData.id ? "פרטי הרכב עודכנו בהצלחה!" : "הרכב נוסף לצי בהצלחה!", 'success');
        this.closeModal('vehicle-modal');
        this.renderAdmin();
    },

    handleVehicleDelete(vehicleId) {
        const car = DB.getVehicleById(vehicleId);
        if (!car) return;

        if (confirm(`האם אתה בטוח שברצונך למחוק את הרכב "${car.name}" (${car.licensePlate})?\nכל ההזמנות המשוייכות אליו יימחקו לצמיתות!`)) {
            DB.deleteVehicle(vehicleId);
            this.showToast("הרכב נמחק מצי הרכבים", 'info');
            this.renderAdmin();
        }
    },

    // מודל משתמש (הוספה/מחיקה)
    openUserModal() {
        document.getElementById('user-name-input').value = '';
        document.getElementById('user-email-input').value = '';
        document.getElementById('user-role-select').value = 'member';
        
        this.openModal('user-modal');
    },

    handleUserSubmit(event) {
        event.preventDefault();

        const userData = {
            name: document.getElementById('user-name-input').value.trim(),
            email: document.getElementById('user-email-input').value.trim(),
            role: document.getElementById('user-role-select').value
        };

        try {
            DB.addUser(userData);
            this.showToast("המשתמש נוסף בהצלחה!", 'success');
            this.closeModal('user-modal');
            this.renderAdminPermissions();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    handleUserDelete(userId) {
        const user = DB.getUserById(userId);
        if (!user) return;

        if (confirm(`האם אתה בטוח שברצונך למחוק את המשתמש "${user.name}" (${user.email})?\nכל ההזמנות המשויכות אליו יימחקו לצמיתות!`)) {
            try {
                DB.deleteUser(userId);
                this.showToast("המשתמש נמחק מהמערכת", 'info');
                this.renderAdminPermissions();
            } catch (err) {
                this.showToast(err.message, 'error');
            }
        }
    },

    // --- מערכת התראות מודרנית (Toast Notifications) ---
    showToast(message, type = 'success') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';
        if (type === 'info') icon = 'ℹ️';

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${icon}</span>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        // הסרה אוטומטית לאחר 4 שניות
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-20px)';
                toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                setTimeout(() => toast.remove(), 400);
            }
        }, 4000);
    }
};

// הפעלת האפליקציה בטעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ייצוא למרחב הגלובלי לטובת קישור אירועים מה-HTML
window.App = App;
window.AppState = AppState;
