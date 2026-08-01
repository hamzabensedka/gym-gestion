# Gym Gestion

MVP de gestion de salle de sport pour petites salles en Tunisie. Mobile-first, rapide, bilingue (Français / العربية).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **TailwindCSS v4**
- **PostgreSQL + Prisma**
- **lucide-react** (icônes)
- Auth email/mot de passe (session JWT en cookie httpOnly)

## Fonctionnalités

### Cœur MVP
- **Membres** : CRUD complet, recherche, filtres (tous / actifs / expirés / bientôt), statut actif/expiré automatique, mise en évidence des expirés.
- **Abonnements** : formules 1 / 3 / 6 / 12 mois, calcul automatique de la date de fin, renouvellement en un clic (+1/+3/+6/+12 mois).
- **Check-in QR** : scanner caméra avec cadre de visée, retour plein écran (vert/rouge), son + vibration, refus si abonnement expiré.
- **Check-in manuel** : recherche par nom ou téléphone avec gros boutons (réception).
- **Présence** : check-ins du jour, total hebdomadaire, membres les plus actifs, membres inactifs (7+ jours), **heures de pointe** (7 jours).
- **Tableau de bord** : revenu mensuel estimé, encaissements manuels, membres actifs/expirés, présents du jour, répartition des membres, graphe de fréquentation 7 jours, **heure de pointe**, tendances, abonnements à renouveler, activité récente, actions du jour.
- **Paiements manuels** : enregistrement par l'admin (montant, mode, date, note), historique par membre, **export CSV** des paiements.
- **Gel d'abonnement** : mise en pause temporaire avec dates de début/fin.
- **Charges & Boissons** : factures eau/électricité/gaz (tous plans) ; stock et ventes de boissons (Growth/Pro) ; totaux du mois sur le tableau de bord admin.

### Extras inclus
- **Bilingue Français / Arabe** avec bascule instantanée et mise en page **RTL** complète.
- **Carte membre QR** imprimable + téléchargeable.
- **Relances WhatsApp** pré-remplies (membres expirés / inactifs / expirant) + **rappels groupés** en file (wa.me) — adapté à la Tunisie.
- **Historique des visites** par membre + statistiques (total, ce mois-ci, dernière visite).
- **Export CSV** des membres et des paiements (compatible Excel, accents UTF-8).
- **Gestion d'équipe** : l'admin crée/supprime des comptes (Admin / Réception).
- **Réglages** : nom & adresse de la salle, changement de mot de passe, langue.
- Devise **TND**, format **24h**, interface mobile-first avec navigation par onglets.

## Rôles
- **Admin / Propriétaire** : accès complet (membres, finances, stats, équipe, réglages).
- **Réception (Staff)** : check-in QR et manuel uniquement.

## Plans SaaS

Chaque salle a un **plan** (Starter / Growth / Pro) et un **mode d'accès** (`DESK_ONLY`, `KIOSK`, `BADGE_PC_EXTENSION`, …) qui débloquent les bonnes fonctionnalités sans remplacer le système existant.

| Plan | Cible | Fonctionnalités clés |
|------|-------|----------------------|
| **Starter** | Réception seule | Membres, abonnements, check-in QR/manuel (2 staff max) |
| **Growth** | Kiosk / accès souple | + export CSV membres/paiements, kiosk self check-in (5 staff) |
| **Pro** | Badges + logiciel PC | + numéro de badge, export liste autorisée pour la porte (10 staff) |

**Pro — export porte :** les admins téléchargent la liste des badges autorisés via `GET /api/access/export` (CSV `access-allowed.csv`).

Spécification complète : [docs/superpowers/specs/2026-08-01-saas-plans-access-modes-design.md](docs/superpowers/specs/2026-08-01-saas-plans-access-modes-design.md)

## Démarrage local

### Base de données

PostgreSQL local sur le port `5432`.

1. Créer la base (une seule fois) :

```powershell
$env:PGPASSWORD='0000'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE gym_gestion;"
```

2. Copier la config :

```bash
copy .env.example .env
```

3. Installer, créer les tables et les données de démo :

```bash
npm install
npm run db:push
npm run db:seed
```

4. Lancer l'application :

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### Alternative Docker

```bash
docker compose up -d
npm run db:push
npm run db:seed
```

## Comptes de démo

- Admin : `admin@gym.local` / `admin123`
- Réception : `staff@gym.local` / `staff123`

## Variables d'environnement

- `DATABASE_URL` — chaîne de connexion PostgreSQL.
- `SESSION_SECRET` — secret (≥ 32 caractères) pour signer les sessions JWT.

## Architecture (extensible)

Le code est structuré pour ajouter plus tard sans refonte : application mobile membres, check-in WhatsApp, paiements, multi-salles, analytics IA. Le modèle de données inclut déjà `gymId` partout pour le multi-salles.
