# Plum Cave
A cloud backup solution that employs the "ChaCha20 + Serpent-256 CBC + HMAC-SHA3-512" authenticated encryption scheme for data encryption and ML-KEM-1024 for quantum-resistant key exchange.

The app is fully localized into:

✓ English

✓ Hebrew

✓ Argentinian Spanish

# Firestore Rules
    
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
    
        // === 1. /data/{userEmail}/backups, limit to 10 backups ===
        match /data/{userEmail}/backups/{backupId} {
          allow get, list: if resource.data.isPublic == true
                           || (request.auth != null && request.auth.token.email == userEmail);
    
          allow update: if resource.data.isPublic == true
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['downloads'])
            && request.resource.data.downloads == resource.data.downloads + 1;
    
          allow create: if request.auth != null
            && request.auth.token.email == userEmail
            && (
              !exists(/databases/$(database)/documents/data/$(userEmail)/backups)
              || get(/databases/$(database)/documents/data/$(userEmail)/backups).list().size() < 10
            );
          allow update, delete: if request.auth != null && request.auth.token.email == userEmail;
        }
    
        // === 1b. Allow owner full access to all subcollections and docs under each backup ===
        match /data/{userEmail}/backups/{backupId}/{document=**} {
          allow read, write, delete: if request.auth != null && request.auth.token.email == userEmail;
          allow get, list: if exists(/databases/$(database)/documents/data/$(userEmail)/backups/$(backupId))
            && get(/databases/$(database)/documents/data/$(userEmail)/backups/$(backupId)).data.isPublic == true;
        }
    
        // === 2. /data/{userEmail}/receivedBackups/{document=**} ===
        match /data/{userEmail}/receivedBackups/{document=**} {
          allow write: if request.auth != null; // Any authenticated user can write
          allow read, delete: if request.auth != null && request.auth.token.email == userEmail; // Only owner can read/delete
        }
    
        // === 3. /data/{userEmail}/public/{document=**} ===
        match /data/{userEmail}/public/{document=**} {
          allow read: if true; // Anyone (even unauthenticated) can read
          allow write, delete: if request.auth != null && request.auth.token.email == userEmail; // Only owner can write/delete
        }
    
        // === 4. /data/{userEmail}/private/encrypted/projectInfo, limit to 2 folders ===
        match /data/{userEmail}/private/encrypted/projectInfo/{projectId} {
          allow create: if request.auth != null && request.auth.token.email == userEmail
            && (
              !exists(/databases/$(database)/documents/data/$(userEmail)/private/encrypted/projectInfo)
              || get(/databases/$(database)/documents/data/$(userEmail)/private/encrypted/projectInfo).list().size() < 2
            );
          allow read, update, delete: if request.auth != null && request.auth.token.email == userEmail;
        }
    
        // === 5. /data/{userEmail}/private/encrypted/projectInfo/{projectId}/backups, limit to 5 per project ===
        match /data/{userEmail}/private/encrypted/projectInfo/{projectId}/backups/{backupId} {
          allow create: if request.auth != null && request.auth.token.email == userEmail
            && (
              !exists(/databases/$(database)/documents/data/$(userEmail)/private/encrypted/projectInfo/$(projectId)/backups)
              || get(/databases/$(database)/documents/data/$(userEmail)/private/encrypted/projectInfo/$(projectId)/backups).list().size() < 5
            );
          allow read, update, delete: if request.auth != null && request.auth.token.email == userEmail;
        }
    
        // === 6. /data/{userEmail}/private/{document=**} ===
        match /data/{userEmail}/private/{document=**} {
          allow read, write, delete: if request.auth != null && request.auth.token.email == userEmail;
        }
    
        // === 7. /data/{userEmail}/private root ===
        match /data/{userEmail}/private {
          allow read: if request.auth != null;
          allow write, delete: if request.auth != null && request.auth.token.email == userEmail;
        }
    
        // === 8. Default deny ===
        match /{document=**} {
          allow read, write, delete: if false;
        }
      }
    }
