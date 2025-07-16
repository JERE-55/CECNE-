# CECNE - Système de Gestion d'Évangélisation

Une application web moderne pour la gestion des activités d'évangélisation avec Firebase comme backend.

## 🚀 Fonctionnalités

- **Authentification sécurisée** avec Firebase Firestore
- **Gestion des âmes** converties avec photos et géolocalisation
- **Gestion d'équipe** avec différents rôles (Coordonnateur, Adjoint, Évangéliste)
- **Rapports d'évangélisation** détaillés avec suivi de fidélisation
- **Carte interactive** avec localisation des évangélistes et âmes
- **Bibliothèque de documents** avec upload vers Firebase Storage
- **Chat en temps réel** par groupe
- **Tableaux de bord** avec statistiques avancées
- **Mode sombre** automatique
- **Interface responsive** pour mobile et desktop

## 🔧 Installation

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd cecne-firebase
```

2. **Configuration Firebase**
   - Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
   - Activez Firestore Database
   - Activez Storage
   - Copiez la configuration dans `index.html` (déjà configurée)

3. **Règles Firestore**
   
   Ajoutez ces règles dans Firebase Console > Firestore Database > Règles :
   
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Evangelists collection
    match /evangelists/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Souls collection
    match /souls/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Reports collection
    match /reports/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Groups collection
    match /groups/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Settings collection
    match /settings/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow all other collections
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **Règles Storage**
   
   Ajoutez ces règles dans Firebase Console > Storage > Règles :
   
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

5. **Lancer l'application**
   
   Servez les fichiers via un serveur web local :
   
```bash
# Avec Python 3
python -m http.server 8000

# Avec Node.js
npx http-server

# Avec PHP
php -S localhost:8000
```

6. **Accéder à l'application**
   
   Ouvrez votre navigateur sur : `http://localhost:8000`

## 👤 Connexion par défaut

**Utilisateur administrateur :**
- **Nom d'utilisateur :** admin
- **Mot de passe :** admin123

Cet utilisateur sera créé automatiquement au premier lancement.

## 📱 Utilisation

### Rôles utilisateurs

1. **Coordonnateur**
   - Accès complet à toutes les fonctionnalités
   - Gestion des évangélistes et groupes
   - Statistiques globales
   - Création d'annonces

2. **Adjoint**
   - Gestion d'équipe limitée
   - Vue d'ensemble de son groupe
   - Création de rapports

3. **Évangéliste**
   - Ajout d'âmes et création de rapports
   - Vue limitée à son groupe
   - Gestion de son profil

### Fonctionnalités principales

#### 🏠 Dashboard
- Statistiques en temps réel
- Âmes et rapports récents
- Actions rapides
- Graphiques (pour coordinateurs)

#### 👥 Gestion des âmes
- Ajout avec photo et localisation automatique
- Suivi des conversions
- Historique des rencontres
- Filtrage par groupe

#### 📊 Rapports d'évangélisation
- Création de rapports détaillés
- Suivi de fidélisation
- Collaborateurs multiples
- Types d'intervention variés

#### 🗺️ Carte interactive
- Visualisation géographique
- Marqueurs différenciés par rôle
- Informations détaillées en popup
- Localisation de Kinshasa, RDC

#### 📚 Bibliothèque
- Upload de documents
- Catégorisation
- Téléchargement sécurisé
- Gestion des permissions

#### ⚙️ Administration
- Gestion des groupes
- Paramètres du site
- Gestion des utilisateurs
- Système de notifications

## 🔒 Sécurité

- **Authentification** : Système de connexion sécurisé
- **Permissions** : Contrôle d'accès basé sur les rôles
- **Validation** : Validation côté client et serveur
- **Soft delete** : Suppression logique des données

## 🌐 Technologies utilisées

- **Frontend :** HTML5, CSS3, JavaScript ES6+
- **Backend :** Firebase (Firestore, Storage, Auth)
- **UI Framework :** Tailwind CSS
- **Icônes :** Lucide Icons
- **Cartes :** Leaflet.js
- **Graphiques :** Chart.js

## 📱 Responsive Design

L'application est entièrement responsive et s'adapte aux :
- 📱 Mobiles (320px+)
- 📟 Tablettes (768px+)
- 💻 Ordinateurs (1024px+)

## 🔄 Sauvegarde automatique

Toutes les données sont automatiquement sauvegardées sur Firebase :
- **Temps réel** : Synchronisation instantanée
- **Hors ligne** : Cache local avec synchronisation
- **Sécurisé** : Chiffrement des données

## 🎨 Personnalisation

### Changer le nom et logo
1. Connectez-vous en tant que Coordonnateur
2. Cliquez sur l'icône ⚙️ dans l'en-tête
3. Modifiez le nom et uploadez un logo
4. Sauvegardez les modifications

### Ajouter des groupes
1. Allez dans Dashboard
2. Cliquez sur "Gérer les groupes"
3. Ajoutez un nouveau groupe
4. Assignez des évangélistes

## 🐛 Résolution de problèmes

### Problème de connexion
- Vérifiez votre configuration Firebase
- Contrôlez les règles Firestore
- Vérifiez la console du navigateur

### Erreurs d'upload
- Vérifiez les règles Storage
- Contrôlez la taille des fichiers (max 10MB)
- Formats supportés : jpg, png, pdf, doc, docx

### Données non sauvegardées
- Vérifiez votre connexion internet
- Rechargez la page
- Contrôlez les logs Firebase

## 📞 Support

Pour toute question ou problème :
1. Vérifiez la console du navigateur (F12)
2. Contrôlez les logs Firebase
3. Documentez l'erreur avec captures d'écran

## 📈 Évolutions futures

- [ ] Notifications push
- [ ] Exportation de données
- [ ] API REST
- [ ] Application mobile native
- [ ] Intégration calendrier
- [ ] Système de messagerie avancé

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**Développé avec ❤️ pour l'évangélisation moderne** 
