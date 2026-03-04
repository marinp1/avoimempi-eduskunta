# Hetzner Infra

Single VM running both the app and the data pipeline on built-in disk storage.

- **Server:** `cpx22` (2 AMD vCPU, 4 GB RAM, 80 GB SSD), Debian 13, Helsinki (`hel1`)
- **Firewall:** inbound TCP 1363 (SSH), 80 (HTTP), 443 (HTTPS), ICMP — all else blocked
- **Outbound:** unrestricted (needed for apt, Parliament API, etc.)
- **Cloud-init:** configures SSH port, creates data directories

## How the firewall works

Hetzner Cloud firewalls are stateful and applied at the hypervisor level — traffic is
filtered before it reaches the VM's network interface. The default policy blocks all
inbound that isn't explicitly allowed. Outbound is unrestricted by default when no
outbound rules are defined, which is what we want (the pipeline needs to reach external APIs).

ICMP is allowed explicitly because blocking it breaks IPv6 path MTU discovery, which can
cause silent connectivity failures.

## How deploy and provision work

### Infrastructure lifecycle

```
tofu apply          → provisions VM + firewall, runs cloud-init on first boot
bun deploy          → builds app + pipeline, uploads to VM via SSH/SCP
ssh hetzner ".../provision-vm.sh"  → creates users, dirs, sudoers, installs systemd units
```

### Applications

Two systemd-managed applications run under separate users:

| | `avoimempi-eduskunta-app` | `avoimempi-eduskunta-pipeline` |
|---|---|---|
| What | Bun HTTP server | scraper / parser / migrator timers |
| Port | 80 | — |
| Data reads | `/var/lib/avoimempi-eduskunta-app/current.db` | Parliament API, row stores |
| Data writes | `shared/migration.lock` | row stores, SQLite DB, app releases dir |
| Special | `CAP_NET_BIND_SERVICE` | `sudo /opt/.../scripts/restart-app.sh` only |

After migration the pipeline user copies the finished SQLite DB into
`/var/lib/avoimempi-eduskunta-app/releases/` (group-writable via shared group membership),
flips the `current.db` symlink, then calls the restricted restart script.

## Prerequisites

### 1. Upload SSH key to Hetzner Cloud

Your Scaleway key (`~/.ssh/scaleway/id_ed25519.pub`) can be reused directly.
Upload it with the `hcloud` CLI or the Hetzner Cloud Console:

```bash
# CLI (install: https://github.com/hetznercloud/cli)
hcloud ssh-key create --name scaleway --public-key-from-file ~/.ssh/scaleway/id_ed25519.pub
```

Or via the web console: **Project → Security → SSH Keys → Add SSH Key**.

Then set the key name for Terraform:

```bash
export TF_VAR_ssh_key_name="scaleway"
```

### 2. Hetzner API token

Create a token in the Hetzner Cloud Console under **Project → Security → API Tokens**
(Read & Write). Then:

```bash
export TF_VAR_hcloud_token="<your-token>"
```

Or add to `packages/infra/terraform.tfvars` (gitignored):

```hcl
hcloud_token  = "<your-token>"
ssh_key_name  = "scaleway"
```

## Apply

```bash
cd packages/infra
tofu init
tofu plan
tofu apply
```

## Outputs

```bash
tofu output server        # public IPv4/IPv6, name, type
tofu output storage_env   # env vars for pipeline configuration
```

## First-time VM setup

After `tofu apply`, set up the SSH alias first, then follow this order exactly.
Provision **must** run before deploy because the deploy script activates a release
and health-checks the app — which requires the service user to exist.

SSH config entry (`~/.ssh/config`):

```
Host hetzner
  HostName <ipv4-from-tofu-output>
  User root
  Port 1363
  IdentityFile ~/.ssh/scaleway/id_ed25519
```

```bash
# 1. Install bun on the VM (required before provisioning)
ssh hetzner "curl -fsSL https://bun.sh/install | bash"

# 2. Provision: creates users, directories, sudoers entry, installs systemd units
ssh hetzner "/opt/avoimempi-eduskunta/scripts/provision-vm.sh"

# 3. Deploy app + pipeline builds (activates a release and health-checks the app)
bun run deploy

# 4. Upload and activate the SQLite DB so the app can serve data immediately
bun scripts/deploy.mts database

# 5. Upload row stores so the pipeline can do incremental scraping (runs in background)
bun scripts/deploy.mts data
```

## Routine operations

```bash
bun run deploy            # deploy new app + pipeline release
bun run deploy:app        # app only
bun run deploy:pipeline   # pipeline only

ssh hetzner "systemctl status avoimempi-eduskunta-app"
ssh hetzner "systemctl list-timers 'avoimempi-eduskunta-pipeline-*'"
ssh hetzner "journalctl -u avoimempi-eduskunta-app -n 50 --no-pager"
```

## Common overrides

```bash
export TF_VAR_location="hel1"       # hel1, nbg1, fsn1, ash, hil, sin
export TF_VAR_server_type="cpx22"
export TF_VAR_server_image="debian-12"
export TF_VAR_ssh_port=1363
```
