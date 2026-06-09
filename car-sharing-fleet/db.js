/**
 * db.js - שכבת הנתונים והרשאות ב-LocalStorage
 * מנהל את הרכבים, המשתמשים, ההזמנות והחיבור למערכת.
 */

const STORAGE_KEYS = {
    VEHICLES: 'cs_vehicles',
    USERS: 'cs_users',
    BOOKINGS: 'cs_bookings',
    CURRENT_USER: 'cs_current_user',
    GOOGLE_CLIENT_ID: 'cs_google_client_id'
};

// פונקציות עזר כלליות ל-LocalStorage
function getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// תאריך של היום בפורמט YYYY-MM-DD
function getTodayString(offsetDays = 0) {
    const d = new Date();
    if (offsetDays !== 0) {
        d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// נתוני בדיקה התחלתיים
const DEFAULT_VEHICLES = [
    {
        id: 'car-1',
        name: 'יונדאי איוניק 5',
        model: '2023 חשמלי',
        licensePlate: '12-345-67',
        notes: 'רכב חשמלי מלא. נא להחזיר תמיד לעמדת הטענה ולחבר לחשמל בסיום הנסיעה!'
    },
    {
        id: 'car-2',
        name: 'טויוטה יאריס היברידית',
        model: '2022 היברידי',
        licensePlate: '98-765-43',
        notes: 'רכב סופר-מיני חסכוני ונוח במיוחד לנסיעות עירוניות וחניות צפופות.'
    },
    {
        id: 'car-3',
        name: 'סובארו פורסטר',
        model: '2021 בנזין 4x4',
        licensePlate: '55-666-77',
        notes: 'רכב פנאי-שטח מרווח. מעולה לנסיעות ארוכות וטיולים משפחתיים.'
    }
];

const DEFAULT_USERS = [
    {
        id: 'user-admin',
        email: 'israel.israeli@gmail.com',
        name: 'ישראל ישראלי',
        picture: '',
        role: 'admin',
        permissions: ['car-1', 'car-2', 'car-3'] // למנהל יש גישה להכל בכל מקרה
    },
    {
        id: 'user-member1',
        email: 'rina.cohen@gmail.com',
        name: 'רינה כהן',
        picture: '',
        role: 'member',
        permissions: ['car-1', 'car-2', 'car-3'] // גישה לכל הרכבים
    },
    {
        id: 'user-member2',
        email: 'moshe.levi@gmail.com',
        name: 'משה לוי',
        picture: '',
        role: 'member',
        permissions: ['car-2'] // גישה רק לטויוטה יאריס
    },
    {
        id: 'user-guest',
        email: 'dana.a@gmail.com',
        name: 'דנה אברהם',
        picture: '',
        role: 'member',
        permissions: [] // ממתינה לאישור רכבים
    }
];

// הזמנות בדיקה שיווצרו באופן דינמי לפי התאריך הנוכחי
function getDefaultBookings() {
    const today = getTodayString(0);
    const tomorrow = getTodayString(1);
    
    return [
        {
            id: 'b-1',
            vehicleId: 'car-1',
            userId: 'user-member1',
            userName: 'רינה כהן',
            date: today,
            startTime: '09:00',
            endTime: '12:00',
            purpose: 'נסיעה לפגישת עבודה בתל אביב'
        },
        {
            id: 'b-2',
            vehicleId: 'car-2',
            userId: 'user-member2',
            userName: 'משה לוי',
            date: today,
            startTime: '14:00',
            endTime: '17:00',
            purpose: 'קניות שבועיות לקהילה'
        },
        {
            id: 'b-3',
            vehicleId: 'car-3',
            userId: 'user-admin',
            userName: 'ישראל ישראלי',
            date: today,
            startTime: '18:00',
            endTime: '22:00',
            purpose: 'איסוף ציוד לאירוע ערב'
        },
        {
            id: 'b-4',
            vehicleId: 'car-1',
            userId: 'user-admin',
            userName: 'ישראל ישראלי',
            date: tomorrow,
            startTime: '08:00',
            endTime: '11:00',
            purpose: 'נסיעה לטיפול תקופתי במוסך'
        }
    ];
}

// אתחול מסד הנתונים
function initDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
        saveToStorage(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        saveToStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        saveToStorage(STORAGE_KEYS.BOOKINGS, getDefaultBookings());
    }
}

// הפעלת האתחול מיד
initDatabase();

// Ensure the primary admin exists (email: amitinbar111@gmail.com) and demote any other admins
(function() {
    const primaryAdminEmail = 'amitinbar111@gmail.com';
    const users = DB.getUsers();

    // Find if primary admin exists
    let primaryAdmin = users.find(u => u.email.toLowerCase() === primaryAdminEmail.toLowerCase());

    if (!primaryAdmin) {
        // Create primary admin
        primaryAdmin = DB.addUser({
            email: primaryAdminEmail,
            name: 'Amit Nabar',
            role: 'admin'
        });
        console.log('Created primary admin user', primaryAdminEmail);
    } else if (primaryAdmin.role !== 'admin') {
        // Promote to admin if needed
        DB.updateUserRoleAndPermissions(primaryAdmin.id, 'admin', DB.getVehicles().map(v => v.id));
    }

    // Demote any other admin users to member (remove their admin rights)
    users.forEach(u => {
        if (u.email.toLowerCase() !== primaryAdminEmail.toLowerCase() && u.role === 'admin') {
            DB.updateUserRoleAndPermissions(u.id, 'member', []);
        }
    });
})();

// ייצוא פונקציות מסד הנתונים
const DB = {
    // --- רכבים (Vehicles) ---
    getVehicles() {
        return getFromStorage(STORAGE_KEYS.VEHICLES, []);
    },
    
    getVehicleById(id) {
        return this.getVehicles().find(v => v.id === id);
    },
    
    saveVehicle(vehicle) {
        const vehicles = this.getVehicles();
        if (vehicle.id) {
            const index = vehicles.findIndex(v => v.id === vehicle.id);
            if (index !== -1) {
                vehicles[index] = vehicle;
            }
        } else {
            vehicle.id = 'car-' + Date.now();
            vehicles.push(vehicle);
            
            // באופן אוטומטי, כשנוסף רכב חדש, ניתן למנהלים הרשאה אליו
            const users = this.getUsers();
            users.forEach(u => {
                if (u.role === 'admin') {
                    if (!u.permissions) u.permissions = [];
                    u.permissions.push(vehicle.id);
                }
            });
            this.saveUsers(users);
        }
        saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
        return vehicle;
    },
    
    deleteVehicle(id) {
        // מחיקת הרכב
        const vehicles = this.getVehicles().filter(v => v.id !== id);
        saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
        
        // מחיקת הזמנות עתידיות שקשורות לרכב זה
        const bookings = this.getBookings().filter(b => b.vehicleId !== id);
        saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
        
        // מחיקת הרשאה לרכב זה אצל כל המשתמשים
        const users = this.getUsers();
        users.forEach(u => {
            if (u.permissions) {
                u.permissions = u.permissions.filter(pId => pId !== id);
            }
        });
        this.saveUsers(users);
    },

    // --- משתמשים והרשאות (Users & Permissions) ---
    getUsers() {
        return getFromStorage(STORAGE_KEYS.USERS, []);
    },
    
    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },

    getUserByEmail(email) {
        return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    },
    
    saveUsers(usersList) {
        saveToStorage(STORAGE_KEYS.USERS, usersList);
    },

    updateUserRoleAndPermissions(userId, role, allowedVehicleIds) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].role = role;
            users[index].permissions = allowedVehicleIds;
            saveToStorage(STORAGE_KEYS.USERS, users);
            
            // אם זה המשתמש המחובר כעת, נעדכן גם את הסשן שלו
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                currentUser.role = role;
                currentUser.permissions = allowedVehicleIds;
                this.setCurrentUser(currentUser);
            }
            return users[index];
        }
        return null;
    },

    addUser(userData) {
        const users = this.getUsers();
        if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
            throw new Error('משתמש עם דוא"ל זה כבר קיים במערכת');
        }
        const newUser = {
            id: 'user-' + Date.now(),
            email: userData.email.trim(),
            name: userData.name.trim(),
            picture: '',
            role: userData.role || 'member',
            permissions: userData.role === 'admin' ? this.getVehicles().map(v => v.id) : []
        };
        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    },

    deleteUser(userId) {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            throw new Error('אינך יכול למחוק את המשתמש של עצמך!');
        }
        const users = this.getUsers().filter(u => u.id !== userId);
        this.saveUsers(users);

        // מחיקת ההזמנות של המשתמש שנמחק
        const bookings = this.getBookings().filter(b => b.userId !== userId);
        saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
    },
    
    // יצירה או עדכון משתמש בעת כניסה (גוגל או סימולציה)
    registerOrLoginUser(profile) {
        const users = this.getUsers();
        let user = users.find(u => u.email.toLowerCase() === profile.email.toLowerCase());
        
        if (!user) {
            // משתמש חדש לחלוטין - ברירת מחדל תהיה חבר (Member) ללא הרשאות לרכבים עד שמנהל מאשר
            user = {
                id: 'user-' + Date.now(),
                email: profile.email,
                name: profile.name,
                picture: profile.picture || '',
                role: 'member',
                permissions: [] // ריק בהתחלה
            };
            users.push(user);
            saveToStorage(STORAGE_KEYS.USERS, users);
        } else {
            // עדכון פרטים בסיסיים אם השתנו (כמו שם או תמונה)
            user.name = profile.name;
            if (profile.picture) user.picture = profile.picture;
            saveToStorage(STORAGE_KEYS.USERS, users);
        }
        
        this.setCurrentUser(user);
        return user;
    },

    // --- הזמנות (Bookings) ---
    getBookings() {
        return getFromStorage(STORAGE_KEYS.BOOKINGS, []);
    },

    getBookingsByDate(date) {
        return this.getBookings().filter(b => b.date === date);
    },

    // מניעת כפילויות/התנגשויות בשעות
    checkBookingOverlap(vehicleId, date, startTime, endTime, excludeBookingId = null) {
        const bookings = this.getBookings().filter(b => 
            b.vehicleId === vehicleId && 
            b.date === date && 
            b.id !== excludeBookingId
        );

        // המרת שעה (HH:MM) לדקות מתחילת היום לטובת השוואה מתמטית פשוטה
        const toMinutes = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const newStart = toMinutes(startTime);
        const newEnd = toMinutes(endTime);

        if (newStart >= newEnd) {
            return { overlap: true, message: 'שעת הסיום חייבת להיות אחרי שעת ההתחלה' };
        }

        for (const b of bookings) {
            const bStart = toMinutes(b.startTime);
            const bEnd = toMinutes(b.endTime);

            // בדיקת חפיפה: [newStart, newEnd] חופף ל-[bStart, bEnd]
            // חפיפה מתקיימת אם התחלה חדשה קטנה מסיום קיים, וסיום חדש גדול מהתחלה קיימת
            if (newStart < bEnd && newEnd > bStart) {
                return { 
                    overlap: true, 
                    message: `הרכב כבר מוזמן בשעות אלו על ידי ${b.userName} (${b.startTime} - ${b.endTime})` 
                };
            }
        }

        return { overlap: false };
    },

    addBooking(bookingData) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('משתמש לא מחובר');

        // אימות הרשאות גישה לרכב
        const hasAccess = user.role === 'admin' || user.permissions.includes(bookingData.vehicleId);
        if (!hasAccess) {
            throw new Error('אין לך הרשאת גישה להזמנת רכב זה. אנא פנה למנהל המערכת.');
        }

        // בדיקת חפיפת זמנים
        const overlapCheck = this.checkBookingOverlap(
            bookingData.vehicleId, 
            bookingData.date, 
            bookingData.startTime, 
            bookingData.endTime
        );

        if (overlapCheck.overlap) {
            throw new Error(overlapCheck.message);
        }

        const bookings = this.getBookings();
        const newBooking = {
            id: 'b-' + Date.now(),
            vehicleId: bookingData.vehicleId,
            userId: user.id,
            userName: user.name,
            date: bookingData.date,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            purpose: bookingData.purpose || ''
        };

        bookings.push(newBooking);
        saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
        return newBooking;
    },

    deleteBooking(id) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('משתמש לא מחובר');

        const bookings = this.getBookings();
        const booking = bookings.find(b => b.id === id);
        
        if (!booking) throw new Error('ההזמנה לא נמצאה');

        // רק המשתמש שהזמין או מנהל יכולים לבטל הזמנה
        if (booking.userId !== user.id && user.role !== 'admin') {
            throw new Error('רק המשתמש שביצע את ההזמנה או מנהל המערכת יכולים לבטלה.');
        }

        const updatedBookings = bookings.filter(b => b.id !== id);
        saveToStorage(STORAGE_KEYS.BOOKINGS, updatedBookings);
    },

    // --- הגדרות סשן והגדרות כלליות ---
    getCurrentUser() {
        return getFromStorage(STORAGE_KEYS.CURRENT_USER, null);
    },

    setCurrentUser(user) {
        saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
    },

    logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    },

    getGoogleClientId() {
        return localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || '';
    },

    setGoogleClientId(clientId) {
        localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, clientId);
    }
};

// ייצוא גלובלי לצורך שימוש ב-app.js
window.DB = DB;
