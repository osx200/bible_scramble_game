# Hardening a fresh Oracle Cloud VM

**Target:** Ubuntu 22.04 / 24.04 on OCI Compute, serving a public web app
(Docker container on loopback + host nginx terminating TLS).

**Status of this box:** unhardened. Host iptables confirmed as Oracle's stock ruleset —
SSH only, everything else REJECTed.

---

## Contents

1. [Before you touch anything](#0-before-you-touch-anything)
2. [Patch, and stay patched](#1-patch-and-stay-patched)
3. [SSH hardening](#2-ssh-hardening)
4. [The two firewall layers](#3-the-two-firewall-layers)
5. [Docker's firewall bypass](#4-dockers-firewall-bypass)
6. [fail2ban](#5-fail2ban)
7. [Host nginx + TLS](#6-host-nginx--tls)
8. [Users and sudo](#7-users-and-sudo)
9. [Kernel and service trimming](#8-kernel-and-service-trimming)
10. [Verification](#9-verification)
11. [Ongoing maintenance](#10-ongoing-maintenance)
12. [Appendix A — locked out?](#appendix-a--locked-out)
13. [Appendix B — x86_64 and small shapes](#appendix-b--x86_64-and-small-shapes)

---

## 0. Before you touch anything

Three safety nets. They take five minutes between them, and each one has saved somebody
from rebuilding a box.

**Serial console.** The OCI console has reorganised this more than once, so it may not be
where older guides say. Look in this order:

1. Instance detail page → **scroll down** to the horizontal tab row (*Metrics · Attached
   block volumes · Attached VNICs · Boot volume · **Console connection** · Work requests ·
   Run command*). It is no longer a left-rail "Resources" list.
2. Instance detail page → **More actions** (`⋮`) → **Console connection**.
3. Then choose **Launch Cloud Shell connection**, not "Create local connection" — Cloud
   Shell generates the keypair and opens the serial console in a browser terminal, with
   no local SSH setup to get wrong.

This reaches the VM *below* the network stack, so it still works when sshd is
misconfigured or the firewall is wrong. You will not use it today. Create it anyway.

> To actually log in at the serial console you need a **password** for `ubuntu` — key auth
> doesn't apply there. Oracle's image ships the account locked. Set one now, while you can:
> ```bash
> sudo passwd ubuntu
> ```
> This does not enable SSH password login; `PasswordAuthentication no` in step 2 governs
> that independently. Skipping this is the single most common reason the serial console
> turns out to be useless at the moment it's needed.

**Run Command — the safety net that needs no console connection.** The Oracle Cloud Agent
can execute a script on the instance from the OCI web console, over the agent's *outbound*
connection. That means it keeps working when you've locked yourself out at the INPUT
firewall or broken sshd — the two most likely mistakes in this guide.

Instance detail page → **Run command** tab → *Create command*. Confirm the plugin is live
before you rely on it:

```bash
sudo systemctl status oracle-cloud-agent
```

and on the instance page check **Oracle Cloud Agent** → *Compute Instance Run Command* is
Enabled. It needs an IAM policy in the tenancy to work; on a single-user tenancy where you
are the tenancy admin, that's already satisfied.

Test it once, now, with something harmless like `whoami` — an untested recovery path is not
a recovery path.

**A second SSH session.** Open one now and leave it connected and idle for the entire
job. Every step that touches sshd or the firewall gets validated by opening a *third*,
brand-new session — never by trusting the one you're typing in. An already-established
connection survives rules that would block a new one, which is precisely how people
convince themselves a broken config works.

**Know your own IP** (you'll need it for the SSH firewall rule):

```bash
curl -s ifconfig.me; echo
```

If you're on a residential connection this changes periodically — use your ISP's /24 and
be ready to update it, or accept `0.0.0.0/0` on 22 and lean harder on key-only auth plus
fail2ban.

---

## 1. Patch, and stay patched

```bash
sudo apt update && sudo apt full-upgrade -y
ls -l /var/run/reboot-required 2>/dev/null && echo "REBOOT NEEDED" || echo "no reboot needed"
sudo reboot     # only if needed
```

Then make it automatic, because a box you patch by hand is a box that stops being patched
in about five weeks:

```bash
sudo apt install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades    # answer Yes
```

Edit `/etc/apt/apt.conf.d/50unattended-upgrades` and confirm:

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Automatic-Reboot "false";
```

`Automatic-Reboot "false"` is deliberate — you do not want a public service rebooting at
06:00 unattended. Instead, check for a pending reboot when you log in. Verify the timer:

```bash
systemctl list-timers | grep apt-daily
sudo unattended-upgrade --dry-run --debug | tail -20
```

---

## 2. SSH hardening

Oracle's image already gives you key-only auth for the `ubuntu` user. Make that explicit
rather than inherited, so a future image change or a stray package can't quietly loosen it.

**Do not edit `/etc/ssh/sshd_config` directly.** Ubuntu 22.04+ reads
`/etc/ssh/sshd_config.d/*.conf`, and in OpenSSH the *first* occurrence of a keyword wins —
so a drop-in file is both cleaner and actually authoritative.

Create `/etc/ssh/sshd_config.d/99-hardening.conf`:

```
# Authentication
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitEmptyPasswords no
AuthenticationMethods publickey
MaxAuthTries 3
MaxSessions 4
LoginGraceTime 30

# Who may log in
AllowUsers ubuntu

# Reduce attack surface
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no

# Drop dead sessions
ClientAliveInterval 300
ClientAliveCountMax 2
```

> `AllowTcpForwarding no` will break `ssh -L` port-forwarding tunnels. If you use those
> to reach an admin UI on the VM, set it to `yes` — it's a real convenience/exposure
> trade, not a formality.

Test the syntax **before** restarting. `sshd -t` returning silently is the gate:

```bash
sudo sshd -t && echo "config OK"
sudo systemctl restart ssh
```

Now open a **new** terminal and confirm you can still get in, before closing anything.

```bash
ssh -v ubuntu@<ip>          # should show "Authenticated using publickey"
```

**On port changes.** Moving off 22 cuts log noise but adds no real security — an attacker
scans all 65535 ports in seconds. If you do it anyway, note Ubuntu 24.04 socket-activates
sshd: the `Port` directive is ignored and you must override the socket instead:

```bash
sudo systemctl edit ssh.socket
# [Socket]
# ListenStream=
# ListenStream=2222
sudo systemctl daemon-reload && sudo systemctl restart ssh.socket
```

Update the firewall and the OCI Security List in the same sitting, or you lock yourself out.

---

## 3. The two firewall layers

This is the step that trips up everyone new to OCI. Traffic must pass **both** a cloud
filter and a host filter. Allowing a port in one and forgetting the other produces a silent
timeout with nothing in any log.

### 3a. Cloud layer — Security List or NSG

OCI Console → Networking → VCN → *your subnet* → Security List (or attach a Network
Security Group to the VNIC, which is the better habit — NSGs attach to instances rather
than whole subnets).

Ingress rules you want:

| Source | Protocol | Port | Why |
|---|---|---|---|
| `0.0.0.0/0` | TCP | 80 | HTTP → redirects to HTTPS; Certbot's HTTP-01 challenge needs it |
| `0.0.0.0/0` | TCP | 443 | the actual app |
| `<your.ip>/32` or your ISP's `/24` | TCP | 22 | SSH, restricted |

Delete anything else the launch wizard added. In particular the default `0.0.0.0/0` on 22
should be narrowed or removed once your own rule is in and tested.

### 3b. Host layer — the Oracle preloaded ruleset

Oracle's Ubuntu images ship with iptables rules restored at boot by `netfilter-persistent`
from `/etc/iptables/rules.v4`. Confirmed on this box:

```
Chain INPUT (policy ACCEPT)
1  ACCEPT  all   0.0.0.0/0   state RELATED,ESTABLISHED
2  ACCEPT  icmp  0.0.0.0/0
3  ACCEPT  all   0.0.0.0/0              <- loopback (lo)
4  ACCEPT  tcp   0.0.0.0/0   state NEW tcp dpt:22
5  REJECT  all   0.0.0.0/0   reject-with icmp-host-prohibited
```

Rule 5 is why 80/443 are unreachable today regardless of what the Security List says. Pick
**one** of the two options below and commit to it — running ufw on top of the preloaded
rules without understanding the ordering is the worst of both worlds, because ufw inserts
its chain but the REJECT at position 5 still fires first for anything ufw didn't hoist
above it.

#### Option A — move to ufw (recommended)

Simpler mental model, and what most Ubuntu documentation assumes.

```bash
# Save a copy of the originals first
sudo cp /etc/iptables/rules.v4 ~/rules.v4.oracle-default.bak

sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH FIRST — before enabling anything
sudo ufw allow from <YOUR.IP.ADDR>/32 to any port 22 proto tcp comment 'ssh admin'
sudo ufw allow 80/tcp  comment 'http'
sudo ufw allow 443/tcp comment 'https'

# Now retire the preloaded rules so they stop racing ufw at boot
sudo apt purge -y iptables-persistent netfilter-persistent
sudo iptables -F
sudo iptables -P INPUT ACCEPT      # transient — ufw takes over on the next line

sudo ufw enable                    # answer y; your live session survives
sudo ufw status verbose
```

Keep that second session open across `ufw enable`. Then open a **third** session to prove
new connections still work.

Confirm ufw survives a reboot — this is the check people skip:

```bash
sudo reboot
# after it comes back:
sudo ufw status verbose
sudo iptables -L INPUT -n --line-numbers | head
```

#### Option B — keep iptables, add rules above the REJECT

Less churn, but every future change needs the same care about ordering.

```bash
sudo iptables -I INPUT 5 -p tcp --dport 80  -m state --state NEW -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -m state --state NEW -j ACCEPT

# Narrow SSH to your IP: delete the open rule 4, insert a scoped one
sudo iptables -D INPUT 4
sudo iptables -I INPUT 4 -p tcp -s <YOUR.IP.ADDR>/32 --dport 22 -m state --state NEW -j ACCEPT

sudo iptables -L INPUT -n --line-numbers     # verify ordering BEFORE saving
sudo netfilter-persistent save
```

The `-I INPUT 5` inserts *at* position 5, pushing the REJECT down. Check the listing before
saving — an ACCEPT below the REJECT does nothing, and it will look correct in your config
while failing in practice.

### 3c. IPv6

If the VNIC has an IPv6 address, the v4 rules do not cover it. Either mirror them in
`ip6tables` / ufw (ufw handles both when `IPV6=yes` in `/etc/default/ufw`, the default),
or confirm IPv6 isn't assigned:

```bash
ip -6 addr show scope global
sudo ip6tables -L INPUT -n --line-numbers
```

---

## 4. Docker's firewall bypass

Docker manipulates iptables directly and inserts its rules into the `nat` `PREROUTING`
chain, which is evaluated **before** ufw's filter chain. The practical consequence:

> **A published container port is reachable from the internet even when `ufw` says deny.**

`ufw status` will show `443 ALLOW` and nothing else, and meanwhile port 8080 answers the
world. This surprises people every year.

The fix is to never publish to `0.0.0.0` on a public host. Bind to loopback and let the
host nginx be the only front door — which is what this project's compose file already does:

```yaml
services:
  bible-scramble:
    build: .
    container_name: bible-scramble
    ports:
      - "127.0.0.1:8080:80"     # loopback-only. Do not drop the 127.0.0.1 prefix.
    restart: unless-stopped
```

Verify after the stack is up that the bind is actually local:

```bash
sudo ss -tulpn | grep 8080
# want:  LISTEN 0 4096  127.0.0.1:8080 ...
# NOT:   LISTEN 0 4096      0.0.0.0:8080 ...
```

And from your laptop, `curl --max-time 5 http://<public-ip>:8080` must time out.

If you ever genuinely need a published port firewalled, the rules go in the `DOCKER-USER`
chain, which Docker leaves alone:

```bash
sudo iptables -I DOCKER-USER -p tcp --dport 8080 ! -s 10.0.0.0/8 -j DROP
```

---

## 5. fail2ban

With password auth disabled this is mostly log-noise reduction rather than a security
boundary — but it's cheap, and it matters the moment you add any password-bearing service.

```bash
sudo apt install -y fail2ban
```

Create `/etc/fail2ban/jail.local` (never edit `jail.conf` — it's replaced on upgrade):

```ini
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 4
backend  = systemd
# Never ban yourself
ignoreip = 127.0.0.1/8 ::1 <YOUR.IP.ADDR>/32

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
```

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

The two nginx jails do nothing until host nginx exists and writes
`/var/log/nginx/error.log` — that's fine, they'll start working after step 6. If fail2ban
fails to start, it's almost always a jail pointing at a logfile that doesn't exist yet;
`journalctl -u fail2ban -n 50` names it.

> On Ubuntu 24.04, `backend = systemd` is required for the sshd jail — sshd logs to the
> journal, not to `/var/log/auth.log`, and the default file backend silently matches nothing.

---

## 6. Host nginx + TLS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 6a. Reverse proxy

Create `/etc/nginx/sites-available/app` (replace `example.duckdns.org`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.duckdns.org;

    # Certbot writes its HTTP-01 challenge here; everything else goes to HTTPS.
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name example.duckdns.org;

    # certbot fills in ssl_certificate / ssl_certificate_key below

    server_tokens off;
    client_max_body_size 2m;

    # Security headers.
    # microphone=(self) is load-bearing: the scramble game's voice input uses
    # getUserMedia, and an empty list blocks the mic even for this origin.
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(self), camera=()" always;
    # Add only once HTTPS is confirmed working — it is hard to walk back.
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

> **The `add_header` inheritance trap.** nginx only inherits `add_header` directives into a
> block that defines *none* of its own. The moment you add one `add_header` inside a
> `location`, every inherited security header vanishes from responses served there — silently.
> Either repeat them, or keep `add_header` at the `server` level only. The container's own
> `nginx.conf` documents the same hazard around its cache headers.

### 6b. Certificates

```bash
sudo certbot --nginx -d example.duckdns.org
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

Certbot installs its own systemd timer; no cron entry needed. The dry run is the real test —
renewal failing 60 days from now, quietly, is the common outcome when port 80 gets closed
"because everything is HTTPS anyway". Keep 80 open.

Uncomment the HSTS header only after HTTPS is confirmed working end to end. Browsers cache
it for a year and there is no easy undo.

---

## 7. Users and sudo

For a single-operator box, `ubuntu` with key-only auth is defensible. Once a second person
has access, give each a named account with their own key — shared credentials destroy your
ability to answer "who did this".

```bash
sudo adduser --disabled-password --gecos "" alice
sudo usermod -aG sudo alice
sudo install -d -m 700 -o alice -g alice /home/alice/.ssh
sudo tee /home/alice/.ssh/authorized_keys < alice_id_ed25519.pub >/dev/null
sudo chown alice:alice /home/alice/.ssh/authorized_keys
sudo chmod 600 /home/alice/.ssh/authorized_keys
```

Then add them to `AllowUsers` in `/etc/ssh/sshd_config.d/99-hardening.conf`, `sshd -t`,
restart, and verify in a new session.

Oracle's cloud-init grants `ubuntu` passwordless sudo via
`/etc/sudoers.d/90-cloud-init-users`. To require a password (worth it once the account has
a password set and more than one person uses the box):

```bash
sudo passwd ubuntu                          # set one first, or you lock yourself out of sudo
echo 'ubuntu ALL=(ALL) ALL' | sudo EDITOR='tee' visudo -f /etc/sudoers.d/99-require-password
sudo -k && sudo -v                          # confirm it prompts and accepts
```

Always use `visudo` (or `visudo -f`) — it syntax-checks. A malformed sudoers file makes
sudo refuse to run at all, and fixing that needs the serial console.

---

## 8. Kernel and service trimming

See what is listening and turn off what you didn't ask for:

```bash
sudo ss -tulpn
sudo systemctl list-units --type=service --state=running
```

On a web VM, expect only: `sshd`, `nginx`, `docker`/`containerd`, `systemd-resolved`
(loopback), `chrony`/`systemd-timesyncd`, `fail2ban`, and the OCI agents
(`oracle-cloud-agent`, `snapd` if present). Anything else — Apache, MySQL, Postfix,
`rpcbind` — either gets a reason or gets removed.

Modest kernel hardening in `/etc/sysctl.d/99-hardening.conf`:

```
# Spoofing / routing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.log_martians = 1

# SYN flood
net.ipv4.tcp_syncookies = 1

# Hide kernel pointers from unprivileged users
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
```

```bash
sudo sysctl --system
```

Leave `net.ipv4.ip_forward` alone — Docker needs it and will re-enable it anyway.

Keep time in sync (certificate validation and log correlation both depend on it):

```bash
timedatectl status         # want "System clock synchronized: yes"
```

---

## 9. Verification

Do these from **outside** the VM where noted. Checking only from inside proves nothing
about what the internet can reach.

**Network exposure** — from your laptop:

```bash
nmap -Pn -p 22,80,443,8080,2375 <public-ip>
# want: 80/443 open, 8080 and 2375 filtered, 22 open only from your allowed IP
curl --max-time 5 http://<public-ip>:8080    # must time out
```

From a different network (phone hotspot) `ssh ubuntu@<ip>` should **time out**, not say
"connection refused" — a refusal means something is answering and rejecting, which is a
different and less good posture.

**On the VM:**

```bash
sudo ufw status verbose                 # or: sudo iptables -L INPUT -n --line-numbers
sudo ss -tulpn                          # 8080 bound to 127.0.0.1 only
sudo sshd -T | grep -Ei 'permitrootlogin|passwordauth|maxauthtries|allowusers'
sudo fail2ban-client status sshd
sudo certbot certificates
sudo journalctl -u ssh --since today | grep -iE 'fail|invalid' | tail
```

**Application:**

```bash
curl -I https://example.duckdns.org                 # 200, security headers present
curl -I http://example.duckdns.org                  # 301 to https
curl -sI https://example.duckdns.org | grep -i permissions-policy   # microphone=(self)
```

Then open the app in a browser and run one round of scramble **voice input**. That is the
only check that catches a broken `Permissions-Policy` or a lost header from the
`add_header` inheritance trap — no curl assertion will tell you the mic is dead.

**Reboot test.** Everything above must survive a restart:

```bash
sudo reboot
# then re-run: ufw status, ss -tulpn, curl -I https://...
```

**Optional scored audit:**

```bash
sudo apt install -y lynis && sudo lynis audit system
```

Treat its hardening index as a direction, not a target. Chasing 90+ on a single-app web VM
buys less than a working backup.

---

## 10. Ongoing maintenance

| Cadence | Task |
|---|---|
| Automatic | `unattended-upgrades` for security patches; certbot renewal timer |
| Weekly | `ls /var/run/reboot-required`; reboot during a quiet window if present |
| Monthly | `sudo journalctl -p err --since "1 month ago"`; review `fail2ban-client status sshd` |
| Monthly | Confirm the boot-volume backup actually produced a recent backup |
| Quarterly | Re-run the external `nmap`; rotate SSH keys if anyone has left |

**Backups — configure this today.** OCI Console → Block Storage → Boot Volumes → *your
volume* → **Backup policy** → Bronze (monthly) or Silver (weekly + monthly). It is the
cheapest disaster recovery you will ever set up, and the only item on this page that
recovers you from a mistake rather than preventing one.

**Deploying updates** stays the same as the existing EC2 flow:

```bash
git pull && docker compose down && docker compose up -d --build
docker compose ps        # HEALTHCHECK should report healthy
```

---

## Appendix A — locked out?

In rough order of what to try:

0. **Run Command** (step 0). Instance page → *Run command* → Create command. It runs over
   the Cloud Agent's outbound connection, so an INPUT firewall lockout or a broken sshd
   doesn't touch it. Paste the relevant fix from item 2 below and run it as root. This is
   usually faster than the serial console and needs no password.
1. **Serial console** (step 0). OCI Console → Instance → Console connection → copy the
   connection string → run it locally. You get a login prompt below the network layer, so
   firewall and sshd mistakes don't block it.
2. From either of those, undo the damage:
   ```bash
   sudo ufw disable                                  # firewall lockout
   sudo rm /etc/ssh/sshd_config.d/99-hardening.conf  # sshd lockout
   sudo systemctl restart ssh
   sudo cp ~/rules.v4.oracle-default.bak /etc/iptables/rules.v4   # if you kept it
   ```
3. **Console connection needs a password** for the `ubuntu` user to log in interactively.
   If you never set one, you can't use it — which is why `sudo passwd ubuntu` is worth
   doing early even if you never use password auth over the network.
4. **Last resort:** detach the boot volume, attach it to a second instance, fix the config
   on the mounted filesystem, reattach. Slow but reliable — and it needs a second instance,
   which is another argument for the backup policy.

---

## Appendix B — x86_64 and small shapes

This VM reports `x86_64`, not `aarch64`. On Always Free that almost certainly means
**`VM.Standard.E2.1.Micro`** — 1 OCPU, **1 GB RAM**, no burst. Confirm with:

```bash
free -h
curl -s -H "Authorization: Bearer Oracle" -L http://169.254.169.254/opc/v2/instance/ | grep -i shape
```

### Swap is mandatory here, not optional

1 GB is not enough to run `npm run build`. Vite spawns esbuild and Rollup, and the
Node heap alone will exceed the box. The failure mode is nasty precisely because it isn't
a clean error: the build dies with `Killed`, or no message at all, or the SSH session
freezes hard while the OOM killer works. `dmesg | grep -i oom` afterwards is what confirms it.

Do this **before** the first build:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
free -h      # Swap line should now show 2.0Gi
```

`swappiness=10` keeps the kernel from swapping under normal load — the swap is there as a
ceiling for the build spike, not as everyday memory.

Verify it comes back after a reboot (`/etc/fstab` typos are silent until then):

```bash
sudo reboot
free -h
```

### Better: don't build on the VM at all

On a 1 GB box the Docker build is the single heaviest thing that will ever run, and it
competes with the running container for memory. Two ways out, in order of preference:

1. **Build elsewhere, ship the image.** x86 dev box → x86 VM means the architecture
   mismatch warning does not apply to you, so this is straightforward:
   ```bash
   # on your machine
   docker build -t bible-scramble:latest .
   docker save bible-scramble:latest | gzip > bible-scramble.tar.gz
   scp bible-scramble.tar.gz ubuntu@<ip>:~
   # on the VM
   gunzip -c bible-scramble.tar.gz | docker load
   ```
   Then point `docker-compose.yml` at `image: bible-scramble:latest` instead of `build: .`.
2. **Build with the container stopped**, so the old container isn't holding RAM:
   ```bash
   docker compose down && docker compose up -d --build
   ```
   This is what the existing deploy flow already does — keep that ordering, it matters more
   here than it did on EC2.

Either way, run `docker image prune -f` after deploys. Disk on the Micro shape is 47 GB by
default, which is plenty, but stale layers accumulate fast when you rebuild often.

### Other x86 notes

- **Docker itself** needs installing — it is not on the base image:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu     # log out and back in for it to take effect
  ```
  Note that adding a user to the `docker` group is equivalent to giving them root — the
  daemon socket has no further authorization. That's an accepted trade on a single-operator
  box; just don't add accounts to it casually.
- **`node_modules/` and `dist/` are committed in this repo.** On the VM that means a
  `git pull` drags them along, and a stale `node_modules/` can shadow a clean install.
  `.dockerignore` excludes both so the image always builds from source — but if you ever
  run `npm` directly on the VM, `rm -rf node_modules && npm ci` first.

### A note on the Always Free tier

Idle Always Free instances can be reclaimed. If this box matters, either keep it genuinely
busy or upgrade the tenancy to Pay As You Go — Always Free resources are exempt from
reclamation on a paid account, and stay free.

---

## Quick reference — the order that matters

```
0. serial console + RUN COMMAND + second session + passwd ubuntu   <- do not skip
1. apt full-upgrade, unattended-upgrades
1b. SWAP FIRST on the 1GB Micro shape (Appendix B) -- before any docker build
2. sshd drop-in, sshd -t, restart, VERIFY IN A NEW SESSION
3. OCI Security List (80/443 open, 22 scoped) THEN host ufw/iptables
4. containers bound to 127.0.0.1 only
5. fail2ban
6. nginx reverse proxy -> certbot -> HSTS last
7. named users, sudo password
8. trim services, sysctl
9. verify from OUTSIDE, then reboot and verify again
10. turn on the boot-volume backup policy
```
