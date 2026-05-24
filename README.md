# Flip 7

Adaptation web responsive du jeu de cartes **Flip 7** (Eric Olsen, The Op).

## Stack

- **Vue 3** (`<script setup>`) + **TypeScript** strict
- **Vite** (build/dev) + **PWA** (jouable hors-ligne, installable)
- **Pinia** (état global) + **pinia-plugin-persistedstate** (reprise de partie)
- **Vue Router**
- **Tailwind CSS v4**
- **Vitest** + **@vue/test-utils** (tests unitaires du moteur de jeu)
- **ESLint** + **Prettier**

## Architecture

Découpée en 4 couches (Clean Architecture), du plus stable au plus volatil :

```
src/
├── domain/             # Entités, règles pures du jeu (aucune dépendance externe)
├── application/        # Cas d'usage (orchestrent le domaine) + ports
├── infrastructure/     # Adapters (persistance localStorage, etc.)
└── presentation/       # Vue, Pinia, Tailwind, assets
```

Le `domain/` est testable sans Vue. Les règles métier ne dépendent jamais des frameworks.

## Scripts

```bash
npm run dev          # Lancer le serveur de dev
npm run build        # Build de production
npm run preview      # Prévisualiser le build
npm run test         # Lancer les tests une fois
npm run test:watch   # Tests en mode watch
npm run lint         # Linter le code
npm run format       # Formater le code
npm run typecheck    # Vérification des types
```

## V1 - Fonctionnement

Un seul téléphone, un seul gestionnaire de partie : on saisit les joueurs, puis on enchaîne les manches. L'app gère la pioche, les cartes spéciales, le scoring et la fin de partie.
