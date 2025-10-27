# CECNE - Centre d'Évangélisation

Application web complète pour la gestion d'évangélisation avec Firebase.

## 🔥 Configuration Firebase

L'application utilise Firebase pour le stockage des données et l'authentification. La configuration est déjà incluse dans le code.

### Configuration Firebase requise

```javascript
// firebase-config.js contient déjà cette configuration
const firebaseConfig = {
    apiKey: "AIzaSyAaegtkBUd-fk9F0yokbNGxgRpF57E0dlE",
    authDomain: "cecne-768ff.firebaseapp.com",
    projectId: "cecne-768ff",
    storageBucket: "cecne-768ff.firebasestorage.app",
    messagingSenderId: "295270043435",
    appId: "1:295270043435:web:357f8fafdeb5671d51bf6e"
};
```

## 🚀 Installation

1. **Téléchargez les fichiers** :
   - `index.html` - Interface utilisateur complète
   - `firebase-config.js` - Configuration Firebase et logique métier

2. **Servez l'application** via un serveur web local :
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: Node.js (live-server)
   npx live-server
   
   # Option 3: PHP
   php -S localhost:8000
   ```

3. **Ouvrez votre navigateur** et allez à `http://localhost:8000`

## 🔑 Connexion par défaut

L'application crée automatiquement un utilisateur administrateur :

- **Nom d'utilisateur** : `admin`
- **Mot de passe** : `admin123`
- **Rôle** : Coordinateur

## 📱 Fonctionnalités

### 🎯 Tableau de bord
- Statistiques en temps réel (âmes, évangélistes, rapports)
- Actions rapides
- Activités récentes
- Annonces (pour coordinateurs)

### 👥 Gestion des âmes
- Ajouter de nouvelles âmes converties
- Upload de photos
- Recherche et filtrage
- Export des données
- Suivi par évangéliste et groupe

### 👨‍💼 Gestion des évangélistes
- Création de comptes évangélistes
- Rôles : Évangéliste, Assistant, Coordinateur
- Gestion des permissions
- Photos de profil

### 📊 Rapports d'évangélisation
- Création de rapports détaillés
- Suivi des conversions et suivis
- Sélection des âmes rencontrées
- Impression des rapports

### 🗺️ Carte interactive
- Localisation des évangélistes et âmes
- Statistiques par commune de Kinshasa
- Vue d'ensemble géographique

### 💬 Système de chat
- Chat par groupe
- Messages en temps réel
- Interface intuitive

### 📚 Bibliothèque de documents
- Upload de fichiers
- Organisation par catégories
- Téléchargement et partage

### 📅 Suivi des présences
- Marquer les présences
- Statistiques de participation
- Historique détaillé

### 👤 Gestion du profil
- Modification des informations personnelles
- Upload de photo de profil
- Changement de mot de passe

## 🔐 Rôles et permissions

### Coordinateur
- Accès complet à toutes les fonctionnalités
- Gestion des évangélistes
- Publication d'annonces
- Vue globale des données

### Assistant
- Gestion des âmes et rapports
- Vue limitée aux données de son groupe
- Pas de gestion d'évangélistes

### Évangéliste
- Ajout d'âmes converties
- Création de rapports personnels
- Accès limité à ses propres données

## 🛠️ Configuration Firebase (pour développeurs)

### Firestore Database

Créez les collections suivantes dans Firestore :

```
/users/{userId}
/souls/{soulId}
/reports/{reportId}
/groups/{groupId}
/documents/{documentId}
/attendance/{attendanceId}
/announcements/{announcementId}
```

### Règles Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // All other collections
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Règles Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🎨 Interface utilisateur

- **Design moderne** avec Tailwind CSS
- **Responsive** pour mobile et desktop
- **Mode sombre** disponible
- **Animations fluides**
- **Interface en français**

## 🔧 Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript ES6+
- **Framework CSS** : Tailwind CSS
- **Icônes** : Font Awesome
- **Backend** : Firebase (Firestore, Storage, Auth)
- **Cartes** : Simulation pour Kinshasa, RDC

## 📋 Données par défaut

L'application crée automatiquement :

### Groupes
- Centre-ville
- Gombe
- Kalamu
- Kinshasa
- Ngiri-Ngiri

### Utilisateur admin
- Accès complet
- Rôle coordinateur
- Groupe Centre-ville

## 🐛 Dépannage

### Problème de connexion
- Vérifiez que Firebase est correctement configuré
- Utilisez les identifiants par défaut : admin/admin123

### Erreurs de chargement
- Assurez-vous d'utiliser un serveur web (pas file://)
- Vérifiez la connexion internet pour Firebase

### Problèmes d'upload
- Vérifiez les règles Firebase Storage
- Formats supportés : images (jpg, png, gif)

### Console du navigateur
Ouvrez les outils de développement (F12) pour voir les erreurs détaillées.

## 📞 Support

Pour toute question ou problème :
1. Vérifiez la console du navigateur pour les erreurs
2. Assurez-vous que Firebase est correctement configuré
3. Utilisez les identifiants par défaut pour tester

## 🔄 Mise à jour

L'application se met à jour automatiquement avec les dernières données Firebase. Aucune maintenance manuelle requise.

## 📱 Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions récentes)
- **Appareils** : Desktop, tablettes, smartphones
- **Connexion** : Internet requis pour Firebase

## 🌍 Localisation

- Interface entièrement en français
- Dates au format français (DD/MM/YYYY)
- Adaptée pour Kinshasa, RDC

---

**CECNE - Centre d'Évangélisation**  
*Application de gestion d'évangélisation moderne et complète* 
