// Application state
let currentUser = null;
let currentPage = 'dashboardPage';
let map = null;
let evangelizationChart = null;
let groupStatsChart = null;
let siteSettings = {
    name: "CECNE",
    slogan: "Centre d'Évangélisation et Gestion des Âmes",
    logo: null
};

// Coordonnées de l'église CECNE (4°23'57.86"S, 15°22'15.91"E)
const CHURCH_COORDINATES = [-4.399406, 15.371086];

// Initialize Firebase App
async function initializeFirebaseApp() {
    try {
        console.log('Initializing Firebase app...');
        
        // Initialize default data if needed
        await initializeDefaultData();
        
        // Load site settings
        await loadSiteSettings();
        
        // Show login screen
        showLoginScreen();
        
        // Initialize icons
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error initializing Firebase app:', error);
        showNotification('Erreur lors de l\'initialisation de l\'application', 'error');
    }
}

// Initialize default data
async function initializeDefaultData() {
    const { db, collection, getDocs, setDoc, doc } = window.firebase;
    
    try {
        // Check if default data exists
        const groupsSnapshot = await getDocs(collection(db, 'groups'));
        const evangelistsSnapshot = await getDocs(collection(db, 'evangelists'));
        
        if (groupsSnapshot.empty) {
            // Create default groups
            const defaultGroups = [
                { id: 'centre-ville', name: "Centre-ville", createdBy: 'admin', status: "active", createdAt: new Date() },
                { id: 'quartier-nord', name: "Quartier Nord", createdBy: 'admin', status: "active", createdAt: new Date() },
                { id: 'quartier-sud', name: "Quartier Sud", createdBy: 'admin', status: "active", createdAt: new Date() }
            ];
            
            for (const group of defaultGroups) {
                await setDoc(doc(db, 'groups', group.id), group);
            }
            console.log('Default groups created');
        }
        
        if (evangelistsSnapshot.empty) {
            // Create default admin user
            const defaultAdmin = {
                id: 'admin',
                fullName: "Administrateur CECNE",
                phone: "+243 99 988 77 66",
                address: "Centre-ville Q7",
                group: "Centre-ville",
                role: "Coordonnateur",
                baptismDate: "2015-05-15",
                username: "admin",
                password: "admin123", // In production, this should be hashed
                permissions: "full",
                status: "active",
                soulsWon: 0,
                lat: CHURCH_COORDINATES[0],
                lng: CHURCH_COORDINATES[1],
                picture: null,
                createdAt: new Date()
            };
            
            await setDoc(doc(db, 'evangelists', 'admin'), defaultAdmin);
            console.log('Default admin user created');
        }
        
    } catch (error) {
        console.error('Error initializing default data:', error);
    }
}

// Load site settings
async function loadSiteSettings() {
    const { db, doc, getDoc } = window.firebase;
    
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
        if (settingsDoc.exists()) {
            siteSettings = { ...siteSettings, ...settingsDoc.data() };
        }
        updateSiteBranding();
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Save site settings
async function saveSiteSettings() {
    const { db, doc, setDoc } = window.firebase;
    
    try {
        await setDoc(doc(db, 'settings', 'site'), siteSettings);
        console.log('Site settings saved');
    } catch (error) {
        console.error('Error saving site settings:', error);
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

// Authentication functions
async function loginUser(username, password) {
    const { db, collection, query, where, getDocs } = window.firebase;
    
    try {
        // Query for user by username
        const q = query(
            collection(db, 'evangelists'), 
            where('username', '==', username),
            where('status', '==', 'active')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('Utilisateur non trouvé');
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Check password (in production, use proper password hashing)
        if (userData.password !== password) {
            throw new Error('Mot de passe incorrect');
        }
        
        // Set current user
        currentUser = { id: userDoc.id, ...userData };
        
        // Show main app
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Initialize app
        await initializeMainApp();
        
        return currentUser;
        
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Initialize main application
async function initializeMainApp() {
    try {
        // Update user display
        document.getElementById('userName').textContent = currentUser.fullName;
        document.getElementById('userRole').textContent = currentUser.role;
        document.getElementById('headerSubtitle').textContent = currentUser.group;
        
        updateUserProfileDisplay();
        
        // Load app data
        await Promise.all([
            loadDashboardData(),
            loadGroupSelects(),
            updatePermissions()
        ]);
        
        // Show dashboard
        showPage('dashboardPage');
        
        // Initialize map after a delay
        setTimeout(() => {
            if (document.getElementById('map')) {
                initMap();
            }
        }, 1000);
        
        showNotification('Connexion réussie !', 'success');
        
    } catch (error) {
        console.error('Error initializing main app:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            updateStats(),
            loadRecentSouls(),
            loadRecentReports(),
            loadAnnouncements()
        ]);
        
        if (isCoordonnateur()) {
            document.getElementById('announcementsSection').classList.remove('hidden');
            document.getElementById('statisticsChartSection').classList.remove('hidden');
            setTimeout(() => {
                initializeCharts();
            }, 500);
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Get data functions
async function getVisibleSouls() {
    const { db, collection, query, where, getDocs } = window.firebase;
    
    try {
        let q;
        if (canSeeAllData()) {
            q = query(collection(db, 'souls'), where('status', '==', 'active'));
        } else {
            q = query(
                collection(db, 'souls'), 
                where('status', '==', 'active'),
                where('group', '==', currentUser.group)
            );
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
    } catch (error) {
        console.error('Error getting souls:', error);
        return [];
    }
}

async function getVisibleEvangelists() {
    const { db, collection, query, where, getDocs } = window.firebase;
    
    try {
        let q;
        if (canSeeAllData()) {
            q = collection(db, 'evangelists');
        } else {
            q = query(
                collection(db, 'evangelists'),
                where('group', '==', currentUser.group)
            );
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(e => e.status === 'active' || e.status === 'blocked');
        
    } catch (error) {
        console.error('Error getting evangelists:', error);
        return [];
    }
}

async function getVisibleReports() {
    const { db, collection, query, where, getDocs } = window.firebase;
    
    try {
        let reports = [];
        
        if (canSeeAllData()) {
            const q = query(collection(db, 'reports'), where('status', '==', 'active'));
            const querySnapshot = await getDocs(q);
            reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Get reports from evangelists in the same group
            const evangelists = await getVisibleEvangelists();
            const evangelistIds = evangelists.map(e => e.id);
            
            if (evangelistIds.length > 0) {
                // Firebase doesn't support 'in' queries with more than 10 items, so we'll batch them
                const batches = [];
                for (let i = 0; i < evangelistIds.length; i += 10) {
                    const batch = evangelistIds.slice(i, i + 10);
                    const q = query(
                        collection(db, 'reports'),
                        where('evangelistId', 'in', batch),
                        where('status', '==', 'active')
                    );
                    batches.push(getDocs(q));
                }
                
                const batchResults = await Promise.all(batches);
                reports = batchResults.flatMap(snapshot => 
                    snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                );
            }
        }
        
        return reports;
        
    } catch (error) {
        console.error('Error getting reports:', error);
        return [];
    }
}

async function getActiveGroups() {
    const { db, collection, query, where, getDocs } = window.firebase;
    
    try {
        const q = query(collection(db, 'groups'), where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting groups:', error);
        return [];
    }
}

// Add soul function
async function addSoul(soulData) {
    const { db, collection, doc, setDoc, updateDoc } = window.firebase;
    
    try {
        // Create soul document
        const soulRef = doc(collection(db, 'souls'));
        const newSoul = {
            ...soulData,
            id: soulRef.id,
            evangelistId: currentUser.id,
            dateAdded: new Date(),
            status: 'active',
            lat: CHURCH_COORDINATES[0] + (Math.random() - 0.5) * 0.02,
            lng: CHURCH_COORDINATES[1] + (Math.random() - 0.5) * 0.02
        };
        
        await setDoc(soulRef, newSoul);
        
        // Update evangelist's souls count
        const evangelistRef = doc(db, 'evangelists', currentUser.id);
        await updateDoc(evangelistRef, {
            soulsWon: (currentUser.soulsWon || 0) + 1
        });
        
        currentUser.soulsWon = (currentUser.soulsWon || 0) + 1;
        
        return { id: soulRef.id, ...newSoul };
        
    } catch (error) {
        console.error('Error adding soul:', error);
        throw error;
    }
}

// Add evangelist function
async function addEvangelist(evangelistData) {
    const { db, collection, doc, setDoc } = window.firebase;
    
    try {
        const evangelistRef = doc(collection(db, 'evangelists'));
        const newEvangelist = {
            ...evangelistData,
            id: evangelistRef.id,
            permissions: evangelistData.role === 'Évangéliste' ? 'limited' : 'full',
            status: 'active',
            soulsWon: 0,
            lat: CHURCH_COORDINATES[0] + (Math.random() - 0.5) * 0.02,
            lng: CHURCH_COORDINATES[1] + (Math.random() - 0.5) * 0.02,
            picture: null,
            createdAt: new Date()
        };
        
        await setDoc(evangelistRef, newEvangelist);
        
        return { id: evangelistRef.id, ...newEvangelist };
        
    } catch (error) {
        console.error('Error adding evangelist:', error);
        throw error;
    }
}

// Add report function
async function addReport(reportData) {
    const { db, collection, doc, setDoc } = window.firebase;
    
    try {
        const reportRef = doc(collection(db, 'reports'));
        const newReport = {
            ...reportData,
            id: reportRef.id,
            evangelistId: currentUser.id,
            dateCreated: new Date(),
            status: 'active'
        };
        
        await setDoc(reportRef, newReport);
        
        return { id: reportRef.id, ...newReport };
        
    } catch (error) {
        console.error('Error adding report:', error);
        throw error;
    }
}

// Update functions
async function updateSoul(soulId, soulData) {
    const { db, doc, updateDoc } = window.firebase;
    
    try {
        const soulRef = doc(db, 'souls', soulId);
        await updateDoc(soulRef, soulData);
    } catch (error) {
        console.error('Error updating soul:', error);
        throw error;
    }
}

async function updateEvangelist(evangelistId, evangelistData) {
    const { db, doc, updateDoc } = window.firebase;
    
    try {
        const evangelistRef = doc(db, 'evangelists', evangelistId);
        await updateDoc(evangelistRef, evangelistData);
    } catch (error) {
        console.error('Error updating evangelist:', error);
        throw error;
    }
}

// Delete functions (soft delete)
async function deleteSoul(soulId) {
    const { db, doc, updateDoc } = window.firebase;
    
    try {
        const soulRef = doc(db, 'souls', soulId);
        await updateDoc(soulRef, { status: 'deleted' });
    } catch (error) {
        console.error('Error deleting soul:', error);
        throw error;
    }
}

async function deleteEvangelist(evangelistId) {
    const { db, doc, updateDoc } = window.firebase;
    
    try {
        const evangelistRef = doc(db, 'evangelists', evangelistId);
        await updateDoc(evangelistRef, { status: 'deleted' });
    } catch (error) {
        console.error('Error deleting evangelist:', error);
        throw error;
    }
}

// Upload image function
async function uploadImage(file, path) {
    const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
    
    try {
        const imageRef = ref(storage, path);
        const snapshot = await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Permission helpers
function canManageEvangelists() {
    return currentUser && (currentUser.role === 'Coordonnateur' || currentUser.role === 'Adjoint');
}

function canSeeAllData() {
    return currentUser && (currentUser.role === 'Coordonnateur' || currentUser.role === 'Adjoint');
}

function isCoordonnateur() {
    return currentUser && currentUser.role === 'Coordonnateur';
}

// UI update functions
async function updateStats() {
    try {
        const [souls, evangelists, reports] = await Promise.all([
            getVisibleSouls(),
            getVisibleEvangelists(),
            getVisibleReports()
        ]);
        
        document.getElementById('totalSouls').textContent = souls.length;
        document.getElementById('totalEvangelists').textContent = evangelists.filter(e => e.status === 'active').length;
        document.getElementById('totalReports').textContent = reports.length;
        
        // Calculate weekly stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklySouls = souls.filter(soul => {
            const soulDate = soul.dateAdded.toDate ? soul.dateAdded.toDate() : new Date(soul.dateAdded);
            return soulDate >= oneWeekAgo;
        }).length;
        
        document.getElementById('weeklyStats').textContent = weeklySouls;
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function loadRecentSouls() {
    try {
        const souls = await getVisibleSouls();
        const recentSouls = souls
            .sort((a, b) => {
                const dateA = a.dateAdded.toDate ? a.dateAdded.toDate() : new Date(a.dateAdded);
                const dateB = b.dateAdded.toDate ? b.dateAdded.toDate() : new Date(b.dateAdded);
                return dateB - dateA;
            })
            .slice(0, 5);
        
        const container = document.getElementById('recentSoulsList');
        container.innerHTML = recentSouls.map(soul => {
            const evangelists = []; // Load evangelists if needed
            const date = soul.dateAdded.toDate ? soul.dateAdded.toDate() : new Date(soul.dateAdded);
            
            return `
                <div class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer" onclick="viewSoulDetails('${soul.id}')">
                    <div class="w-10 h-10 gradient-bg rounded-full flex items-center justify-center">
                        ${soul.picture ?
                            `<img src="${soul.picture}" alt="${soul.fullName}" class="w-10 h-10 rounded-full object-cover">` :
                            `<span class="text-white text-sm font-semibold">${getInitials(soul.fullName)}</span>`
                        }
                    </div>
                    <div class="ml-3 flex-1 min-w-0">
                        <p class="font-medium text-gray-900 dark:text-white truncate">${soul.fullName}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${soul.group} • ${date.toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div class="ml-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Nouvelle
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error loading recent souls:', error);
    }
}

async function loadRecentReports() {
    try {
        const reports = await getVisibleReports();
        const recentReports = reports
            .sort((a, b) => {
                const dateA = a.dateCreated.toDate ? a.dateCreated.toDate() : new Date(a.dateCreated);
                const dateB = b.dateCreated.toDate ? b.dateCreated.toDate() : new Date(b.dateCreated);
                return dateB - dateA;
            })
            .slice(0, 5);
        
        const evangelists = await getVisibleEvangelists();
        
        const container = document.getElementById('recentReportsList');
        container.innerHTML = recentReports.map(report => {
            const evangelist = evangelists.find(e => e.id === report.evangelistId);
            const reportDate = report.reportDate instanceof Date ? report.reportDate : new Date(report.reportDate);
            
            return `
                <div class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer" onclick="viewReportDetails('${report.id}')">
                    <div class="w-10 h-10 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                        <i data-lucide="file-text" class="w-5 h-5 text-pink-600 dark:text-pink-400"></i>
                    </div>
                    <div class="ml-3 flex-1 min-w-0">
                        <p class="font-medium text-gray-900 dark:text-white truncate">${report.location}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${evangelist ? evangelist.fullName : 'Inconnu'} • ${reportDate.toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div class="ml-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            ${report.soulsMetData.length} âme${report.soulsMetData.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error loading recent reports:', error);
    }
}

async function loadAnnouncements() {
    // Placeholder for announcements functionality
    // This would be implemented similar to other data loading functions
}

async function loadGroupSelects() {
    try {
        const groups = await getActiveGroups();
        const selects = ['soulGroupSelect', 'evangelistGroupSelect', 'filterGroup', 'filterReportGroup'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const isFilter = selectId.includes('filter');
                let options = isFilter ? '<option value="">Tous les groupes</option>' : '<option value="">Sélectionner un groupe</option>';
                
                groups.forEach(group => {
                    options += `<option value="${group.name}">${group.name}</option>`;
                });
                
                if (!isFilter) {
                    options += '<option value="autre">Autre (nouveau groupe)</option>';
                }
                
                select.innerHTML = options;
            }
        });
        
    } catch (error) {
        console.error('Error loading group selects:', error);
    }
}

function updatePermissions() {
    const addEvangelistBtn = document.getElementById('addEvangelistBtn');
    const manageGroupsBtn = document.getElementById('manageGroupsBtn');
    const siteSettingsBtn = document.getElementById('siteSettingsBtn');
    const addDocumentBtn = document.getElementById('addDocumentBtn');
    
    if (!canManageEvangelists()) {
        if (addEvangelistBtn) addEvangelistBtn.style.display = 'none';
        if (addDocumentBtn) addDocumentBtn.style.display = 'none';
    } else {
        if (addEvangelistBtn) addEvangelistBtn.style.display = 'flex';
        if (addDocumentBtn) addDocumentBtn.style.display = 'flex';
    }
    
    if (!isCoordonnateur()) {
        if (manageGroupsBtn) manageGroupsBtn.style.display = 'none';
        if (siteSettingsBtn) siteSettingsBtn.style.display = 'none';
    } else {
        if (manageGroupsBtn) manageGroupsBtn.style.display = 'flex';
        if (siteSettingsBtn) siteSettingsBtn.style.display = 'block';
    }
}

// Utility functions
function getInitials(fullName) {
    if (!fullName) return '?';
    const names = fullName.trim().split(' ');
    return names.map(name => name.charAt(0).toUpperCase()).slice(0, 2).join('');
}

function updateUserProfileDisplay() {
    if (!currentUser) return;
    
    const initials = getInitials(currentUser.fullName);
    
    // Update header profile
    const headerPicture = document.getElementById('userProfilePicture');
    const headerInitials = document.getElementById('userInitials');
    
    if (currentUser.picture) {
        headerPicture.src = currentUser.picture;
        headerPicture.style.display = 'block';
        headerInitials.style.display = 'none';
    } else {
        headerPicture.style.display = 'none';
        headerInitials.style.display = 'flex';
        headerInitials.querySelector('span').textContent = initials;
    }
    
    // Update profile page
    const profilePicture = document.getElementById('profileImagePreview');
    const profileInitials = document.getElementById('profileInitialsLarge');
    
    if (profilePicture && profileInitials) {
        if (currentUser.picture) {
            profilePicture.src = currentUser.picture;
            profilePicture.style.display = 'block';
            profileInitials.style.display = 'none';
        } else {
            profilePicture.style.display = 'none';
            profileInitials.style.display = 'flex';
            profileInitials.querySelector('span').textContent = initials;
        }
    }
}

function updateSiteBranding() {
    // Update login page
    document.getElementById('loginTitle').textContent = siteSettings.name;
    document.getElementById('loginSubtitle').textContent = siteSettings.slogan;
    
    // Update printable titles
    document.getElementById('printableTitle').textContent = `${siteSettings.name} - Rapport d'Évangélisation`;
    
    // Update logos if present
    if (siteSettings.logo) {
        const loginLogo = document.getElementById('loginLogo');
        const headerLogo = document.getElementById('headerLogo');
        
        if (loginLogo) {
            loginLogo.innerHTML = `<img src="${siteSettings.logo}" alt="${siteSettings.name}" class="w-20 h-20 rounded-full object-cover">`;
        }
        if (headerLogo) {
            headerLogo.innerHTML = `<img src="${siteSettings.logo}" alt="${siteSettings.name}" class="w-10 h-10 rounded-full object-cover">`;
        }
    }
}

// Page navigation
function showPage(pageId) {
    const pages = ['dashboardPage', 'soulsPage', 'addSoulPage', 'evangelistsPage', 'addEvangelistPage', 'chatPage', 'profilePage', 'mapPage', 'reportsPage', 'addReportPage', 'libraryPage', 'attendancePage'];
    pages.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.classList.add('hidden');
            page.classList.remove('slide-up');
        }
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('slide-up');
    }
    
    updateNavigation(pageId);
    updateHeader(pageId);
    loadPageContent(pageId);
    
    currentPage = pageId;
}

function updateNavigation(activePageId) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const isActive = btn.getAttribute('data-page') === activePageId;
        if (isActive) {
            btn.classList.add('text-primary', 'bg-purple-50', 'dark:bg-purple-900/20');
            btn.classList.remove('text-gray-600', 'dark:text-gray-400');
        } else {
            btn.classList.remove('text-primary', 'bg-purple-50', 'dark:bg-purple-900/20');
            btn.classList.add('text-gray-600', 'dark:text-gray-400');
        }
    });
}

function updateHeader(pageId) {
    const titles = {
        'dashboardPage': 'Dashboard',
        'soulsPage': 'Âmes gagnées',
        'addSoulPage': 'Nouvelle âme',
        'evangelistsPage': 'Équipe',
        'addEvangelistPage': 'Nouvel évangéliste',
        'chatPage': `Chat - ${currentUser ? currentUser.group : 'Groupe'}`,
        'profilePage': 'Mon Profil',
        'mapPage': 'Carte',
        'reportsPage': 'Rapports',
        'addReportPage': 'Nouveau rapport',
        'libraryPage': 'Bibliothèque',
        'attendancePage': 'Signaler ma présence'
    };
    
    document.getElementById('headerTitle').textContent = titles[pageId] || 'Dashboard';
}

async function loadPageContent(pageId) {
    switch(pageId) {
        case 'dashboardPage':
            await loadDashboardData();
            break;
        case 'soulsPage':
            await loadSoulsList();
            break;
        case 'evangelistsPage':
            await loadEvangelistsList();
            break;
        case 'reportsPage':
            await loadReportsList();
            break;
        case 'profilePage':
            loadProfileForm();
            break;
        case 'mapPage':
            if (map) {
                setTimeout(() => {
                    map.invalidateSize();
                    loadMapMarkers();
                }, 100);
            } else {
                setTimeout(() => {
                    initMap();
                }, 100);
            }
            break;
    }
}

// Load lists functions
async function loadSoulsList() {
    try {
        const souls = await getVisibleSouls();
        const evangelists = await getVisibleEvangelists();
        
        const container = document.getElementById('soulsGrid');
        container.innerHTML = souls.map(soul => {
            const evangelist = evangelists.find(e => e.id === soul.evangelistId);
            const date = soul.dateAdded.toDate ? soul.dateAdded.toDate() : new Date(soul.dateAdded);
            
            return `
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 gradient-bg rounded-full flex items-center justify-center">
                                ${soul.picture ?
                                    `<img src="${soul.picture}" alt="${soul.fullName}" class="w-12 h-12 rounded-full object-cover">` :
                                    `<span class="text-white text-lg font-semibold">${getInitials(soul.fullName)}</span>`
                                }
                            </div>
                            <div class="ml-3">
                                <h3 class="font-semibold text-gray-900 dark:text-white">${soul.fullName}</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">${soul.group}</p>
                            </div>
                        </div>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                        </span>
                    </div>
                    
                    <div class="space-y-2 text-sm mb-4">
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="phone" class="w-4 h-4 mr-2"></i>
                            <a href="tel:${soul.phone}" class="text-blue-600 dark:text-blue-400 hover:underline">${soul.phone}</a>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="map-pin" class="w-4 h-4 mr-2"></i>
                            <span>${soul.address}</span>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="calendar" class="w-4 h-4 mr-2"></i>
                            <span>${date.toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="user-check" class="w-4 h-4 mr-2"></i>
                            <span>Par ${evangelist ? evangelist.fullName : 'Inconnu'}</span>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                        <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">${soul.decision || 'Aucune information disponible'}</p>
                    </div>
                    
                    <div class="flex space-x-2 mb-3">
                        <button onclick="viewSoulDetails('${soul.id}')" class="flex-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="eye" class="w-4 h-4 mr-1"></i>
                            Voir rapports
                        </button>
                    </div>
                    
                    ${canManageEvangelists() || soul.evangelistId === currentUser.id ? `
                    <div class="flex space-x-2">
                        <button onclick="editSoul('${soul.id}')" class="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="edit" class="w-4 h-4 mr-1"></i>
                            Modifier
                        </button>
                        <button onclick="deleteSoulConfirm('${soul.id}')" class="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="trash-2" class="w-4 h-4 mr-1"></i>
                            Supprimer
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error loading souls list:', error);
    }
}

async function loadEvangelistsList() {
    try {
        const evangelists = await getVisibleEvangelists();
        
        const container = document.getElementById('evangelistsGrid');
        container.innerHTML = evangelists.map(evangelist => {
            const baptismDate = evangelist.baptismDate ? new Date(evangelist.baptismDate).toLocaleDateString('fr-FR') : 'Non renseignée';
            
            return `
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 ${evangelist.status === 'blocked' ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'} rounded-full flex items-center justify-center">
                                ${evangelist.picture ?
                                    `<img src="${evangelist.picture}" alt="${evangelist.fullName}" class="w-12 h-12 rounded-full object-cover">` :
                                    `<i data-lucide="${evangelist.status === 'blocked' ? 'user-x' : 'user-check'}" class="w-6 h-6 ${evangelist.status === 'blocked' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}"></i>`
                                }
                            </div>
                            <div class="ml-3">
                                <h3 class="font-semibold text-gray-900 dark:text-white">${evangelist.fullName}</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">${evangelist.role}</p>
                            </div>
                        </div>
                        <div class="flex flex-col items-end space-y-1">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                evangelist.role === 'Coordonnateur' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                evangelist.role === 'Adjoint' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }">
                                ${evangelist.role}
                            </span>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                evangelist.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }">
                                ${evangelist.status === 'blocked' ? 'Bloqué' : 'Actif'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="space-y-2 text-sm mb-4">
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="phone" class="w-4 h-4 mr-2"></i>
                            <a href="tel:${evangelist.phone}" class="text-blue-600 dark:text-blue-400 hover:underline">${evangelist.phone}</a>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="map-pin" class="w-4 h-4 mr-2"></i>
                            <span>${evangelist.address}</span>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="users" class="w-4 h-4 mr-2"></i>
                            <span>Groupe ${evangelist.group}</span>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="calendar" class="w-4 h-4 mr-2"></i>
                            <span>Baptême: ${baptismDate}</span>
                        </div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-3 mb-4">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Âmes gagnées</span>
                            <span class="text-2xl font-bold text-green-600 dark:text-green-400">${evangelist.soulsWon || 0}</span>
                        </div>
                    </div>
                    
                    ${canManageEvangelists() ? `
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="editEvangelist('${evangelist.id}')" class="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="edit" class="w-4 h-4 mr-1"></i>
                            Modifier
                        </button>
                        <button onclick="deleteEvangelistConfirm('${evangelist.id}')" class="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="trash-2" class="w-4 h-4 mr-1"></i>
                            Supprimer
                        </button>
                        ${isCoordonnateur() ? `
                        <button onclick="toggleEvangelistStatus('${evangelist.id}')" class="col-span-2 ${evangelist.status === 'active' ? 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400'} py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="${evangelist.status === 'active' ? 'user-x' : 'user-check'}" class="w-4 h-4 mr-1"></i>
                            ${evangelist.status === 'active' ? 'Bloquer' : 'Débloquer'}
                        </button>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error loading evangelists list:', error);
    }
}

async function loadReportsList() {
    try {
        const reports = await getVisibleReports();
        const evangelists = await getVisibleEvangelists();
        
        // Update statistics
        updateReportStatistics(reports);
        
        const container = document.getElementById('reportsGrid');
        container.innerHTML = reports.map(report => {
            const evangelist = evangelists.find(e => e.id === report.evangelistId);
            const reportDate = new Date(report.reportDate).toLocaleDateString('fr-FR');
            const collaborators = report.collaborators.map(id =>
                evangelists.find(e => e.id === id)?.fullName || 'Inconnu'
            ).join(', ');
            
            return `
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                                <i data-lucide="file-text" class="w-6 h-6 text-pink-600 dark:text-pink-400"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="font-semibold text-gray-900 dark:text-white">${report.location}</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">${evangelist ? evangelist.fullName : 'Inconnu'}</p>
                            </div>
                        </div>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            ${report.soulsMetData.length} âme${report.soulsMetData.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    
                    <div class="space-y-2 text-sm mb-4">
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="calendar" class="w-4 h-4 mr-2"></i>
                            <span>${reportDate}</span>
                        </div>
                        <div class="flex items-center text-gray-600 dark:text-gray-400">
                            <i data-lucide="users" class="w-4 h-4 mr-2"></i>
                            <span>Collaborateurs: ${collaborators || 'Aucun'}</span>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                        <h4 class="font-medium text-gray-900 dark:text-white mb-2">Âmes rencontrées:</h4>
                        <div class="space-y-1">
                            ${report.soulsMetData.map(soul => `
                            <div class="text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                <span>• ${soul.soulName} - ${getStatusText(soul.soulStatus)}</span>
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    soul.faithfulnessStatus === 'faithful' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    soul.faithfulnessStatus === 'unfaithful' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }">
                                    ${soul.faithfulnessStatus === 'faithful' ? 'Fidélisée' : soul.faithfulnessStatus === 'unfaithful' ? 'Non fidélisée' : 'En cours'}
                                </span>
                            </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${report.observations ? `
                    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                        <p class="text-sm text-blue-800 dark:text-blue-300">${report.observations}</p>
                    </div>
                    ` : ''}
                    
                    <div class="flex space-x-2">
                        <button onclick="viewReportDetails('${report.id}')" class="flex-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="eye" class="w-4 h-4 mr-1"></i>
                            Voir détails
                        </button>
                        <button onclick="printReport('${report.id}')" class="flex-1 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="printer" class="w-4 h-4 mr-1"></i>
                            Imprimer
                        </button>
                        ${report.evangelistId === currentUser.id || canManageEvangelists() ? `
                        <button onclick="deleteReportConfirm('${report.id}')" class="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error loading reports list:', error);
    }
}

function updateReportStatistics(reports) {
    const faithfulSouls = reports.reduce((count, report) => {
        return count + report.soulsMetData.filter(soul => soul.faithfulnessStatus === 'faithful').length;
    }, 0);
    
    const unfaithfulSouls = reports.reduce((count, report) => {
        return count + report.soulsMetData.filter(soul => soul.faithfulnessStatus === 'unfaithful').length;
    }, 0);
    
    const totalSoulsInReports = faithfulSouls + unfaithfulSouls;
    const faithfulnessRate = totalSoulsInReports > 0 ? Math.round((faithfulSouls / totalSoulsInReports) * 100) : 0;
    
    document.getElementById('totalOutings').textContent = reports.length;
    document.getElementById('totalFaithfulSouls').textContent = faithfulSouls;
    document.getElementById('totalUnfaithfulSouls').textContent = unfaithfulSouls;
    document.getElementById('faithfulnessRate').textContent = faithfulnessRate + '%';
}

function getStatusText(status) {
    const statusMap = {
        'priere': 'Prière',
        'exhortation': 'Exhortation',
        'affermissement': 'Affermissement',
        'conseil_spirituel': 'Conseil spirituel',
        'invitation': 'Invitation',
        'autre': 'Autre'
    };
    return statusMap[status] || status;
}

function loadProfileForm() {
    const form = document.getElementById('profileForm');
    const elements = form.elements;
    
    elements.fullName.value = currentUser.fullName;
    elements.username.value = currentUser.username;
    elements.phone.value = currentUser.phone;
    elements.role.value = currentUser.role;
    elements.address.value = currentUser.address;
    elements.group.value = currentUser.group;
    elements.baptismDate.value = currentUser.baptismDate || '';
    
    updateUserProfileDisplay();
}

// Initialize map
function initMap() {
    map = L.map('map').setView(CHURCH_COORDINATES, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    loadMapMarkers();
}

async function loadMapMarkers() {
    if (!map) return;
    
    // Clear existing markers
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    const evangelistIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #10B981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        </svg>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    const soulIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3B82F6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
        </svg>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    const coordinatorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #8B5CF6; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <polyline points="16,11 18,13 22,9"/>
        </svg>
        </div>`,
        iconSize: [35, 35],
        iconAnchor: [17.5, 17.5]
    });
    
    try {
        const [evangelists, souls] = await Promise.all([
            getVisibleEvangelists(),
            getVisibleSouls()
        ]);
        
        // Add evangelist markers
        evangelists.forEach(evangelist => {
            if (evangelist.lat && evangelist.lng) {
                const icon = evangelist.role === 'Coordonnateur' ? coordinatorIcon : evangelistIcon;
                const marker = L.marker([evangelist.lat, evangelist.lng], { icon: icon }).addTo(map);
                
                marker.bindPopup(`
                    <div class="p-2">
                        <h3 class="font-semibold text-lg">${evangelist.fullName}</h3>
                        <p class="text-sm text-gray-600">${evangelist.role}</p>
                        <p class="text-sm">${evangelist.group}</p>
                        <p class="text-sm font-medium text-green-600">${evangelist.soulsWon || 0} âmes gagnées</p>
                        <p class="text-xs text-gray-500"><a href="tel:${evangelist.phone}" class="text-blue-600 hover:underline">${evangelist.phone}</a></p>
                    </div>
                `);
            }
        });
        
        // Add soul markers
        souls.forEach(soul => {
            if (soul.lat && soul.lng) {
                const marker = L.marker([soul.lat, soul.lng], { icon: soulIcon }).addTo(map);
                
                const evangelist = evangelists.find(e => e.id === soul.evangelistId);
                marker.bindPopup(`
                    <div class="p-2">
                        <h3 class="font-semibold text-lg">${soul.fullName}</h3>
                        <p class="text-sm text-gray-600"><a href="tel:${soul.phone}" class="text-blue-600 hover:underline">${soul.phone}</a></p>
                        <p class="text-sm">${soul.address}</p>
                        <p class="text-sm text-blue-600">${soul.group}</p>
                        <p class="text-xs text-gray-500">Par ${evangelist ? evangelist.fullName : 'Inconnu'}</p>
                    </div>
                `);
            }
        });
        
    } catch (error) {
        console.error('Error loading map markers:', error);
    }
}

// Charts initialization
function initializeCharts() {
    if (!isCoordonnateur()) return;
    
    // This would be implemented with actual chart data
    // For now, it's a placeholder
}

// Form event listeners
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const loginButton = document.getElementById('loginButton');
    const originalText = loginButton.textContent;
    
    try {
        loginButton.textContent = 'Connexion...';
        loginButton.disabled = true;
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        await loginUser(username, password);
        
    } catch (error) {
        console.error('Login failed:', error);
        showNotification(error.message || 'Erreur de connexion', 'error');
    } finally {
        loginButton.textContent = originalText;
        loginButton.disabled = false;
    }
});

document.getElementById('logoutBtn').addEventListener('click', function() {
    currentUser = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginForm').reset();
});

// Soul form submission
document.getElementById('soulForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        let group = formData.get('group');
        
        if (group === 'autre') {
            const newGroupName = prompt('Entrez le nom du nouveau groupe:');
            if (!newGroupName) return;
            
            // Create new group
            const { db, collection, doc, setDoc } = window.firebase;
            const groupRef = doc(collection(db, 'groups'));
            await setDoc(groupRef, {
                id: groupRef.id,
                name: newGroupName,
                createdBy: currentUser.id,
                status: 'active',
                createdAt: new Date()
            });
            
            group = newGroupName;
            await loadGroupSelects();
        }
        
        // Handle profile picture
        let soulPicture = null;
        const soulImagePreview = document.getElementById('soulImagePreview');
        if (soulImagePreview && soulImagePreview.src && soulImagePreview.style.display !== 'none') {
            // Upload image to Firebase Storage
            const file = document.getElementById('soulPicture').files[0];
            if (file) {
                const imagePath = `souls/${Date.now()}_${file.name}`;
                soulPicture = await uploadImage(file, imagePath);
            }
        }
        
        const soulData = {
            fullName: formData.get('fullName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            group: group,
            decision: formData.get('decision'),
            picture: soulPicture
        };
        
        await addSoul(soulData);
        
        e.target.reset();
        // Reset image preview
        document.getElementById('soulImagePreview').style.display = 'none';
        document.getElementById('soulInitialsPreview').style.display = 'flex';
        document.getElementById('soulInitialsPreview').querySelector('span').textContent = '👤';
        
        showPage('soulsPage');
        showNotification('Âme ajoutée avec succès !', 'success');
        
    } catch (error) {
        console.error('Error adding soul:', error);
        showNotification('Erreur lors de l\'ajout de l\'âme', 'error');
    }
});

// Evangelist form submission
document.getElementById('evangelistForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!canManageEvangelists()) {
        alert('Vous n\'avez pas les permissions pour ajouter des évangélistes');
        return;
    }
    
    try {
        const formData = new FormData(e.target);
        
        // Check if username already exists
        const { db, collection, query, where, getDocs } = window.firebase;
        const q = query(
            collection(db, 'evangelists'),
            where('username', '==', formData.get('username'))
        );
        const existingUser = await getDocs(q);
        
        if (!existingUser.empty) {
            alert('Ce nom d\'utilisateur existe déjà');
            return;
        }
        
        let group = formData.get('group');
        
        if (group === 'autre') {
            const newGroupName = prompt('Entrez le nom du nouveau groupe:');
            if (!newGroupName) return;
            
            // Create new group
            const groupRef = doc(collection(db, 'groups'));
            await setDoc(groupRef, {
                id: groupRef.id,
                name: newGroupName,
                createdBy: currentUser.id,
                status: 'active',
                createdAt: new Date()
            });
            
            group = newGroupName;
            await loadGroupSelects();
        }
        
        const evangelistData = {
            fullName: formData.get('fullName'),
            username: formData.get('username'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            address: formData.get('address'),
            group: group,
            baptismDate: formData.get('baptismDate'),
            password: formData.get('username') // Default password is username
        };
        
        await addEvangelist(evangelistData);
        
        e.target.reset();
        showPage('evangelistsPage');
        showNotification('Évangéliste ajouté avec succès !', 'success');
        
    } catch (error) {
        console.error('Error adding evangelist:', error);
        showNotification('Erreur lors de l\'ajout de l\'évangéliste', 'error');
    }
});

// Report form submission
document.getElementById('reportForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        
        const collaborators = [];
        const collaboratorInputs = document.querySelectorAll('input[name="collaborators[]"]:checked');
        collaboratorInputs.forEach(input => {
            collaborators.push(input.value);
        });
        
        const soulNames = formData.getAll('soulName[]');
        const soulPhones = formData.getAll('soulPhone[]');
        const discussionContents = formData.getAll('discussionContent[]');
        const soulStatuses = formData.getAll('soulStatus[]');
        const faithfulnessStatuses = formData.getAll('faithfulnessStatus[]');
        const versesUsed = formData.getAll('verseUsed[]');
        const strengtheningTitles = formData.getAll('strengtheningTitle[]');
        
        const soulsMetData = soulNames.map((name, index) => ({
            soulId: null,
            soulName: name,
            soulPhone: soulPhones[index] || '',
            discussionContent: discussionContents[index],
            soulStatus: soulStatuses[index],
            faithfulnessStatus: faithfulnessStatuses[index],
            verseUsed: versesUsed[index] || '',
            strengtheningTitle: strengtheningTitles[index] || ''
        }));
        
        const reportData = {
            reportDate: formData.get('reportDate'),
            location: formData.get('location'),
            collaborators: collaborators,
            soulsMetData: soulsMetData,
            observations: formData.get('observations')
        };
        
        await addReport(reportData);
        
        e.target.reset();
        showPage('reportsPage');
        showNotification('Rapport enregistré avec succès !', 'success');
        
    } catch (error) {
        console.error('Error adding report:', error);
        showNotification('Erreur lors de l\'enregistrement du rapport', 'error');
    }
});

// Profile form submission
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        
        if (newPassword) {
            if (currentUser.password !== currentPassword) {
                alert('Mot de passe actuel incorrect');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('Les nouveaux mots de passe ne correspondent pas');
                return;
            }
            
            if (newPassword.length < 4) {
                alert('Le mot de passe doit contenir au moins 4 caractères');
                return;
            }
        }
        
        // Handle profile picture upload
        let profilePicture = currentUser.picture;
        const profileImagePreview = document.getElementById('profileImagePreview');
        if (profileImagePreview && profileImagePreview.src && profileImagePreview.style.display !== 'none') {
            const file = document.getElementById('profilePicture').files[0];
            if (file) {
                const imagePath = `profiles/${currentUser.id}_${Date.now()}_${file.name}`;
                profilePicture = await uploadImage(file, imagePath);
            }
        }
        
        const updateData = {
            fullName: formData.get('fullName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            baptismDate: formData.get('baptismDate'),
            picture: profilePicture
        };
        
        if (newPassword) {
            updateData.password = newPassword;
        }
        
        await updateEvangelist(currentUser.id, updateData);
        
        // Update current user object
        Object.assign(currentUser, updateData);
        
        // Clear password fields
        document.getElementById('profileForm').elements.currentPassword.value = '';
        document.getElementById('profileForm').elements.newPassword.value = '';
        document.getElementById('profileForm').elements.confirmPassword.value = '';
        
        // Update UI
        document.getElementById('userName').textContent = currentUser.fullName;
        updateUserProfileDisplay();
        
        showNotification('Profil mis à jour avec succès !', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Erreur lors de la mise à jour du profil', 'error');
    }
});

// Image preview functions
function previewProfilePicture(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profileImagePreview');
            const initials = document.getElementById('profileInitialsLarge');
            
            preview.src = e.target.result;
            preview.style.display = 'block';
            initials.style.display = 'none';
            
            // Update header profile picture too
            const headerPicture = document.getElementById('userProfilePicture');
            const headerInitials = document.getElementById('userInitials');
            headerPicture.src = e.target.result;
            headerPicture.style.display = 'block';
            headerInitials.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewSoulPicture(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('soulImagePreview');
            const initials = document.getElementById('soulInitialsPreview');
            
            preview.src = e.target.result;
            preview.style.display = 'block';
            initials.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateSoulInitials(fullName) {
    if (!fullName) return;
    
    const names = fullName.trim().split(' ');
    const initials = names.map(name => name.charAt(0).toUpperCase()).slice(0, 2).join('');
    
    const initialsContainer = document.getElementById('soulInitialsPreview');
    if (initialsContainer && document.getElementById('soulImagePreview').style.display !== 'block') {
        initialsContainer.querySelector('span').textContent = initials || '👤';
    }
}

// Delete confirmation functions
async function deleteSoulConfirm(soulId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette âme ?')) {
        try {
            await deleteSoul(soulId);
            await loadSoulsList();
            await updateStats();
            showNotification('Âme supprimée avec succès', 'success');
        } catch (error) {
            console.error('Error deleting soul:', error);
            showNotification('Erreur lors de la suppression', 'error');
        }
    }
}

async function deleteEvangelistConfirm(evangelistId) {
    if (!canManageEvangelists()) {
        alert('Vous n\'avez pas les permissions pour supprimer des évangélistes');
        return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet évangéliste ?')) {
        try {
            await deleteEvangelist(evangelistId);
            await loadEvangelistsList();
            await updateStats();
            showNotification('Évangéliste supprimé avec succès', 'success');
        } catch (error) {
            console.error('Error deleting evangelist:', error);
            showNotification('Erreur lors de la suppression', 'error');
        }
    }
}

async function deleteReportConfirm(reportId) {
    const reports = await getVisibleReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) return;
    
    if (report.evangelistId !== currentUser.id && !canManageEvangelists()) {
        alert('Vous ne pouvez supprimer que vos propres rapports');
        return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
        try {
            const { db, doc, updateDoc } = window.firebase;
            const reportRef = doc(db, 'reports', reportId);
            await updateDoc(reportRef, { status: 'deleted' });
            
            await loadReportsList();
            await updateStats();
            showNotification('Rapport supprimé avec succès', 'success');
        } catch (error) {
            console.error('Error deleting report:', error);
            showNotification('Erreur lors de la suppression', 'error');
        }
    }
}

async function toggleEvangelistStatus(evangelistId) {
    if (!isCoordonnateur()) {
        alert('Seuls les coordonnateurs peuvent bloquer/débloquer des évangélistes');
        return;
    }
    
    try {
        const evangelists = await getVisibleEvangelists();
        const evangelist = evangelists.find(e => e.id === evangelistId);
        
        if (!evangelist) return;
        
        const action = evangelist.status === 'active' ? 'bloquer' : 'débloquer';
        const confirmMessage = `Êtes-vous sûr de vouloir ${action} cet évangéliste ?`;
        
        if (confirm(confirmMessage)) {
            const newStatus = evangelist.status === 'active' ? 'blocked' : 'active';
            await updateEvangelist(evangelistId, { status: newStatus });
            
            await loadEvangelistsList();
            await updateStats();
            showNotification(`Évangéliste ${action === 'bloquer' ? 'bloqué' : 'débloqué'} avec succès`, 'success');
        }
    } catch (error) {
        console.error('Error toggling evangelist status:', error);
        showNotification('Erreur lors de la modification du statut', 'error');
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification bg-white dark:bg-gray-800 border-l-4 ${
        type === 'success' ? 'border-green-500' : 'border-red-500'
    } rounded-lg shadow-lg p-4 transform translate-x-full transition-transform duration-300`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"
                class="w-5 h-5 ${type === 'success' ? 'text-green-500' : 'text-red-500'}"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium text-gray-900 dark:text-white">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    
    document.getElementById('notificationsContainer').appendChild(notification);
    lucide.createIcons();
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Dark mode support
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

// Placeholder functions for features not yet implemented
function viewSoulDetails(soulId) {
    console.log('View soul details:', soulId);
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function viewReportDetails(reportId) {
    console.log('View report details:', reportId);
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function editSoul(soulId) {
    console.log('Edit soul:', soulId);
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function editEvangelist(evangelistId) {
    console.log('Edit evangelist:', evangelistId);
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function printReport(reportId) {
    console.log('Print report:', reportId);
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function openGroupsModal() {
    console.log('Open groups modal');
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function openSiteSettingsModal() {
    console.log('Open site settings modal');
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function openAnnouncementModal() {
    console.log('Open announcement modal');
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function showNotificationsModal() {
    console.log('Show notifications modal');
    showNotification('Fonctionnalité en cours de développement', 'info');
}

function openAddDocumentModal() {
    console.log('Open add document modal');
    showNotification('Fonctionnalité en cours de développement', 'info');
}

// Initialize icons when page loads
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
});