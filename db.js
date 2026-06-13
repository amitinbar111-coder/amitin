/**
 * db.js - שכבת הנתונים והרשאות ב-LocalStorage או ב-Supabase
 * תומך בשני מצבים: מצב מקומי (Sandbox) ומצב ייצור (Supabase)
 */

const STORAGE_KEYS = {
    VEHICLES: 'cs_vehicles',
    USERS: 'cs_users',
    BOOKINGS: 'cs_bookings',
    CURRENT_USER: 'cs_current_user',
    GOOGLE_CLIENT_ID: 'cs_google_client_id',
    SUPABASE_URL: 'cs_supabase_url',
    SUPABASE_KEY: 'cs_supabase_key'
};

// לקוח ה-Supabase הגלובלי
let supabaseClient = null;

function initSupabase() {
    const url = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const key = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY);
    
    if (url && key && typeof supabase !== 'undefined') {
        try {
            supabaseClient = supabase.createClient(url, key);
            window.supabaseClient = supabaseClient;
            console.log('Supabase client initialized successfully.');
        } catch (e) {
            console.error('Failed to initialize Supabase client:', e);
            supabaseClient = null;
            window.supabaseClient = null;
        }
    } else {
        supabaseClient = null;
        window.supabaseClient = null;
        console.log('Using local storage sandbox mode (Supabase credentials not configured).');
    }
}

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
        permissions: ['car-1', 'car-2', 'car-3']
    },
    {
        id: 'user-member1',
        email: 'rina.cohen@gmail.com',
        name: 'רינה כהן',
        picture: '',
        role: 'member',
        permissions: ['car-1', 'car-2', 'car-3']
    },
    {
        id: 'user-member2',
        email: 'moshe.levi@gmail.com',
        name: 'משה לוי',
        picture: '',
        role: 'member',
        permissions: ['car-2']
    },
    {
        id: 'user-guest',
        email: 'dana.a@gmail.com',
        name: 'דנה אברהם',
        picture: '',
        role: 'member',
        permissions: []
    }
];

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

// אתחול מסד הנתונים של LocalStorage
function initLocalStorageDatabase() {
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

// שכבת סנכרון מקומית (Sync API Fallback)
const DB_SyncFallback = {
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
        const vehicles = this.getVehicles().filter(v => v.id !== id);
        saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
        
        const bookings = this.getBookings().filter(b => b.vehicleId !== id);
        saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
        
        const users = this.getUsers();
        users.forEach(u => {
            if (u.permissions) {
                u.permissions = u.permissions.filter(pId => pId !== id);
            }
        });
        this.saveUsers(users);
    },

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

        const bookings = this.getBookings().filter(b => b.userId !== userId);
        saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
    },
    
    registerOrLoginUser(profile) {
        const users = this.getUsers();
        let user = users.find(u => u.email.toLowerCase() === profile.email.toLowerCase());
        
        if (!user) {
            user = {
                id: 'user-' + Date.now(),
                email: profile.email,
                name: profile.name,
                picture: profile.picture || '',
                role: 'member',
                permissions: []
            };
            users.push(user);
            saveToStorage(STORAGE_KEYS.USERS, users);
        } else {
            user.name = profile.name;
            if (profile.picture) user.picture = profile.picture;
            saveToStorage(STORAGE_KEYS.USERS, users);
        }
        
        this.setCurrentUser(user);
        return user;
    },

    getBookings() {
        return getFromStorage(STORAGE_KEYS.BOOKINGS, []);
    },

    getCurrentUser() {
        return getFromStorage(STORAGE_KEYS.CURRENT_USER, null);
    },

    setCurrentUser(user) {
        saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
    },

    logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
};

// הפעלת האתחול של LocalStorage
initLocalStorageDatabase();

// הגדרת מנהל ראשי מקומי למצב Sandbox
function initAdminFallback() {
    const primaryAdminEmail = 'amitinbar111@gmail.com';
    const users = DB_SyncFallback.getUsers();
    let primaryAdmin = users.find(u => u.email.toLowerCase() === primaryAdminEmail.toLowerCase());

    if (!primaryAdmin) {
        primaryAdmin = DB_SyncFallback.addUser({
            email: primaryAdminEmail,
            name: 'Amit Nabar',
            role: 'admin'
        });
    } else if (primaryAdmin.role !== 'admin') {
        DB_SyncFallback.updateUserRoleAndPermissions(primaryAdmin.id, 'admin', DB_SyncFallback.getVehicles().map(v => v.id));
    }

    users.forEach(u => {
        if (u.email.toLowerCase() !== primaryAdminEmail.toLowerCase() && u.role === 'admin') {
            DB_SyncFallback.updateUserRoleAndPermissions(u.id, 'member', []);
        }
    });
}
initAdminFallback();

// אתחול Supabase בעת טעינת הקובץ
initSupabase();

// ייצוא פונקציות מסד הנתונים האסינכרוניות (אחיד לשני המצבים)
const DB = {
    isSupabaseActive() {
        return !!supabaseClient;
    },

    // --- רכבים (Vehicles) ---
    async getVehicles() {
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('vehicles')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data.map(v => ({
                id: v.id,
                name: v.name,
                model: v.model,
                licensePlate: v.license_plate,
                notes: v.notes
            }));
        }
        return DB_SyncFallback.getVehicles();
    },
    
    async getVehicleById(id) {
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('vehicles')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return {
                id: data.id,
                name: data.name,
                model: data.model,
                licensePlate: data.license_plate,
                notes: data.notes
            };
        }
        return DB_SyncFallback.getVehicleById(id);
    },
    
    async saveVehicle(vehicle) {
        if (this.isSupabaseActive()) {
            const mapped = {
                name: vehicle.name,
                model: vehicle.model,
                license_plate: vehicle.licensePlate,
                notes: vehicle.notes
            };

            if (vehicle.id) {
                const { data, error } = await supabaseClient
                    .from('vehicles')
                    .update(mapped)
                    .eq('id', vehicle.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const newId = 'car-' + Date.now();
                const { data, error } = await supabaseClient
                    .from('vehicles')
                    .insert({ id: newId, ...mapped })
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        }
        return DB_SyncFallback.saveVehicle(vehicle);
    },
    
    async deleteVehicle(id) {
        if (this.isSupabaseActive()) {
            const { error } = await supabaseClient
                .from('vehicles')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return;
        }
        return DB_SyncFallback.deleteVehicle(id);
    },

    // --- משתמשים והרשאות (Users & Permissions) ---
    async getUsers() {
        if (this.isSupabaseActive()) {
            const { data: profiles, error: pError } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: true });
            if (pError) throw pError;

            const { data: invites, error: iError } = await supabaseClient
                .from('invited_users')
                .select('*')
                .order('created_at', { ascending: true });
            if (iError) throw iError;

            const list = [];
            profiles.forEach(u => {
                list.push({
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    picture: '',
                    role: u.role,
                    permissions: u.permissions || []
                });
            });
            invites.forEach(u => {
                list.push({
                    id: 'invite-' + u.email,
                    email: u.email,
                    name: u.name + ' (ממתין להרשמה)',
                    picture: '',
                    role: u.role,
                    permissions: u.permissions || []
                });
            });
            return list;
        }
        return DB_SyncFallback.getUsers();
    },
    
    async getUserById(id) {
        if (this.isSupabaseActive()) {
            if (id.startsWith('invite-')) {
                const email = id.replace('invite-', '');
                const { data, error } = await supabaseClient
                    .from('invited_users')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (error) throw error;
                if (!data) return null;
                return {
                    id: 'invite-' + data.email,
                    email: data.email,
                    name: data.name,
                    picture: '',
                    role: data.role,
                    permissions: data.permissions || []
                };
            }

            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return {
                id: data.id,
                email: data.email,
                name: data.name,
                picture: '',
                role: data.role,
                permissions: data.permissions || []
            };
        }
        return DB_SyncFallback.getUserById(id);
    },
    
    async getUserByEmail(email) {
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return {
                id: data.id,
                email: data.email,
                name: data.name,
                picture: '',
                role: data.role,
                permissions: data.permissions || []
            };
        }
        return DB_SyncFallback.getUserByEmail(email);
    },
    
    async updateUserRoleAndPermissions(userId, role, allowedVehicleIds) {
        if (this.isSupabaseActive()) {
            if (userId.startsWith('invite-')) {
                const email = userId.replace('invite-', '');
                const { data, error } = await supabaseClient
                    .from('invited_users')
                    .update({
                        role: role,
                        permissions: allowedVehicleIds
                    })
                    .eq('email', email)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }

            const { data, error } = await supabaseClient
                .from('profiles')
                .update({
                    role: role,
                    permissions: allowedVehicleIds
                })
                .eq('id', userId)
                .select()
                .single();
            if (error) throw error;
            
            // עדכון הסשן הפעיל במידת הצורך
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                currentUser.role = role;
                currentUser.permissions = allowedVehicleIds;
                this.setCurrentUser(currentUser);
            }
            return data;
        }
        return DB_SyncFallback.updateUserRoleAndPermissions(userId, role, allowedVehicleIds);
    },
    
    async addUser(userData) {
        if (this.isSupabaseActive()) {
            // Check if email already exists in profiles
            const { data: existingProfile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('email', userData.email)
                .maybeSingle();
                
            if (existingProfile) {
                throw new Error('משתמש עם דוא"ל זה כבר רשום במערכת');
            }

            // Check if email already exists in invited_users
            const { data: existingInvite } = await supabaseClient
                .from('invited_users')
                .select('email')
                .eq('email', userData.email)
                .maybeSingle();
                
            if (existingInvite) {
                throw new Error('הזמנה לדוא"ל זה כבר נשלחה וממתינה להתחברות');
            }

            // Insert into invited_users whitelisting table
            const { error: insertError } = await supabaseClient
                .from('invited_users')
                .insert({
                    email: userData.email.toLowerCase(),
                    name: userData.name,
                    role: userData.role,
                    permissions: []
                });
                
            if (insertError) throw insertError;

            // Trigger magic link email invitation
            const { error: authError } = await supabaseClient.auth.signInWithOtp({
                email: userData.email,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            });
            
            if (authError) {
                // Rollback invited_users insert if auth invite fails
                await supabaseClient.from('invited_users').delete().eq('email', userData.email);
                throw authError;
            }
            
            return { email: userData.email, name: userData.name };
        }
        return DB_SyncFallback.addUser(userData);
    },
    
    async deleteUser(userId) {
        if (this.isSupabaseActive()) {
            if (userId.startsWith('invite-')) {
                const email = userId.replace('invite-', '');
                const { error } = await supabaseClient
                    .from('invited_users')
                    .delete()
                    .eq('email', email);
                if (error) throw error;
                return;
            }

            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                throw new Error('אינך יכול למחוק את המשתמש של עצמך!');
            }
            // מחיקת הפרופיל. זה ימחק אוטומטית את ההזמנות של המשתמש בגלל CASCADE
            const { error } = await supabaseClient
                .from('profiles')
                .delete()
                .eq('id', userId);
            if (error) throw error;
            return;
        }
        return DB_SyncFallback.deleteUser(userId);
    },
    
    async registerOrLoginUser(profile) {
        if (this.isSupabaseActive()) {
            // המשתמש מנוהל על ידי מנגנון Supabase Auth.
            return;
        }
        return DB_SyncFallback.registerOrLoginUser(profile);
    },

    // --- הזמנות (Bookings) ---
    async getBookings() {
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select('*');
            if (error) throw error;
            return data.map(b => ({
                id: b.id,
                vehicleId: b.vehicle_id,
                userId: b.user_id,
                userName: b.user_name,
                date: b.date,
                startTime: b.start_time,
                endTime: b.end_time,
                purpose: b.purpose
            }));
        }
        return DB_SyncFallback.getBookings();
    },

    async getBookingsByDate(date) {
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select('*')
                .eq('date', date);
            if (error) throw error;
            return data.map(b => ({
                id: b.id,
                vehicleId: b.vehicle_id,
                userId: b.user_id,
                userName: b.user_name,
                date: b.date,
                startTime: b.start_time,
                endTime: b.end_time,
                purpose: b.purpose
            }));
        }
        return DB_SyncFallback.getBookingsByDate(date);
    },

    async checkBookingOverlap(vehicleId, date, startTime, endTime, excludeBookingId = null) {
        let bookings = [];
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select('*')
                .eq('vehicle_id', vehicleId)
                .eq('date', date);
            if (error) throw error;
            bookings = data.map(b => ({
                id: b.id,
                vehicleId: b.vehicle_id,
                userId: b.user_id,
                userName: b.user_name,
                date: b.date,
                startTime: b.start_time,
                endTime: b.end_time,
                purpose: b.purpose
            }));
        } else {
            bookings = DB_SyncFallback.getBookingsByDate(date).filter(b => b.vehicleId === vehicleId);
        }

        if (excludeBookingId) {
            bookings = bookings.filter(b => b.id !== excludeBookingId);
        }

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

            if (newStart < bEnd && newEnd > bStart) {
                return { 
                    overlap: true, 
                    message: `הרכב כבר מוזמן בשעות אלו על ידי ${b.userName} (${b.startTime} - ${b.endTime})` 
                };
            }
        }

        return { overlap: false };
    },

    async addBooking(bookingData) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('משתמש לא מחובר');

        const hasAccess = user.role === 'admin' || user.permissions.includes(bookingData.vehicleId);
        if (!hasAccess) {
            throw new Error('אין לך הרשאת גישה להזמנת רכב זה. אנא פנה למנהל המערכת.');
        }

        const overlapCheck = await this.checkBookingOverlap(
            bookingData.vehicleId, 
            bookingData.date, 
            bookingData.startTime, 
            bookingData.endTime
        );

        if (overlapCheck.overlap) {
            throw new Error(overlapCheck.message);
        }

        if (this.isSupabaseActive()) {
            const newId = 'b-' + Date.now();
            const { data, error } = await supabaseClient
                .from('bookings')
                .insert({
                    id: newId,
                    vehicle_id: bookingData.vehicleId,
                    user_id: user.id,
                    user_name: user.name,
                    date: bookingData.date,
                    start_time: bookingData.startTime,
                    end_time: bookingData.endTime,
                    purpose: bookingData.purpose || ''
                })
                .select()
                .single();
            if (error) throw error;
            return {
                id: data.id,
                vehicleId: data.vehicle_id,
                userId: data.user_id,
                userName: data.user_name,
                date: data.date,
                startTime: data.start_time,
                endTime: data.end_time,
                purpose: data.purpose
            };
        }

        return DB_SyncFallback.addBooking(bookingData);
    },

    async deleteBooking(id) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('משתמש לא מחובר');

        let booking = null;
        if (this.isSupabaseActive()) {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            if (!data) throw new Error('ההזמנה לא נמצאה');
            booking = {
                id: data.id,
                userId: data.user_id,
                userName: data.user_name
            };
        } else {
            booking = DB_SyncFallback.getBookings().find(b => b.id === id);
            if (!booking) throw new Error('ההזמנה לא נמצאה');
        }

        if (booking.userId !== user.id && user.role !== 'admin') {
            throw new Error('רק המשתמש שביצע את ההזמנה או מנהל המערכת יכולים לבטלה.');
        }

        if (this.isSupabaseActive()) {
            const { error } = await supabaseClient
                .from('bookings')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return;
        }

        return DB_SyncFallback.deleteBooking(id);
    },

    // --- הגדרות סשן והגדרות כלליות ---
    async getCurrentUser() {
        if (this.isSupabaseActive()) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return null;
            
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
                
            if (error || !profile) {
                // לפעמים יש עיכוב קטן ברישום הטריגר
                return {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'משתמש חדש',
                    role: 'member',
                    permissions: []
                };
            }
            
            return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                picture: session.user.user_metadata?.avatar_url || '',
                role: profile.role,
                permissions: profile.permissions || []
            };
        }
        return DB_SyncFallback.getCurrentUser();
    },

    setCurrentUser(user) {
        DB_SyncFallback.setCurrentUser(user);
    },

    async logout() {
        if (this.isSupabaseActive()) {
            await supabaseClient.auth.signOut();
        }
        DB_SyncFallback.logout();
    },

    getGoogleClientId() {
        return localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || '';
    },

    setGoogleClientId(clientId) {
        localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, clientId);
    },

    // הגדרות חיבור Supabase
    getSupabaseSettings() {
        return {
            url: localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '',
            key: localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || ''
        };
    },

    setSupabaseSettings(url, key) {
        localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
        localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key.trim());
        initSupabase();
    },

    clearSupabaseSettings() {
        localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
        localStorage.removeItem(STORAGE_KEYS.SUPABASE_KEY);
        initSupabase();
    }
};

// ייצוא גלובלי
window.DB = DB;
window.initSupabase = initSupabase;
