# Lucarne : analyse et tutoriel de déploiement sur VPS OVHcloud

Analyse du dépôt local et documentation officielle consultée le 16 novembre 2026.
Ce document prépare le déploiement : aucune commande ci-dessous n'a été exécutée
sur un VPS, aucune ressource n'a été commandée et aucune donnée n'a été modifiée.
Les fichiers `Dockerfile.vps`, `compose.vps.yml`, `Caddyfile.vps` et
`.env.vps.example` ont ensuite été ajoutés au projet pour
`lucarne-foot.duckdns.org`. Leur syntaxe Compose est validée, mais aucun
déploiement de cette configuration sur le VPS n'est encore confirmé. Les blocs
ci-dessous en expliquent le fonctionnement ; utiliser les fichiers fournis.

## 1. Réponse sur la base de données

**Oui, un export PostgreSQL complet conserve les informations présentes dans la
base au moment de l'export. Il faut ensuite le restaurer sur le VPS. Construire
ou transférer une image Docker ne transfère pas ces informations.**

| Élément | Contenu | Transféré avec une image Docker ? |
| --- | --- | --- |
| Image applicative Lucarne | Code, dépendances, client Prisma, interface construite | Oui |
| Image `postgres:17` | Logiciel PostgreSQL, sans les données de ton installation | Oui |
| Volume PostgreSQL | Tables, comptes, ligues, équipes, matchs, historique | Non |
| Export complet `pg_dump` | Schéma et données d'une base, dont l'historique Prisma | Fichier distinct à transférer |
| Volume des photos | Fichiers JPEG/PNG/WebP téléversés | Non |
| Variables et secrets | Mot de passe SQL, secret JWT, configuration | À configurer séparément |

Un dump complet conserve les UUID, relations, comptes et empreintes des mots de
passe : les comptes restaurés peuvent garder leurs mots de passe actuels. Un
nouveau secret JWT invalidera les anciens jetons ; il faudra se reconnecter.
`pg_dump` n'exporte pas les rôles PostgreSQL globaux : on recrée l'utilisateur SQL
sur le VPS. Ils sont distincts des rôles applicatifs présents dans les tables.
Voir les documentations de [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
et [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

Les URL des photos sont enregistrées en base, mais les fichiers sont sur disque.
Il faut donc sauvegarder **la base ET les photos**. Les éventuelles URL absolues
en `localhost` ou vers un ancien domaine devront être identifiées et adaptées
explicitement ; restaurer la base ne réécrit pas ces URL.

Les [volumes Docker](https://docs.docker.com/engine/storage/volumes/) survivent à
la suppression des conteneurs. En revanche, supprimer le volume supprime les
données : ne pas utiliser `docker compose down -v` sur une installation à conserver.
Un volume sur le VPS ne constitue pas une sauvegarde hors du VPS.

## 2. Ce que le projet possède déjà, et les points à préparer

Constats dans les fichiers actuels :

- Node.js 24, monorepo npm, React/Vite, Express, Prisma et PostgreSQL 17.
- En production, Express sert à la fois `/api/v1` et `apps/web/dist`, avec fallback
  des routes React : un seul service applicatif suffit.
- `VITE_API_URL=""` permet les appels API sur la même origine. Cette valeur doit
  être fournie pendant le build du Web.
- Le `Dockerfile` actuel installe les dépendances et génère Prisma ; il ne
  construit pas le Web et ne définit pas de commande de démarrage.
- `docker-compose.prod.yml` attend un réseau Traefik externe `proxy` et un fichier
  d'environnement hors du dépôt. Ce n'est pas une installation autonome.
- Le workflow staging appelle `traefik/deploy/js-project.sh` sur le VPS ; ce
  script est absent du dépôt. Le workflow ne suffit donc pas à déployer.
- `npm run db:migrate` utilise `prisma migrate deploy` : migrations versionnées,
  pas import de tes données locales.
- **`npm run db:seed` et `npm run seed` vident les tables applicatives.** Le code
  les interdit en production : ne pas contourner cette protection.
- Les photos locales sont dans `/var/lib/lucarne/player-photos` avec Compose.
  Le volume de développement s'appelle `bug_reports_data`, celui du Compose de
  production existant `player_photos` : ne pas déduire le contenu de leur nom.
- `/api/v1/health` indique que l'API répond, sans tester PostgreSQL.
- Le répertoire de travail contient de nombreuses modifications et des fichiers
  non suivis. Un clone Git ne contiendra que ce qui aura réellement été commité.

**Préparation de l'étape 1 :** Express accepte maintenant `TRUSTED_PROXY_IPS`,
une liste d'adresses IPv4/IPv6 exactes. Vide par défaut, elle ignore les en-têtes
transmis. Des tests HTTP vérifient la distinction entre clients, le refus d'un
proxy non déclaré et la résistance aux préfixes `X-Forwarded-For` falsifiés.
La configuration VPS ci-dessous attribue une IP fixe à Caddy et déclare seulement
cette IP. Vérifier également l'absence d'accès direct à l'API sur le VPS réel.
Ne pas simplement activer `trust proxy: true` ni autoriser tout le réseau privé.
Voir [le fonctionnement Express](https://expressjs.com/en/guide/behind-proxies/).

## 3. Architecture et choix proposés

```text
Navigateur → https://lucarne-exemple.duckdns.org
                         ↓ ports 80/443
                    Caddy : HTTPS
                         ↓ réseau Docker
             Lucarne : Express + Web construit, port 3310
                         ↓ réseau Docker interne
                    PostgreSQL 17

Stockages persistants : base PostgreSQL, photos, certificats Caddy
Sauvegardes : export PostgreSQL + archive photos + copie chiffrée hors VPS
```

Pour un premier VPS vierge, je propose **Docker Compose + Caddy**, qui automatise
HTTPS avec peu de configuration. C'est une alternative proposée au montage
Traefik existant, pas une décision déjà validée dans le projet. Si le VPS héberge
déjà Traefik, conserver ce proxy et compléter sa configuration plutôt que lancer
un second proxy sur 80/443.

Pour démarrer avec une petite audience : Ubuntu 24.04 LTS, architecture x86_64,
environ 2 vCPU, 4 Go de RAM et 40 Go de disque constituent une estimation de
départ, pas une capacité mesurée. Prévoir de la marge pour les builds, photos et
sauvegardes. Choisir l'offre disponible correspondante et vérifier prix TTC,
engagement, renouvellement et sauvegardes sur [OVHcloud VPS](https://www.ovhcloud.com/fr/vps/).
Le VPS reste payant ; le nom proposé et le certificat sont gratuits.

## 4. Une adresse gratuite avec DuckDNS

La solution proposée est un **sous-domaine gratuit**, par exemple
`lucarne-exemple.duckdns.org`, et non un domaine indépendant `lucarne.fr`.
Tu dépends de DuckDNS pour ce nom. Pour une identité pérenne et autonome,
prévoir ultérieurement un domaine acheté et renouvelé auprès d'un registrar.
[DuckDNS](https://www.duckdns.org/) propose ce service gratuitement.

1. Créer le VPS OVHcloud et noter son IPv4 publique.
2. Ouvrir DuckDNS et se connecter avec un fournisseur proposé.
3. Choisir un sous-domaine disponible ; les exemples de ce document ne sont pas réservés.
4. Dans DuckDNS, renseigner **l'IPv4 du VPS**, pas celle de ton ordinateur.
5. Enregistrer la mise à jour. Ne renseigner une IPv6 que si elle est correctement
   configurée sur ce VPS ; aucune entrée AAAA ne doit viser une autre machine.
6. Depuis PowerShell, vérifier :

   ```powershell
   Resolve-DnsName lucarne-exemple.duckdns.org -Type A
   Resolve-DnsName lucarne-exemple.duckdns.org -Type AAAA
   ```

L'enregistrement A doit pointer sur le VPS ; l'absence d'AAAA est acceptable.
Si l'IP du VPS reste inchangée, une mise à jour périodique n'est pas nécessaire.
Si elle change, actualiser DuckDNS. Une API existe pour automatiser cette étape :
[spécification officielle](https://www.duckdns.org/spec.jsp). Son token est un secret.

## 5. Préparer et sécuriser le VPS

Les commandes suivantes sont pour **Bash sur le VPS Ubuntu**, sauf les blocs
explicitement marqués PowerShell. Remplacer les valeurs d'exemple.

Depuis ton ordinateur :

```powershell
ssh UTILISATEUR_OVH@IP_DU_VPS
```

Utiliser l'utilisateur indiqué dans le courriel de livraison et `sudo` pour
l'administration. Installer une clé SSH et vérifier une seconde connexion avant
de désactiver l'authentification SSH par mot de passe. Le VPS est administré par
toi : mises à jour et sauvegardes restent à ta charge.
[Premiers pas OVHcloud](https://docs.ovhcloud.com/fr/guides/bare-metal-cloud/virtual-private-servers/starting-with-a-vps).

Sur le VPS :

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Ces commandes supposent le port SSH standard 22 ; adapter la règle si tu l'as
changé avant d'activer le pare-feu. Vérifier aussi les éventuels filtrages réseau
configurés chez OVHcloud.

Installer Docker Engine et le plugin Compose via le dépôt apt officiel en suivant
la [procédure Docker pour Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
Ne pas installer Docker Desktop sur le VPS. Puis vérifier :

```bash
sudo docker run --rm hello-world
sudo docker compose version
```

Docker peut contourner les règles UFW pour les ports publiés : la configuration
ci-dessous publie uniquement 80 et 443, jamais 5432, 3310 ou 3000.
[Explication Docker](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

## 6. Préparer le code et la configuration

Avant de cloner : sélectionner et commiter les modifications à livrer, y compris
les migrations et assets nécessaires ; vérifier un clone propre. Ne pas commiter
de secrets, de dump ou de photos privées. Les documents sous `docs/` sont ignorés
dans ce dépôt et ne sont pas transférés automatiquement par Git.

Sur le VPS, cloner avec un accès en lecture au dépôt :

```bash
mkdir -p "$HOME/services"
cd "$HOME/services"
git clone URL_DU_DEPOT lucarne
cd lucarne
git checkout SHA_DU_COMMIT_VALIDE
printf '\n.env.vps\n' >> .git/info/exclude
umask 077
nano .env.vps
```

Créer deux valeurs différentes avec `openssl rand -hex 32`, une pour le mot de
passe SQL, une pour le secret JWT. Reporter les résultats dans `.env.vps` :

```dotenv
DOMAIN=lucarne-exemple.duckdns.org
DB_NAME=lucarne
DB_USER=lucarne
DB_PASSWORD=REMPLACER_PAR_64_CARACTERES_HEXADECIMAUX
APP_SECRET=REMPLACER_PAR_UN_AUTRE_SECRET_HEXADECIMAL
```

Puis `chmod 600 .env.vps`. L'hexadécimal évite les caractères à encoder dans
l'URL PostgreSQL. `.dockerignore` exclut déjà les fichiers `.env.*` ; ne jamais
passer les vrais secrets de production comme arguments de build.

Créer `Dockerfile.vps` à la racine, pour construire le Web dans l'image :

```dockerfile
FROM node:24-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /usr/src/app
COPY . .
RUN npm ci
RUN npm run prisma:generate
RUN VITE_API_URL="" npm run build
ENV NODE_ENV=production
CMD ["npm", "start"]
```

Cette première version conserve les dépendances de développement : `tsx` et
Prisma CLI sont actuellement nécessaires au démarrage ou aux migrations. Ne pas
ajouter `npm ci --omit=dev` sans adapter le mode d'exécution. Une image plus
petite et un utilisateur non privilégié constituent une amélioration ultérieure.

Créer `compose.vps.yml` :

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.vps
    restart: unless-stopped
    environment:
      NODE_ENV: production
      APP_PORT: 3310
      APP_SECRET: ${APP_SECRET:?APP_SECRET requis}
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      CLIENT_URL: ""
      TRUSTED_PROXY_IPS: "172.30.50.2"
      UPLOAD_DIRECTORY: /var/lib/lucarne/player-photos
    volumes:
      - photos:/var/lib/lucarne/player-photos
    depends_on:
      db:
        condition: service_healthy
    networks: [front, backend]
  db:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:?DB_NAME requis}
      POSTGRES_USER: ${DB_USER:?DB_USER requis}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD requis}
    healthcheck:
      test: [CMD-SHELL, 'pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"']
      interval: 5s
      timeout: 5s
      retries: 20
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks: [backend]
  caddy:
    image: caddy:2
    restart: unless-stopped
    environment:
      DOMAIN: ${DOMAIN:?DOMAIN requis}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile.vps:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      front:
        ipv4_address: 172.30.50.2
networks:
  front:
    ipam:
      config:
        - subnet: 172.30.50.0/24
  backend:
    internal: true
volumes:
  postgres_data:
  photos:
  caddy_data:
  caddy_config:
```

Vérifier que le sous-réseau `172.30.50.0/24` n'entre pas en conflit avec les
réseaux du VPS, d'un VPN ou d'autres applications Docker. Si nécessaire, adapter
ensemble le sous-réseau, l'adresse fixe de Caddy et `TRUSTED_PROXY_IPS`.

Créer `Caddyfile.vps` :

```caddyfile
{$DOMAIN} {
    reverse_proxy web:3310
}
```

Caddy obtient et renouvelle les certificats si le DNS pointe correctement, les
ports sont accessibles et `/data` persiste. Aucun plugin DuckDNS n'est nécessaire
pour ce nom unique avec la validation HTTP/TLS ; pas de certificat wildcard ici.
[Documentation HTTPS Caddy](https://caddyserver.com/docs/automatic-https).

Utiliser systématiquement ce fichier Compose autonome, sans le fusionner avec
le Compose de développement. Pour raccourcir les commandes, définir cette
fonction dans chaque nouvelle session Bash :

```bash
dc() { sudo docker compose --env-file .env.vps -p lucarne -f compose.vps.yml "$@"; }
dc config --quiet
dc build web
dc up -d --wait db
```

Conserver `-p lucarne` évite de changer accidentellement les volumes en changeant
le nom du dossier. Le build doit réussir avant de toucher aux données.

## 7. Exporter les données locales et les photos

État du transfert préparé pendant l'accompagnement : l'utilisateur a confirmé
l'arrêt de l'application locale. La base PostgreSQL locale `lucarne`, sur le
port 5435, a été exportée dans `output/vps-transfer/lucarne.dump`. Les 22 photos
du répertoire local `C:\Users\robin\.lucarne\upload` sont archivées dans
`output/vps-transfer/photos.tar.gz`. Le dump original n'a pas été modifié.
Le script `adapt-photo-urls.sql` corrige uniquement, dans la copie cible, les
17 URL d'images `http://localhost:3310/api/v1/uploads/photos/...` vers
`https://lucarne-foot.duckdns.org/api/v1/uploads/photos/...`.
La restauration et cette correction ont été testées dans une base temporaire,
supprimée ensuite. Les comptes comparés sont 2 utilisateurs, 4 rôles, 2 ligues,
23 équipes, 639 joueuses, 1 membre du staff, 1 saison et 242 matchs.
Les 9 URL d'images externes sont conservées ; leur affichage reste soumis à la
politique CSP actuelle. Le dossier de transfert contient les empreintes SHA-256
et le bilan du test. Son transfert et la restauration sur le VPS restent à faire.

Procédure pour la configuration Docker locale actuelle. Si PostgreSQL tourne
hors Docker, utiliser son `pg_dump` 17 et sauvegarder le vrai `UPLOAD_DIRECTORY`.

Suspendre les écritures et téléversements pendant toute la sauvegarde. Depuis
**PowerShell, à la racine de ton projet local**, avec Docker Desktop démarré :

```powershell
$backupDirectory = 'D:\Sauvegardes\lucarne-transfert'
New-Item -ItemType Directory -Force -Path $backupDirectory
docker compose stop web
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/lucarne.dump'
docker compose cp db:/tmp/lucarne.dump "$backupDirectory\lucarne.dump"
docker compose cp web:/var/lib/lucarne/player-photos "$backupDirectory\photos"
tar.exe -czf "$backupDirectory\photos.tar.gz" -C "$backupDirectory\photos" .
Get-FileHash "$backupDirectory\lucarne.dump" -Algorithm SHA256
Get-FileHash "$backupDirectory\photos.tar.gz" -Algorithm SHA256
```

Vérifier le succès de **chaque commande** avant la suivante. Si aucun fichier n'a
jamais été téléversé et que le dossier n'existe pas, documenter ce constat et
omettre le transfert des photos. La copie via `docker compose cp` fonctionne
aussi avec le conteneur Web arrêté, tant qu'il n'a pas été supprimé.
Le dump est écrit dans le conteneur puis copié : on évite ainsi les problèmes de
redirection binaire des anciennes versions PowerShell.

Préparer le répertoire de transfert sur le VPS :

```bash
mkdir -p "$HOME/lucarne-transfer"
chmod 700 "$HOME/lucarne-transfer"
```

Depuis PowerShell, envoyer les fichiers via SSH :

```powershell
scp "$backupDirectory\lucarne.dump" "$backupDirectory\photos.tar.gz" UTILISATEUR_OVH@IP_DU_VPS:lucarne-transfer/
```

Comparer les empreintes avec `sha256sum` sur le VPS. Ne pas publier ces fichiers :
ils contiennent les données et les empreintes de mots de passe des comptes.
Pour une répétition de déploiement, on peut relancer le local après la copie avec
`docker compose start web`. Pour la bascule finale, garder la source en lecture
seule ou arrêtée jusqu'à validation du VPS : les nouvelles écritures locales
après l'export ne seraient pas présentes dans cet export.

## 8. Restaurer, migrer, puis démarrer

Sur le VPS, depuis le dossier du projet, avec la fonction `dc` définie.
**Cette restauration suppose une base cible neuve et vide.** Si elle contient
déjà des données à garder, arrêter ici et préparer une procédure distincte ; ne
pas ajouter aveuglément `--clean` et ne pas supprimer son volume.

```bash
dc cp "$HOME/lucarne-transfer/lucarne.dump" db:/tmp/lucarne.dump
dc exec -T db sh -c 'pg_restore --list /tmp/lucarne.dump >/dev/null'
dc exec -T db sh -c 'pg_restore --exit-on-error --single-transaction --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/lucarne.dump'
dc run --rm --no-deps web npm run db:migrate
```

Restaurer ensuite les photos avec un montage temporaire du répertoire de
transfert en lecture seule, puis démarrer l'application et le proxy :

```bash
dc run --rm --no-deps -v "$HOME/lucarne-transfer:/transfer:ro" web sh -c 'tar -xzf /transfer/photos.tar.gz -C /var/lib/lucarne/player-photos'
dc up -d web caddy
dc ps
dc logs --tail=100 web caddy
```

Si aucune photo n'existe, passer directement au démarrage. `pg_restore --list`
vérifie que l'archive est lisible ; seule une restauration suivie de contrôles
valide vraiment son contenu. La restauration complète recrée le schéma et
`_prisma_migrations` ; appliquer ensuite les migrations manquantes du code livré.
Ne pas migrer une base vide avant cette restauration complète.

Si la source précède la migration staff `20260914110000_staff_member_crud`,
vérifier les nationalités nulles avant de migrer : le README signale qu'elles
peuvent bloquer. Ne pas inventer de valeur pour faire passer la migration.
Une restauration et une répétition préalable sont essentielles.

Le compte SQL créé par cette configuration est le propriétaire initial de la
base ; `--no-owner --no-acl` permet de restaurer sans reprendre les propriétaires
SQL locaux. Les extensions utilisées par les migrations doivent être disponibles
dans PostgreSQL. À terme, séparer rôle de migration et rôle applicatif restreint.

Pour une installation sans reprise de données, appliquer uniquement les migrations
sur la base neuve, puis préparer une création non destructive des rôles et d'un
premier ADMIN. Ce mécanisme n'est pas fourni ici ; ne pas utiliser le seed de
développement en production pour le remplacer.

## 9. Vérifier avant d'annoncer l'ouverture

Depuis ton ordinateur :

```powershell
curl.exe --fail https://lucarne-exemple.duckdns.org/api/v1/health
curl.exe --fail https://lucarne-exemple.duckdns.org/
```

Vérifier dans le navigateur :

- HTTPS sans avertissement et redirection HTTP vers HTTPS.
- Connexion via le bouton public « Compte » ; `/dev/login` n'existe pas en production.
- Accès au dashboard avec un ADMIN restauré et refus pour un utilisateur ordinaire.
- Nombre de ligues, équipes, joueuses et matchs comparé à la source.
- Calendriers et photos existantes, puis téléversement d'une nouvelle image.
- Rechargement d'une URL profonde `/dashboard/leagues` sans erreur serveur.
- Lecture réelle d'une ressource en base : le health HTTP seul ne suffit pas.
- Persistance après `dc restart web db`, et démarrage après redémarrage du VPS.
- Ports 3000, 3310 et 5432 inaccessibles depuis Internet.
- Comportement des limiteurs et adresses clientes avec l'adresse fixe du proxy.

N'annoncer la bascule qu'après ces vérifications. Ne supprimer ni la source ni
les sauvegardes initiales à ce stade.

## 10. Sauvegarder et mettre à jour

Objectif de départ proposé : sauvegarde quotidienne, 7 quotidiennes et 4
hebdomadaires, plus une avant chaque déploiement. Cela peut représenter jusqu'à
24 heures de données perdues ; ajuster selon l'usage. Le temps de restauration
doit être mesuré lors d'un essai, pas supposé.

Chaque sauvegarde doit associer :

1. Un `pg_dump -Fc` complet de la base de production.
2. Une archive du volume `photos`, en suspendant les écritures le temps des deux captures.
3. Une copie protégée de la configuration et des secrets, distincte du dépôt.
4. Une copie chiffrée hors VPS, une vérification des erreurs et une alerte en cas d'échec.

Programmer ensuite cette procédure avec un timer systemd ou cron, après l'avoir
testée. Une sauvegarde sur le même disque peut disparaître avec le VPS. Une
option snapshot OVHcloud complète ces exports, sans remplacer le test de
restauration applicative. Voir [la sécurisation VPS OVHcloud](https://docs.ovhcloud.com/fr/guides/bare-metal-cloud/virtual-private-servers/secure-your-vps).

Tester régulièrement une restauration dans un environnement isolé. Ne jamais
pointer les tests d'intégration du projet vers la base de production.

Pour une mise à jour : sélectionner un commit vérifié, construire sa nouvelle
image, sauvegarder base et photos, suspendre les écritures, appliquer les
migrations puis recréer Web. Garder une image identifiée de la version précédente.
Une migration peut empêcher le retour à l'ancienne application : revenir au code
seul ne rétablit pas la base ; prévoir une restauration coordonnée si nécessaire,
en acceptant explicitement la perte des écritures postérieures à la sauvegarde.

Les tags `node:24-alpine`, `postgres:17` et `caddy:2` sont simples pour ce tutoriel.
Pour une exploitation reproductible, figer les versions/digests validés puis
planifier leurs mises à jour. Ne pas changer de version majeure PostgreSQL en
changeant simplement le tag de l'image.

## 11. Plan de réalisation et critères de sortie

| Phase | Actions | Résultat attendu |
| --- | --- | --- |
| 1. Préparation du dépôt | Sélectionner les changements, vérifier migrations/assets, corriger et tester le proxy | Commit déployable depuis un clone propre |
| 2. Infrastructure | Choisir VPS, installer Ubuntu/Docker, SSH et filtrage | Serveur accessible et ports maîtrisés |
| 3. Nom gratuit et TLS | Créer DuckDNS, faire pointer le DNS, configurer Caddy | URL HTTPS valide |
| 4. Répétition | Construire, exporter, transférer et restaurer base/photos | Données et comptes vérifiés sans toucher à la source |
| 5. Bascule finale | Suspendre les écritures, refaire l'export, restaurer une cible préparée, contrôler | Une seule installation reçoit les nouvelles écritures |
| 6. Exploitation | Sauvegardes hors VPS, restauration testée, logs et espace disque surveillés | Reprise documentée et mesurée |
| 7. Automatisation ultérieure | Adapter CI au montage choisi, livrer un SHA validé et tester HTTP + données | Déploiement reproductible |

Les exemples visent un premier VPS vierge. Aucun besoin de Kubernetes, de base
managée ni de plusieurs serveurs n'a été identifié pour cet objectif initial.
Les choix à fixer lors de l'exécution sont le budget VPS, le nom DuckDNS
disponible, le commit livré et le point de sauvegarde à reprendre.

## 12. Vérifications réellement effectuées pour ce document

Lecture des consignes racine/API/Web, du README, de l'architecture commune,
des deux fichiers Compose, du Dockerfile et de `.dockerignore`, des scripts npm,
des exemples d'environnement, de la configuration Express, de Prisma, du seed,
des limiteurs et du workflow de déploiement. Inspection de `git status --short`
pour repérer les changements non livrés. Recherche et consultation des sources
officielles liées dans ce document.

Lors de la rédaction initiale, aucun build, test applicatif, export de base,
restauration ou déploiement n'avait été exécuté. Les vérifications réalisées
ensuite pour préparer l'étape 1 sont consignées dans
[le bilan de préparation](PREPARATION-DEPLOIEMENT.md).
Les configurations VPS proposées nécessitent encore une validation sur Linux ;
ce document n'atteste pas d'un déploiement réussi.
