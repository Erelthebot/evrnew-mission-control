# Quant server migration — adjunct to Erel cluster (cluster unchanged)

**Status:** Planned (revised 2026-06-01)  
**Decision:** Relocate the Quant Mac mini to the cluster **site** and stand it up as a **separate server**. The existing Erel cluster (erel_master MBP + erel_worker TB5 MLX) stays **completely intact** — no service cutover, no TB5 re-addressing, no mlx-cluster-proxy changes.

---

## Scope

### In scope (Quant only)

- Physical move: Mac mini from `192.168.50.45` → colocated with cluster
- Fresh macOS + user setup on Quant
- LAN join (ASUS DHCP static lease at cluster site)
- SSH access from erel_master
- Obsidian vault mirror/backup home (optional canonical copy + Sync)
- Nightly backup destination / rsync target
- Document Quant in vault `Agent-Shared/infrastructure.md`

### Out of scope (do not touch)

| Component | Stays on |
|-----------|----------|
| Mission Control :3003 | erel_master |
| OpenClaw :18789 / relay :18792 | erel_master |
| Hermes | erel_master |
| cloudflared / public DNS | erel_master |
| MLX cluster proxy :52415 | erel_master |
| Holo3 :8080 | erel_master |
| MLX 70B :52415 | erel_worker |
| TB5 `192.168.100.1` / `.100.2` | MBP + worker (unchanged) |
| All launchd plists on MBP/worker | unchanged |

**No maintenance window required** for the Erel stack.

---

## Current Quant

| Field | Value |
|-------|--------|
| mDNS | `quant.local` |
| LAN IP (pre-move) | `192.168.50.45` |
| MAC | `d0:11:e5:2b:5a:d3` |
| SSH | Port 22 open; key auth not configured |
| Erel services | none |

---

## Target layout

```
Internet → cloudflared → erel_master (unchanged)
                              │
                    TB5 192.168.100.1/.2
                              │
                    erel_worker (MLX 70B)

ASUS LAN 192.168.50.x
    ├── erel_master (.96)
    ├── erel_worker (.133)
    └── quant (new static IP)  ← backup / Obsidian / future expansion
         (no TB5 required day 1)
```

---

## Phase 0 — Relocate hardware

- [ ] Inventory Quant at `.45` (screen or one-time password SSH)
- [ ] Backup anything worth keeping off `.45`
- [ ] Move Mac mini to cluster location
- [ ] Ethernet to ASUS LAN only (TB5 optional later — **not required** for this migration)
- [ ] Assign new static DHCP lease (e.g. `.46` or `.97`)
- [ ] Erase + fresh macOS if greenfield; create user `quant` or `erel_master`
- [ ] Enable Remote Login; `ssh-copy-id` from erel_master
- [ ] Add to `~/.ssh/config` on MBP:

```
Host quant
    HostName <new-lan-ip>
    User quant
    IdentityFile ~/.ssh/id_ed25519
```

- [ ] Retire `.45` DHCP lease if MAC moves

---

## Phase 1 — Quant baseline

```bash
# On Quant
xcode-select --install   # or full Xcode if future MLX/exo
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git rsync node@20 python3
mkdir -p ~/backups/quant ~/Documents/Obsidian\ Vault
```

---

## Phase 2 — Migrate data to Quant

Run **from erel_master** (no cluster downtime):

```bash
QUANT=quant@<new-lan-ip>

# Obsidian vault (backup copy — MBP remains live source for agents)
rsync -a ~/Documents/Obsidian\ Vault/ $QUANT:~/Documents/Obsidian\ Vault/

# Optional: nightly backup mirror target
rsync -a ~/backups/erel/latest/ $QUANT:~/backups/erel-mirror/ 2>/dev/null || true
```

Enable Obsidian Sync on Quant if this becomes a second vault client (not primary until explicitly decided).

Update `scripts/nightly-backup.sh` cross-node line:

```bash
# After local backup completes:
rsync -a "${BACKUP_DIR}/" quant:~/backups/erel-mirror/latest/ 2>/dev/null || true
```

---

## Phase 3 — Verify

- [ ] `ssh quant hostname` from MBP
- [ ] Vault readable on Quant at `~/Documents/Obsidian Vault/Agent-Shared/`
- [ ] Optional: test rsync mirror from nightly backup
- [ ] Update vault `Agent-Shared/infrastructure.md` — Quant section only
- [ ] Run `python3 scripts/generate-facts.py` on MBP

---

## Future (optional, separate project)

These are **not** part of this migration:

- TB5 cable Quant into cluster subnet
- exo 3rd node / DeepSeek (`load-deepseek.sh`)
- Quant as primary control plane (superseded by current decision)

---

## Open questions

1. macOS user on Quant: `quant` vs `erel_master`?
2. Obsidian on Quant: **mirror only** or eventual **canonical vault** (would need agent path updates on MBP)?
3. New static LAN IP for Quant at cluster site?
