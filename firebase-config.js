// Configuration et initialisation Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAaegtkBUd-fk9F0yokbNGxgRpF57E0dlE",
    authDomain: "cecne-768ff.firebaseapp.com",
    projectId: "cecne-768ff",
    storageBucket: "cecne-768ff.firebasestorage.app",
    messagingSenderId: "295270043435",
    appId: "1:295270043435:web:357f8fafdeb5671d51bf6e"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Variables globales
let currentUser = null;
let currentPage = 'dashboard';
let isLoading = false;

// Données par défaut
const defaultGroups = [
    { id: 'centre-ville', name: 'Centre-ville', description: 'Zone centrale de Kinshasa' },
    { id: 'gombe', name: 'Gombe', description: 'Commune de la Gombe' },
    { id: 'kalamu', name: 'Kalamu', description: 'Commune de Kalamu' },
    { id: 'kinshasa', name: 'Kinshasa', description: 'Commune de Kinshasa' },
    { id: 'ngiri-ngiri', name: 'Ngiri-Ngiri', description: 'Commune de Ngiri-Ngiri' }
];

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        await initializeFirebaseData();
        initializeEventListeners();
        
        // Simuler un délai de chargement
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
        }, 1500);
    }, 500);
});

// Initialiser les données par défaut dans Firebase
async function initializeFirebaseData() {
    try {
        // Créer les groupes par défaut
        for (const group of defaultGroups) {
            const groupRef = doc(db, 'groups', group.id);
            const groupDoc = await getDoc(groupRef);
            if (!groupDoc.exists()) {
                await setDoc(groupRef, {
                    ...group,
                    createdAt: serverTimestamp()
                });
            }
        }

        // Créer l'utilisateur administrateur par défaut
        const adminRef = doc(db, 'users', 'admin');
        const adminDoc = await getDoc(adminRef);
        if (!adminDoc.exists()) {
            await setDoc(adminRef, {
                username: 'admin',
                password: 'admin123', // En production, il faudrait hasher ce mot de passe
                fullName: 'Administrateur CECNE',
                email: 'admin@cecne.org',
                phone: '+243 XXX XXX XXX',
                role: 'coordinator',
                group: 'centre-ville',
                address: 'Kinshasa, RDC',
                avatar: '',
                createdAt: serverTimestamp(),
                lastLogin: null
            });
        }

        console.log('✅ Données par défaut initialisées');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    }
}

// Initialiser les événements
function initializeEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) showPage(page);
        });
    });

    // Quick actions
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleQuickAction(action);
        });
    });

    // User menu
    document.getElementById('userMenuBtn').addEventListener('click', toggleUserMenu);
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Form submissions
    document.getElementById('soulForm').addEventListener('submit', handleSoulSubmit);
    document.getElementById('evangelistForm').addEventListener('submit', handleEvangelistSubmit);
    document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);
    document.getElementById('documentForm').addEventListener('submit', handleDocumentSubmit);
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);
    document.getElementById('announcementForm').addEventListener('submit', handleAnnouncementSubmit);
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);

    // Button clicks
    document.getElementById('addSoulBtn').addEventListener('click', () => openSoulModal());
    document.getElementById('addEvangelistBtn').addEventListener('click', () => openEvangelistModal());
    document.getElementById('addReportBtn').addEventListener('click', () => openReportModal());
    document.getElementById('uploadDocumentBtn').addEventListener('click', () => openDocumentModal());
    document.getElementById('markAttendanceBtn').addEventListener('click', () => openAttendanceModal());
    document.getElementById('addAnnouncementBtn').addEventListener('click', () => openAnnouncementModal());
    
    // Search functionality
    document.getElementById('searchSouls')?.addEventListener('input', filterSouls);
    document.getElementById('searchReports')?.addEventListener('input', filterReports);
    document.getElementById('searchDocuments')?.addEventListener('input', filterDocuments);
    
    // Chat functionality
    document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // File inputs
    document.getElementById('avatarInput')?.addEventListener('change', handleAvatarChange);
    document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });

    // Print functionality
    document.getElementById('printReportsBtn')?.addEventListener('click', printReports);
    document.getElementById('exportSoulsBtn')?.addEventListener('click', exportSouls);
}

// Gestion de la connexion
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    try {
        showLoading(true);
        
        // Chercher l'utilisateur dans Firestore
        const userRef = doc(db, 'users', username);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            showNotification('Nom d\'utilisateur ou mot de passe incorrect', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        // Vérifier le mot de passe (en production, utiliser un hash)
        if (userData.password !== password) {
            showNotification('Nom d\'utilisateur ou mot de passe incorrect', 'error');
            return;
        }
        
        // Mettre à jour la dernière connexion
        await updateDoc(userRef, {
            lastLogin: serverTimestamp()
        });
        
        // Définir l'utilisateur actuel
        currentUser = { id: username, ...userData };
        
        // Afficher l'application principale
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Charger les données utilisateur
        loadUserData();
        showPage('dashboard');
        
        showNotification('Connexion réussie! Bienvenue ' + userData.fullName, 'success');
        
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showNotification('Erreur de connexion. Veuillez réessayer.', 'error');
    } finally {
        showLoading(false);
    }
}

// Déconnexion
async function handleLogout() {
    try {
        currentUser = null;
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        
        // Reset forms
        document.getElementById('loginForm').reset();
        
        showNotification('Déconnexion réussie', 'success');
    } catch (error) {
        console.error('Erreur de déconnexion:', error);
    }
}

// Charger les données utilisateur
function loadUserData() {
    if (!currentUser) return;
    
    // Mettre à jour l'interface utilisateur
    document.getElementById('userName').textContent = currentUser.fullName;
    document.getElementById('userAvatar').src = currentUser.avatar || 'https://via.placeholder.com/32';
    
    // Charger le profil
    loadProfile();
    
    // Afficher/masquer les sections selon le rôle
    if (currentUser.role === 'coordinator') {
        document.getElementById('announcementsSection').style.display = 'block';
        document.getElementById('addEvangelistBtn').style.display = 'inline-flex';
    } else {
        document.getElementById('announcementsSection').style.display = 'none';
        if (currentUser.role === 'evangelist') {
            document.getElementById('addEvangelistBtn').style.display = 'none';
        }
    }
}

// Navigation entre les pages
function showPage(pageId) {
    // Masquer toutes les pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Afficher la page sélectionnée
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
        currentPage = pageId;
        
        // Mettre à jour le titre
        updatePageTitle(pageId);
        
        // Mettre à jour la navigation active
        updateActiveNavigation(pageId);
        
        // Charger les données de la page
        loadPageData(pageId);
    }
}

// Mettre à jour le titre de la page
function updatePageTitle(pageId) {
    const titles = {
        dashboard: 'Tableau de bord',
        souls: 'Âmes converties',
        evangelists: 'Évangélistes',
        reports: 'Rapports',
        map: 'Carte',
        chat: 'Chat',
        library: 'Bibliothèque',
        attendance: 'Présences',
        profile: 'Profil'
    };
    
    document.getElementById('pageTitle').textContent = titles[pageId] || 'CECNE';
}

// Mettre à jour la navigation active
function updateActiveNavigation(pageId) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
}

// Charger les données de la page
async function loadPageData(pageId) {
    try {
        switch (pageId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'souls':
                await loadSoulsData();
                break;
            case 'evangelists':
                await loadEvangelistsData();
                break;
            case 'reports':
                await loadReportsData();
                break;
            case 'map':
                await loadMapData();
                break;
            case 'chat':
                await loadChatData();
                break;
            case 'library':
                await loadLibraryData();
                break;
            case 'attendance':
                await loadAttendanceData();
                break;
            case 'profile':
                await loadProfile();
                break;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
}

// Charger les données du dashboard
async function loadDashboardData() {
    try {
        // Charger les statistiques
        const [souls, evangelists, reports] = await Promise.all([
            getDocs(collection(db, 'souls')),
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'reports'))
        ]);
        
        // Calculer les statistiques
        const totalSouls = souls.size;
        const totalEvangelists = evangelists.docs.filter(doc => 
            doc.data().role !== 'coordinator'
        ).length;
        const totalReports = reports.size;
        
        // Ce mois
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthSouls = souls.docs.filter(doc => {
            const createdAt = doc.data().createdAt?.toDate();
            return createdAt && 
                   createdAt.getMonth() === currentMonth && 
                   createdAt.getFullYear() === currentYear;
        }).length;
        
        // Mettre à jour l'interface
        document.getElementById('totalSouls').textContent = totalSouls;
        document.getElementById('totalEvangelists').textContent = totalEvangelists;
        document.getElementById('totalReports').textContent = totalReports;
        document.getElementById('thisMonthSouls').textContent = thisMonthSouls;
        
        // Charger les activités récentes
        await loadRecentActivities();
        
        // Charger les annonces pour les coordinateurs
        if (currentUser.role === 'coordinator') {
            await loadAnnouncements();
        }
        
    } catch (error) {
        console.error('Erreur dashboard:', error);
    }
}

// Charger les activités récentes
async function loadRecentActivities() {
    try {
        const activitiesContainer = document.getElementById('recentActivities');
        if (!activitiesContainer) return;
        
        activitiesContainer.innerHTML = '<p class="text-gray-500">Chargement des activités...</p>';
        
        // Simuler des activités récentes
        const activities = [
            { type: 'soul', text: 'Nouvelle âme convertie: Marie Kalala', time: '2 heures' },
            { type: 'report', text: 'Rapport d\'évangélisation soumis', time: '5 heures' },
            { type: 'evangelist', text: 'Nouvel évangéliste ajouté', time: '1 jour' }
        ];
        
        activitiesContainer.innerHTML = activities.map(activity => `
            <div class="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-${activity.type === 'soul' ? 'user' : activity.type === 'report' ? 'file-alt' : 'user-plus'} text-blue-600 text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm text-gray-800">${activity.text}</p>
                    <p class="text-xs text-gray-500">Il y a ${activity.time}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erreur activités récentes:', error);
    }
}

// Charger les âmes
async function loadSoulsData() {
    try {
        const soulsQuery = query(collection(db, 'souls'), orderBy('createdAt', 'desc'));
        const soulsSnapshot = await getDocs(soulsQuery);
        
        const tbody = document.getElementById('soulsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        soulsSnapshot.forEach(doc => {
            const soul = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4">
                    <img src="${soul.photo || 'https://via.placeholder.com/40'}" 
                         alt="${soul.name}" 
                         class="w-10 h-10 rounded-full object-cover">
                </td>
                <td class="px-6 py-4 font-medium text-gray-900">${soul.name}</td>
                <td class="px-6 py-4 text-gray-600">${soul.phone || '-'}</td>
                <td class="px-6 py-4 text-gray-600">${soul.group}</td>
                <td class="px-6 py-4 text-gray-600">${soul.evangelist}</td>
                <td class="px-6 py-4 text-gray-600">${formatDate(soul.createdAt)}</td>
                <td class="px-6 py-4">
                    <div class="flex space-x-2">
                        <button onclick="editSoul('${doc.id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteSoul('${doc.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Charger les groupes pour le filtre
        await loadGroupsForFilter('filterSoulsGroup');
        
    } catch (error) {
        console.error('Erreur chargement âmes:', error);
    }
}

// Charger les évangélistes
async function loadEvangelistsData() {
    try {
        const evangelistsQuery = query(collection(db, 'users'), where('role', '!=', 'coordinator'));
        const evangelistsSnapshot = await getDocs(evangelistsQuery);
        
        const grid = document.getElementById('evangelistsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        evangelistsSnapshot.forEach(doc => {
            const evangelist = doc.data();
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow p-6 card-hover';
            card.innerHTML = `
                <div class="flex items-center space-x-4 mb-4">
                    <img src="${evangelist.avatar || 'https://via.placeholder.com/60'}" 
                         alt="${evangelist.fullName}" 
                         class="w-15 h-15 rounded-full object-cover">
                    <div>
                        <h3 class="font-semibold text-gray-900">${evangelist.fullName}</h3>
                        <p class="text-sm text-gray-600">${evangelist.role}</p>
                        <p class="text-sm text-gray-500">${evangelist.group}</p>
                    </div>
                </div>
                <div class="space-y-2 text-sm">
                    <p><i class="fas fa-phone w-4"></i> ${evangelist.phone}</p>
                    <p><i class="fas fa-map-marker-alt w-4"></i> ${evangelist.address}</p>
                </div>
                <div class="mt-4 flex space-x-2">
                    <button onclick="editEvangelist('${doc.id}')" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">
                        Modifier
                    </button>
                    ${currentUser.role === 'coordinator' ? `
                    <button onclick="deleteEvangelist('${doc.id}')" class="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600">
                        Supprimer
                    </button>
                    ` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erreur chargement évangélistes:', error);
    }
}

// Charger les rapports
async function loadReportsData() {
    try {
        const reportsQuery = query(collection(db, 'reports'), orderBy('date', 'desc'));
        const reportsSnapshot = await getDocs(reportsQuery);
        
        const container = document.getElementById('reportsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        reportsSnapshot.forEach(doc => {
            const report = doc.data();
            const item = document.createElement('div');
            item.className = 'p-6 hover:bg-gray-50';
            item.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${report.location}</h3>
                        <p class="text-sm text-gray-600">Par ${report.evangelist} • ${formatDate(report.date)}</p>
                        <p class="text-sm text-gray-500 mt-2">${report.description.substring(0, 100)}...</p>
                        <div class="flex space-x-4 mt-2 text-xs text-gray-500">
                            <span>Conversions: ${report.newConversions || 0}</span>
                            <span>Suivis: ${report.followUps || 0}</span>
                            <span>Bibles: ${report.biblesDistributed || 0}</span>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="viewReport('${doc.id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editReport('${doc.id}')" class="text-green-600 hover:text-green-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteReport('${doc.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Erreur chargement rapports:', error);
    }
}

// Charger les données de la carte
async function loadMapData() {
    try {
        // Simuler des données de localisation
        const evangelistsByCommune = {
            'Gombe': 5,
            'Kalamu': 8,
            'Centre-ville': 12,
            'Kinshasa': 6,
            'Ngiri-Ngiri': 4
        };
        
        const soulsByCommune = {
            'Gombe': 15,
            'Kalamu': 28,
            'Centre-ville': 35,
            'Kinshasa': 22,
            'Ngiri-Ngiri': 18
        };
        
        // Afficher les statistiques par commune
        const evangelistsContainer = document.getElementById('evangelistsByCommune');
        const soulsContainer = document.getElementById('soulsByCommune');
        
        if (evangelistsContainer) {
            evangelistsContainer.innerHTML = Object.entries(evangelistsByCommune)
                .map(([commune, count]) => `
                    <div class="flex justify-between">
                        <span>${commune}</span>
                        <span class="font-semibold">${count}</span>
                    </div>
                `).join('');
        }
        
        if (soulsContainer) {
            soulsContainer.innerHTML = Object.entries(soulsByCommune)
                .map(([commune, count]) => `
                    <div class="flex justify-between">
                        <span>${commune}</span>
                        <span class="font-semibold">${count}</span>
                    </div>
                `).join('');
        }
        
    } catch (error) {
        console.error('Erreur chargement carte:', error);
    }
}

// Charger les données du chat
async function loadChatData() {
    try {
        const groups = await getDocs(collection(db, 'groups'));
        const chatGroupsContainer = document.getElementById('chatGroups');
        
        if (!chatGroupsContainer) return;
        
        chatGroupsContainer.innerHTML = '';
        
        groups.forEach(doc => {
            const group = doc.data();
            const groupElement = document.createElement('div');
            groupElement.className = 'p-4 hover:bg-gray-50 cursor-pointer border-b';
            groupElement.innerHTML = `
                <h4 class="font-medium">${group.name}</h4>
                <p class="text-sm text-gray-500">${group.description}</p>
            `;
            groupElement.onclick = () => loadChatMessages(doc.id, group.name);
            chatGroupsContainer.appendChild(groupElement);
        });
        
    } catch (error) {
        console.error('Erreur chargement chat:', error);
    }
}

// Charger les messages du chat
async function loadChatMessages(groupId, groupName) {
    try {
        document.getElementById('activeChatGroup').textContent = groupName;
        const messagesContainer = document.getElementById('chatMessages');
        
        if (!messagesContainer) return;
        
        // Simuler des messages
        const messages = [
            { sender: 'Jean Mukendi', message: 'Bonjour tout le monde!', time: '10:30', isSent: false },
            { sender: 'Moi', message: 'Salut! Comment ça va?', time: '10:32', isSent: true },
            { sender: 'Marie Kalala', message: 'Très bien, merci!', time: '10:35', isSent: false }
        ];
        
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="chat-bubble ${msg.isSent ? 'sent' : 'received'} p-3 rounded-lg">
                ${!msg.isSent ? `<p class="text-xs font-medium mb-1">${msg.sender}</p>` : ''}
                <p>${msg.message}</p>
                <p class="text-xs opacity-70 mt-1">${msg.time}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erreur chargement messages:', error);
    }
}

// Envoyer un message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        // Ajouter le message à la liste
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-bubble sent p-3 rounded-lg';
        messageElement.innerHTML = `
            <p>${message}</p>
            <p class="text-xs opacity-70 mt-1">${new Date().toLocaleTimeString()}</p>
        `;
        messagesContainer.appendChild(messageElement);
        
        // Vider l'input
        input.value = '';
        
        // Scroll vers le bas
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Erreur envoi message:', error);
    }
}

// Charger les données de la bibliothèque
async function loadLibraryData() {
    try {
        const documentsQuery = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
        const documentsSnapshot = await getDocs(documentsQuery);
        
        const container = document.getElementById('documentsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (documentsSnapshot.empty) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-book text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">Aucun document disponible</p>
                </div>
            `;
            return;
        }
        
        documentsSnapshot.forEach(doc => {
            const document_data = doc.data();
            const card = document.createElement('div');
            card.className = 'file-item p-4 border rounded-lg';
            card.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fas fa-file-pdf text-red-500 text-2xl"></i>
                    <div class="flex-1">
                        <h4 class="font-medium">${document_data.name}</h4>
                        <p class="text-sm text-gray-500">${document_data.description || 'Aucune description'}</p>
                        <p class="text-xs text-gray-400">${formatDate(document_data.createdAt)}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="downloadDocument('${document_data.url}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="deleteDocument('${doc.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erreur chargement bibliothèque:', error);
    }
}

// Charger les données de présence
async function loadAttendanceData() {
    try {
        // Charger les présences d'aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        const todayContainer = document.getElementById('todayAttendance');
        
        if (todayContainer) {
            todayContainer.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-500">Aucune donnée de présence pour aujourd'hui</p>
                </div>
            `;
        }
        
        // Charger les statistiques
        const statsContainer = document.getElementById('attendanceStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span>Présences cette semaine</span>
                        <span class="font-semibold">85%</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Présences ce mois</span>
                        <span class="font-semibold">78%</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Évangélistes actifs</span>
                        <span class="font-semibold">12/15</span>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erreur chargement présences:', error);
    }
}

// Charger le profil
async function loadProfile() {
    if (!currentUser) return;
    
    try {
        // Mettre à jour les champs du profil
        document.getElementById('profileName').textContent = currentUser.fullName;
        document.getElementById('profileRole').textContent = currentUser.role;
        document.getElementById('profileAvatar').src = currentUser.avatar || 'https://via.placeholder.com/120';
        
        document.getElementById('profileFullName').value = currentUser.fullName || '';
        document.getElementById('profileUsername').value = currentUser.username || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        document.getElementById('profilePhone').value = currentUser.phone || '';
        document.getElementById('profileAddress').value = currentUser.address || '';
        
        // Charger les groupes
        await loadGroupsForSelect('profileGroup');
        document.getElementById('profileGroup').value = currentUser.group || '';
        
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

// Actions rapides
function handleQuickAction(action) {
    switch (action) {
        case 'add-soul':
            openSoulModal();
            break;
        case 'add-evangelist':
            if (currentUser.role === 'coordinator') {
                openEvangelistModal();
            } else {
                showNotification('Action non autorisée', 'error');
            }
            break;
        case 'add-report':
            openReportModal();
            break;
        case 'view-map':
            showPage('map');
            break;
    }
}

// Modales
function openSoulModal(soulId = null) {
    document.getElementById('soulModal').classList.remove('hidden');
    document.getElementById('soulModalTitle').textContent = soulId ? 'Modifier l\'âme' : 'Nouvelle âme convertie';
    
    if (!soulId) {
        document.getElementById('soulForm').reset();
    }
    
    // Charger les groupes et évangélistes
    loadGroupsForSelect('soulGroup');
    loadEvangelistsForSelect('soulEvangelist');
}

function openEvangelistModal(evangelistId = null) {
    document.getElementById('evangelistModal').classList.remove('hidden');
    document.getElementById('evangelistModalTitle').textContent = evangelistId ? 'Modifier l\'évangéliste' : 'Nouvel évangéliste';
    
    if (!evangelistId) {
        document.getElementById('evangelistForm').reset();
    }
    
    // Charger les groupes
    loadGroupsForSelect('evangelistGroup');
}

function openReportModal(reportId = null) {
    document.getElementById('reportModal').classList.remove('hidden');
    document.getElementById('reportModalTitle').textContent = reportId ? 'Modifier le rapport' : 'Nouveau rapport d\'évangélisation';
    
    if (!reportId) {
        document.getElementById('reportForm').reset();
        document.getElementById('reportDate').value = new Date().toISOString().split('T')[0];
    }
    
    // Charger les évangélistes et âmes
    loadEvangelistsForSelect('reportEvangelist');
    loadSoulsForReport();
}

function openDocumentModal() {
    document.getElementById('documentModal').classList.remove('hidden');
    document.getElementById('documentForm').reset();
}

function openAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('hidden');
    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
    loadEvangelistsForAttendance();
}

function openAnnouncementModal() {
    if (currentUser.role !== 'coordinator') {
        showNotification('Action non autorisée', 'error');
        return;
    }
    document.getElementById('announcementModal').classList.remove('hidden');
    document.getElementById('announcementForm').reset();
}

function closeModals() {
    document.querySelectorAll('[id$="Modal"]').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Soumissions de formulaires
async function handleSoulSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        const soulData = {
            name: formData.get('name') || document.getElementById('soulName').value,
            phone: formData.get('phone') || document.getElementById('soulPhone').value,
            address: formData.get('address') || document.getElementById('soulAddress').value,
            group: formData.get('group') || document.getElementById('soulGroup').value,
            evangelist: formData.get('evangelist') || document.getElementById('soulEvangelist').value,
            notes: formData.get('notes') || document.getElementById('soulNotes').value,
            createdAt: serverTimestamp(),
            createdBy: currentUser.username
        };
        
        // Upload photo si présente
        const photoFile = document.getElementById('soulPhoto').files[0];
        if (photoFile) {
            const photoRef = ref(storage, `souls/${Date.now()}_${photoFile.name}`);
            const photoSnapshot = await uploadBytes(photoRef, photoFile);
            soulData.photo = await getDownloadURL(photoSnapshot.ref);
        }
        
        // Ajouter à Firestore
        await addDoc(collection(db, 'souls'), soulData);
        
        closeModals();
        showNotification('Âme ajoutée avec succès!', 'success');
        
        // Recharger les données si on est sur la page des âmes
        if (currentPage === 'souls') {
            await loadSoulsData();
        }
        
    } catch (error) {
        console.error('Erreur ajout âme:', error);
        showNotification('Erreur lors de l\'ajout de l\'âme', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEvangelistSubmit(e) {
    e.preventDefault();
    
    if (currentUser.role !== 'coordinator') {
        showNotification('Action non autorisée', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        const username = formData.get('username') || document.getElementById('evangelistUsername').value;
        
        // Vérifier si l'utilisateur existe déjà
        const userRef = doc(db, 'users', username);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            showNotification('Ce nom d\'utilisateur existe déjà', 'error');
            return;
        }
        
        const evangelistData = {
            username: username,
            password: formData.get('password') || document.getElementById('evangelistPassword').value,
            fullName: formData.get('fullName') || document.getElementById('evangelistName').value,
            phone: formData.get('phone') || document.getElementById('evangelistPhone').value,
            email: formData.get('email') || document.getElementById('evangelistEmail').value,
            role: formData.get('role') || document.getElementById('evangelistRole').value,
            group: formData.get('group') || document.getElementById('evangelistGroup').value,
            address: formData.get('address') || document.getElementById('evangelistAddress').value,
            createdAt: serverTimestamp(),
            createdBy: currentUser.username
        };
        
        // Upload photo si présente
        const photoFile = document.getElementById('evangelistPhoto').files[0];
        if (photoFile) {
            const photoRef = ref(storage, `evangelists/${Date.now()}_${photoFile.name}`);
            const photoSnapshot = await uploadBytes(photoRef, photoFile);
            evangelistData.avatar = await getDownloadURL(photoSnapshot.ref);
        }
        
        // Ajouter à Firestore
        await setDoc(userRef, evangelistData);
        
        closeModals();
        showNotification('Évangéliste ajouté avec succès!', 'success');
        
        // Recharger les données si on est sur la page des évangélistes
        if (currentPage === 'evangelists') {
            await loadEvangelistsData();
        }
        
    } catch (error) {
        console.error('Erreur ajout évangéliste:', error);
        showNotification('Erreur lors de l\'ajout de l\'évangéliste', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleReportSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        const reportData = {
            date: formData.get('date') || document.getElementById('reportDate').value,
            location: formData.get('location') || document.getElementById('reportLocation').value,
            evangelist: formData.get('evangelist') || document.getElementById('reportEvangelist').value,
            newConversions: parseInt(formData.get('newConversions') || document.getElementById('reportNewConversions').value) || 0,
            followUps: parseInt(formData.get('followUps') || document.getElementById('reportFollowUps').value) || 0,
            biblesDistributed: parseInt(formData.get('biblesDistributed') || document.getElementById('reportBiblesDistributed').value) || 0,
            description: formData.get('description') || document.getElementById('reportDescription').value,
            challenges: formData.get('challenges') || document.getElementById('reportChallenges').value,
            testimonies: formData.get('testimonies') || document.getElementById('reportTestimonies').value,
            createdAt: serverTimestamp(),
            createdBy: currentUser.username
        };
        
        // Récupérer les âmes sélectionnées
        const selectedSouls = [];
        document.querySelectorAll('#reportSouls input[type="checkbox"]:checked').forEach(checkbox => {
            selectedSouls.push(checkbox.value);
        });
        reportData.soulsEncountered = selectedSouls;
        
        // Ajouter à Firestore
        await addDoc(collection(db, 'reports'), reportData);
        
        closeModals();
        showNotification('Rapport ajouté avec succès!', 'success');
        
        // Recharger les données si on est sur la page des rapports
        if (currentPage === 'reports') {
            await loadReportsData();
        }
        
    } catch (error) {
        console.error('Erreur ajout rapport:', error);
        showNotification('Erreur lors de l\'ajout du rapport', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleDocumentSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        const file = document.getElementById('documentFile').files[0];
        
        if (!file) {
            showNotification('Veuillez sélectionner un fichier', 'error');
            return;
        }
        
        // Upload du fichier
        const fileRef = ref(storage, `documents/${Date.now()}_${file.name}`);
        const fileSnapshot = await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileSnapshot.ref);
        
        const documentData = {
            name: formData.get('name') || document.getElementById('documentName').value,
            description: formData.get('description') || document.getElementById('documentDescription').value,
            url: fileUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            createdAt: serverTimestamp(),
            createdBy: currentUser.username
        };
        
        // Ajouter à Firestore
        await addDoc(collection(db, 'documents'), documentData);
        
        closeModals();
        showNotification('Document ajouté avec succès!', 'success');
        
        // Recharger les données si on est sur la page de la bibliothèque
        if (currentPage === 'library') {
            await loadLibraryData();
        }
        
    } catch (error) {
        console.error('Erreur ajout document:', error);
        showNotification('Erreur lors de l\'ajout du document', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAttendanceSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const date = document.getElementById('attendanceDate').value;
        const presentEvangelists = [];
        
        document.querySelectorAll('#attendanceList input[type="checkbox"]:checked').forEach(checkbox => {
            presentEvangelists.push(checkbox.value);
        });
        
        const attendanceData = {
            date: date,
            presentEvangelists: presentEvangelists,
            createdAt: serverTimestamp(),
            createdBy: currentUser.username
        };
        
        // Ajouter à Firestore
        await addDoc(collection(db, 'attendance'), attendanceData);
        
        closeModals();
        showNotification('Présences enregistrées avec succès!', 'success');
        
        // Recharger les données si on est sur la page des présences
        if (currentPage === 'attendance') {
            await loadAttendanceData();
        }
        
    } catch (error) {
        console.error('Erreur enregistrement présences:', error);
        showNotification('Erreur lors de l\'enregistrement des présences', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    
    if (currentUser.role !== 'coordinator') {
        showNotification('Action non autorisée', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        const announcementData = {
            title: formData.get('title') || document.getElementById('announcementTitle').value,
            message: formData.get('message') || document.getElementById('announcementMessage').value,
            priority: formData.get('priority') || document.getElementById('announcementPriority').value,
            createdAt: serverTimestamp(),
            createdBy: currentUser.username
        };
        
        // Ajouter à Firestore
        await addDoc(collection(db, 'announcements'), announcementData);
        
        closeModals();
        showNotification('Annonce publiée avec succès!', 'success');
        
        // Recharger les annonces
        await loadAnnouncements();
        
    } catch (error) {
        console.error('Erreur publication annonce:', error);
        showNotification('Erreur lors de la publication de l\'annonce', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        const updateData = {
            fullName: formData.get('fullName') || document.getElementById('profileFullName').value,
            email: formData.get('email') || document.getElementById('profileEmail').value,
            phone: formData.get('phone') || document.getElementById('profilePhone').value,
            address: formData.get('address') || document.getElementById('profileAddress').value,
            group: formData.get('group') || document.getElementById('profileGroup').value,
        };
        
        // Mettre à jour le mot de passe s'il est fourni
        const newPassword = formData.get('newPassword') || document.getElementById('profileNewPassword').value;
        if (newPassword) {
            updateData.password = newPassword;
        }
        
        // Mettre à jour dans Firestore
        const userRef = doc(db, 'users', currentUser.username);
        await updateDoc(userRef, updateData);
        
        // Mettre à jour l'utilisateur actuel
        Object.assign(currentUser, updateData);
        
        showNotification('Profil mis à jour avec succès!', 'success');
        
        // Recharger les données utilisateur
        loadUserData();
        
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        showNotification('Erreur lors de la mise à jour du profil', 'error');
    } finally {
        showLoading(false);
    }
}

// Fonctions utilitaires
async function loadGroupsForSelect(selectId) {
    try {
        const groupsSnapshot = await getDocs(collection(db, 'groups'));
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        // Garder la première option
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        
        groupsSnapshot.forEach(doc => {
            const group = doc.data();
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur chargement groupes:', error);
    }
}

async function loadGroupsForFilter(selectId) {
    try {
        const groupsSnapshot = await getDocs(collection(db, 'groups'));
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        select.innerHTML = '<option value="">Tous les groupes</option>';
        
        groupsSnapshot.forEach(doc => {
            const group = doc.data();
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur chargement groupes pour filtre:', error);
    }
}

async function loadEvangelistsForSelect(selectId) {
    try {
        const evangelistsQuery = query(collection(db, 'users'), where('role', '!=', 'coordinator'));
        const evangelistsSnapshot = await getDocs(evangelistsQuery);
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        // Garder la première option
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        
        evangelistsSnapshot.forEach(doc => {
            const evangelist = doc.data();
            const option = document.createElement('option');
            option.value = evangelist.username;
            option.textContent = evangelist.fullName;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur chargement évangélistes:', error);
    }
}

async function loadSoulsForReport() {
    try {
        const soulsSnapshot = await getDocs(collection(db, 'souls'));
        const container = document.getElementById('reportSouls');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (soulsSnapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Aucune âme disponible</p>';
            return;
        }
        
        soulsSnapshot.forEach(doc => {
            const soul = doc.data();
            const checkbox = document.createElement('div');
            checkbox.className = 'flex items-center space-x-2';
            checkbox.innerHTML = `
                <input type="checkbox" id="soul_${doc.id}" value="${doc.id}" class="rounded">
                <label for="soul_${doc.id}" class="text-sm">${soul.name} (${soul.group})</label>
            `;
            container.appendChild(checkbox);
        });
        
    } catch (error) {
        console.error('Erreur chargement âmes pour rapport:', error);
    }
}

async function loadEvangelistsForAttendance() {
    try {
        const evangelistsQuery = query(collection(db, 'users'), where('role', '!=', 'coordinator'));
        const evangelistsSnapshot = await getDocs(evangelistsQuery);
        const container = document.getElementById('attendanceList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        evangelistsSnapshot.forEach(doc => {
            const evangelist = doc.data();
            const checkbox = document.createElement('div');
            checkbox.className = 'flex items-center space-x-2';
            checkbox.innerHTML = `
                <input type="checkbox" id="evangelist_${doc.id}" value="${evangelist.username}" class="rounded">
                <label for="evangelist_${doc.id}" class="text-sm">${evangelist.fullName}</label>
            `;
            container.appendChild(checkbox);
        });
        
    } catch (error) {
        console.error('Erreur chargement évangélistes pour présence:', error);
    }
}

async function loadAnnouncements() {
    try {
        const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const announcementsSnapshot = await getDocs(announcementsQuery);
        const container = document.getElementById('announcementsList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (announcementsSnapshot.empty) {
            container.innerHTML = '<p class="text-gray-500">Aucune annonce</p>';
            return;
        }
        
        announcementsSnapshot.forEach(doc => {
            const announcement = doc.data();
            const item = document.createElement('div');
            item.className = `p-4 border-l-4 rounded ${
                announcement.priority === 'urgent' ? 'border-red-500 bg-red-50' :
                announcement.priority === 'important' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
            }`;
            item.innerHTML = `
                <h4 class="font-medium">${announcement.title}</h4>
                <p class="text-sm text-gray-600 mt-1">${announcement.message}</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-500">${formatDate(announcement.createdAt)}</span>
                    <button onclick="deleteAnnouncement('${doc.id}')" class="text-red-600 hover:text-red-800 text-xs">
                        Supprimer
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Erreur chargement annonces:', error);
    }
}

// Fonctions de filtrage
function filterSouls() {
    const searchTerm = document.getElementById('searchSouls').value.toLowerCase();
    const groupFilter = document.getElementById('filterSoulsGroup').value;
    
    const rows = document.querySelectorAll('#soulsTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const phone = row.cells[2].textContent.toLowerCase();
        const group = row.cells[3].textContent;
        
        const matchesSearch = name.includes(searchTerm) || phone.includes(searchTerm);
        const matchesGroup = !groupFilter || group === groupFilter;
        
        row.style.display = matchesSearch && matchesGroup ? '' : 'none';
    });
}

function filterReports() {
    const searchTerm = document.getElementById('searchReports').value.toLowerCase();
    const dateFilter = document.getElementById('filterReportsDate').value;
    
    // Implémentation du filtrage des rapports
    console.log('Filtrage rapports:', searchTerm, dateFilter);
}

function filterDocuments() {
    const searchTerm = document.getElementById('searchDocuments').value.toLowerCase();
    
    const items = document.querySelectorAll('#documentsList .file-item');
    
    items.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        const description = item.querySelector('p').textContent.toLowerCase();
        
        const matches = name.includes(searchTerm) || description.includes(searchTerm);
        item.style.display = matches ? '' : 'none';
    });
}

// Fonctions d'actions
async function editSoul(soulId) {
    // Implémentation de l'édition d'âme
    console.log('Éditer âme:', soulId);
}

async function deleteSoul(soulId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette âme?')) return;
    
    try {
        await deleteDoc(doc(db, 'souls', soulId));
        showNotification('Âme supprimée avec succès', 'success');
        await loadSoulsData();
    } catch (error) {
        console.error('Erreur suppression âme:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

async function editEvangelist(evangelistId) {
    console.log('Éditer évangéliste:', evangelistId);
}

async function deleteEvangelist(evangelistId) {
    if (currentUser.role !== 'coordinator') {
        showNotification('Action non autorisée', 'error');
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet évangéliste?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', evangelistId));
        showNotification('Évangéliste supprimé avec succès', 'success');
        await loadEvangelistsData();
    } catch (error) {
        console.error('Erreur suppression évangéliste:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

async function viewReport(reportId) {
    console.log('Voir rapport:', reportId);
}

async function editReport(reportId) {
    console.log('Éditer rapport:', reportId);
}

async function deleteReport(reportId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport?')) return;
    
    try {
        await deleteDoc(doc(db, 'reports', reportId));
        showNotification('Rapport supprimé avec succès', 'success');
        await loadReportsData();
    } catch (error) {
        console.error('Erreur suppression rapport:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

async function downloadDocument(url) {
    window.open(url, '_blank');
}

async function deleteDocument(documentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document?')) return;
    
    try {
        await deleteDoc(doc(db, 'documents', documentId));
        showNotification('Document supprimé avec succès', 'success');
        await loadLibraryData();
    } catch (error) {
        console.error('Erreur suppression document:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

async function deleteAnnouncement(announcementId) {
    if (currentUser.role !== 'coordinator') return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce?')) return;
    
    try {
        await deleteDoc(doc(db, 'announcements', announcementId));
        showNotification('Annonce supprimée avec succès', 'success');
        await loadAnnouncements();
    } catch (error) {
        console.error('Erreur suppression annonce:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Fonctions d'interface
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('hidden');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const icon = document.querySelector('#darkModeToggle i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
}

async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        showLoading(true);
        
        const avatarRef = ref(storage, `avatars/${currentUser.username}_${Date.now()}`);
        const snapshot = await uploadBytes(avatarRef, file);
        const avatarUrl = await getDownloadURL(snapshot.ref);
        
        // Mettre à jour dans Firestore
        const userRef = doc(db, 'users', currentUser.username);
        await updateDoc(userRef, { avatar: avatarUrl });
        
        // Mettre à jour l'interface
        currentUser.avatar = avatarUrl;
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('profileAvatar').src = avatarUrl;
        
        showNotification('Photo de profil mise à jour!', 'success');
        
    } catch (error) {
        console.error('Erreur upload avatar:', error);
        showNotification('Erreur lors de la mise à jour de la photo', 'error');
    } finally {
        showLoading(false);
    }
}

function printReports() {
    window.print();
}

function exportSouls() {
    // Implémentation de l'export des âmes
    showNotification('Fonctionnalité d\'export en cours de développement', 'info');
}

// Fonctions utilitaires
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification p-4 rounded-lg shadow-lg max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${
                type === 'success' ? 'check-circle' :
                type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' :
                'info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showLoading(show) {
    isLoading = show;
    // Implémentation de l'indicateur de chargement
}

// Fermer les menus en cliquant ailleurs
document.addEventListener('click', (e) => {
    if (!e.target.closest('#userMenuBtn') && !e.target.closest('#userMenu')) {
        document.getElementById('userMenu').classList.add('hidden');
    }
});

// Fermer les modales en cliquant sur le backdrop
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        closeModals();
    }
});

console.log('🔥 Firebase configuré et application initialisée');