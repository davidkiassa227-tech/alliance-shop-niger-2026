# ALLIANCE SHOP

Boutique web responsive en HTML/CSS/JavaScript avec Firebase pour la synchronisation en ligne.

## 1. Mise en route

1. Créer un projet Firebase.
2. Activer Authentication > Email/Password.
3. Activer Firestore Database.
4. Activer Storage.
5. Copier la configuration Web Firebase dans `firebase-config.js`.
6. Publier les règles `firestore.rules` et `storage.rules`.
7. Héberger ce dossier sur Firebase Hosting, Vercel, Netlify ou GitHub Pages.

## 2. Première connexion propriétaire

Créer un utilisateur dans Firebase Authentication puis créer son document Firestore :

`users/{UID}`

Exemple :
```json
{
  "role": "owner",
  "permissions": {
    "products": true,
    "orders": true,
    "sales": true,
    "settings": true,
    "shipping": true,
    "promotions": true,
    "admin": true
  }
}
```

Le rôle `owner` est le niveau propriétaire.

## 3. HTTPS

Firebase Hosting, Vercel et Netlify fournissent une adresse HTTPS publique. Le client n'a rien à installer : il ouvre simplement le lien dans son navigateur.

## 4. WhatsApp

Le numéro principal par défaut est `+227 88665762`. Il peut être modifié dans les paramètres.

## 5. Données

Le catalogue et les paramètres publics sont synchronisés depuis Firestore. Les commandes, utilisateurs, ventes et permissions sont protégés par les règles Firestore.

## 6. Important pour la production

Avant une mise en production réelle :
- personnaliser les règles d'accès selon les rôles exacts ;
- créer une fonction serveur/Cloud Function pour décrémenter le stock de façon transactionnelle lors de la validation ;
- ne jamais mettre de mot de passe dans le code ;
- limiter les lectures de commandes aux utilisateurs autorisés ;
- mettre en place des notifications FCM ou email selon le besoin ;
- configurer les sauvegardes Firebase ;
- tester les règles Firestore avec Firebase Emulator Suite.

## 7. PWA

La PWA est optionnelle. Le site reste accessible normalement par son URL HTTPS.
