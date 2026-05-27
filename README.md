# 🎮 Flip 7

Une adaptation web responsive du jeu de cartes **Flip 7** (créé par Eric Olsen, The Op Games).

> **Jouable entièrement sur un seul téléphone.** Parfait pour les soirées jeux entre amis et en famille, de 2 à 18 joueurs !

## 📱 Accès en ligne

L'application est directement accessible via GitHub Pages :  
👉 **[Flip 7 - Jouer maintenant](https://mart1n-s.github.io/FliipSeven/#/)**

> Compatible PWA : installable sur l'écran d'accueil de votre téléphone, fonctionne hors-ligne.

## 🎯 Principe du jeu

Flip 7 est un jeu de **push-your-luck** : chaque manche, les joueurs piochent des cartes tour à tour pour accumuler des points - mais trop piocher, c'est risquer de perdre tout ce qu'on a gagné.

### Déroulement

1. **Piocher ou s'arrêter.** À chaque tour, le joueur actif choisit de piocher une nouvelle carte ou de se coucher pour sécuriser ses points.
2. **Cartes numériques (0–12).** Chaque carte posée ajoute sa valeur au score de la manche. Tirer un chiffre déjà présent devant soi → **Éliminé** (score 0 pour la manche).
3. **Cartes modificatrices.** Des bonus viennent booster le score : `+2`, `+4`, `+6`, `+8`, `+10` (additifs) et `×2` (multiplicatif sur la somme des chiffres).
4. **Cartes action.** Perturbent la partie des autres :
   - **Gel** – stoppe la cible pour le reste de la manche et annule ses points : elle marque 0 pour ce tour.
   - **Trois à la Suite** – la cible doit piocher 3 cartes supplémentaires, qu'elle le veuille ou non.
   - **Deuxième Chance** – protège d'une élimination imminente.
5. **Flip 7.** Collecter 7 cartes numériques différentes déclenche le Flip 7 et accorde un bonus de **+15 points**.
6. **Victoire.** La partie se termine quand un joueur franchit **200 points** en cumul. Le joueur avec le score le plus élevé gagne.

## 🛠️ Stack technique

| Catégorie        | Technologie                                             |
| ---------------- | ------------------------------------------------------- |
| **Frontend**     | Vue 3 (`<script setup>`) + TypeScript (strict mode)     |
| **Build**        | Vite + PWA (installable, mode hors-ligne)               |
| **État**         | Pinia + pinia-plugin-persistedstate (reprise de partie) |
| **Routing**      | Vue Router                                              |
| **Styles**       | Tailwind CSS v4 + Geist / Geist Mono                    |
| **Utilitaires**  | VueUse                                                  |
| **Tests**        | Vitest + @vue/test-utils                                |
| **Qualité code** | ESLint + Prettier                                       |

## 📦 Architecture

Le projet suit une **Clean Architecture** en 4 couches (du plus stable au plus volatil) :

```
src/
├── domain/             # Entités, règles pures du jeu (0 dépendance externe)
├── application/        # Cas d'usage (orchestrent le domaine) + ports
├── infrastructure/     # Adapters (persistance, localStorage, etc.)
└── presentation/       # Vue, Pinia, Tailwind, assets
```

**Avantage clé** : Le moteur de jeu (domaine + cas d'usage) est entièrement testable sans Vue. Les règles ne dépendent jamais du framework.

## 🚀 Installation et lancement

### Prérequis

- Node.js 18+
- npm

### Installation locale

```bash
git clone https://github.com/Mart1n-S/FliipSeven.git
cd FliipSeven
npm install
```

### Lancer en développement

```bash
npm run dev
```

L'app sera accessible à `http://localhost:5173`.

### Build de production

```bash
npm run build
```

Génère un bundle optimisé dans le dossier `dist/`.

### Prévisualiser le build

```bash
npm run preview
```

## 🧪 Tests

```bash
# Exécuter les tests une fois
npm run test

# Mode watch (re-test automatique)
npm run test:watch

# Interface visuelle des tests
npm run test:ui
```

Les tests couvrent le moteur de jeu (`domain/`) et les cas d'usage (`application/`).

## 🔍 Qualité du code

```bash
npm run lint          # Linter ESLint
npm run lint:fix      # Correction automatique ESLint
npm run format        # Formatage Prettier
npm run format:check  # Vérification du formatage
npm run typecheck     # Vérification des types TypeScript
```

## ✅ Fonctionnalités V1

- Gestionnaire de partie complet sur un seul appareil (2–18 joueurs)
- Règles officielles Flip 7 : élimination, Gel, Trois à la Suite, Deuxième Chance, bonus Flip 7
- Scoring automatique (additifs, ×2, bonus Flip 7 +15 pts)
- Distribution automatique en début de manche
- Journal de partie pour résoudre les litiges (snapshots des mains par manche)
- Persistance de la partie (reprise après fermeture du navigateur)
- Thème clair / sombre (préférence OS détectée, persistée, sans flash au chargement)
- PWA : installable sur l'écran d'accueil, mode hors-ligne
- Design responsive mobile-first

## 🔜 Futures versions

- **Multijoueur en temps réel** – chaque joueur suit la partie sur son propre téléphone (WebSocket), sans avoir à se passer un seul appareil.

## 📝 Licence

Ce projet est une adaptation web du jeu Flip 7 créé par Eric Olsen (The Op Games).  
Tous les droits du jeu original appartiennent à leurs détenteurs respectifs.

---

**Amusez-vous bien au Flip 7 ! 🎲**
