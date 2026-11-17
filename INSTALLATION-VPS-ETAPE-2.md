# Étape 2 : préparer le VPS OVHcloud existant

Le VPS est déjà disponible et vide, d'après la confirmation de l'utilisateur.
Le VPS est accessible à `51.77.145.79`, sous Ubuntu 24.04, avec l'utilisateur
`ubuntu` et une clé SSH créée sur le PC de l'utilisateur.
L'utilisateur a confirmé les mises à jour, le redémarrage et l'activation d'UFW
avec les ports 22/80/443 autorisés en IPv4 et IPv6. Il a fourni le résultat
réussi de `hello-world` et la version Docker Compose `v5.7.1`.
Ces commandes distantes ont été exécutées par l'utilisateur.

Le nom `lucarne-foot.duckdns.org` a ensuite été créé. La résolution DNS a été
vérifiée depuis le poste local : enregistrement A vers `51.77.145.79`, sans
enregistrement AAAA fourni par le résolveur public `1.1.1.1`.
HTTPS n'est pas encore activé sur le VPS.

## Informations nécessaires

Dans l'espace client OVHcloud, ouvrir Bare Metal Cloud → Serveurs Privés Virtuels,
puis le VPS. Relever son IPv4 publique et le système installé. L'utilisateur SSH
figure dans le courriel de livraison ; pour Ubuntu, il est souvent `ubuntu`.
Ne pas communiquer de mot de passe ou de clé privée dans la conversation.
[Première connexion OVHcloud](https://docs.ovhcloud.com/fr/guides/bare-metal-cloud/virtual-private-servers/starting-with-a-vps).

La procédure ci-dessous suppose Ubuntu 24.04 LTS sur un VPS vide avec SSH sur 22.
Si le système diffère, adapter les commandes avant de les exécuter. Il n'est pas
nécessaire de réinstaller un système compatible.

## 1. Connexion et inventaire

Depuis PowerShell sur le PC, remplacer `UTILISATEUR_OVH` et `IP_DU_VPS` :

```powershell
ssh UTILISATEUR_OVH@IP_DU_VPS
```

Lors de la première connexion, vérifier l'empreinte SSH par un canal de confiance,
par exemple la console KVM OVHcloud. Un changement inattendu d'empreinte doit
être expliqué avant d'accepter la connexion. Le mot de passe temporaire peut
devoir être changé ; reconnecter ensuite la session si elle se ferme.

Dans le terminal Linux du VPS :

```bash
cat /etc/os-release
uname -m
free -h
df -h /
sudo ss -lntup
```

Ces lectures permettent de confirmer le système, la mémoire, le disque disponible
et les ports déjà utilisés avant de changer la configuration.

## 2. Installer une clé SSH

Si aucune clé adaptée n'est déjà disponible, depuis PowerShell :

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh"
Test-Path "$env:USERPROFILE\.ssh\lucarne_ovh"
```

Si le résultat est `False`, créer la clé ; s'il est `True`, conserver la clé
existante ou choisir un autre nom, sans l'écraser :

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\lucarne_ovh" -C "lucarne-ovh"
```

Choisir une phrase secrète. Transférer uniquement la clé publique :

```powershell
Get-Content "$env:USERPROFILE\.ssh\lucarne_ovh.pub" | ssh UTILISATEUR_OVH@IP_DU_VPS 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys'
```

Ouvrir une **seconde fenêtre PowerShell** et vérifier :

```powershell
ssh -i "$env:USERPROFILE\.ssh\lucarne_ovh" -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no UTILISATEUR_OVH@IP_DU_VPS
```

Ne pas désactiver l'accès par mot de passe avant que cette seconde connexion par
clé et l'utilisation de `sudo` aient été vérifiées. Conserver l'accès KVM OVHcloud
pour pouvoir réparer une configuration SSH ou un pare-feu incorrect.
[Sécurisation OVHcloud](https://docs.ovhcloud.com/fr/guides/bare-metal-cloud/virtual-private-servers/secure-your-vps).

## 3. Mises à jour et pare-feu

Sur le VPS :

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Ces règles supposent SSH sur 22. Si son port est différent, autoriser ce port
avant d'activer UFW. Une nouvelle connexion doit rester possible. Vérifier aussi
les éventuels filtrages OVHcloud. Si les mises à jour réclament un redémarrage,
le faire une fois les accès vérifiés, puis se reconnecter.

## 4. Installer Docker Engine et Compose

Vérifier d'abord si Docker est déjà installé :

```bash
command -v docker
```

Si Docker existe déjà, examiner sa version et son installation avant de remplacer
des paquets. Pour un Ubuntu vierge, ajouter le dépôt apt officiel :

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Créer la source apt :

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Installer et vérifier :

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

Procédure basée sur la [documentation officielle Docker Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
Docker Engine suffit ; Docker Desktop n'est pas nécessaire sur le VPS.
Les commandes du tutoriel utilisent `sudo docker`, sans ajouter de droits au
groupe Docker. Ne pas installer Node.js ou PostgreSQL sur l'hôte : les futures
images Docker les fourniront.

Docker peut publier des ports en contournant les règles UFW. La future configuration
ne publie donc que 80/443, avec API et PostgreSQL sur des réseaux internes.
[Docker et pare-feu](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

## 5. Critères pour valider l'étape

- Le système et les ressources du VPS sont identifiés.
- La connexion SSH par clé fonctionne dans une seconde session.
- Les mises à jour sont appliquées et le redémarrage éventuel est effectué.
- SSH reste accessible et UFW est actif avec les ports prévus.
- `hello-world` fonctionne et `docker compose version` répond.
- Aucun port applicatif ou PostgreSQL n'a été ouvert publiquement.

La configuration de l'adresse DuckDNS et de HTTPS vient ensuite. La base locale
et les photos ne sont pas exportées à cette étape. L'installation du VPS ne
remplace pas la sélection et le commit des fichiers de livraison de l'étape 1.
