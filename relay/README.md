# ProvisionKH payment relay (Cambodia)

A tiny program that runs on a server **inside Cambodia** and passes payment checks to Bakong for the store app.
The app's servers are abroad, and Bakong only accepts Cambodian networks.

## 1. Get a server in Cambodia
Any small Cambodian VPS (1 CPU / 512 MB is plenty) running Ubuntu, with a public IP address.
Local hosts include Sabay Cloud, EzeCom, Cloud Cambodia, or any provider whose data centre is in Phnom Penh.
Check it before going further: `curl -s -o /dev/null -w "%{http_code}" -X POST https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5`
must print `401` or `400`, **not** `403`.

## 2. Install
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs caddy
sudo mkdir -p /opt/pk-relay && sudo cp server.mjs /opt/pk-relay/
```

## 3. Run it permanently
Create `/etc/systemd/system/pk-relay.service`:
```ini
[Unit]
Description=ProvisionKH Bakong relay
After=network-online.target

[Service]
Environment=RELAY_SECRET=PASTE_THE_RELAY_SECRET_HERE
Environment=PORT=8787
ExecStart=/usr/bin/node /opt/pk-relay/server.mjs
Restart=always
User=nobody

[Install]
WantedBy=multi-user.target
```
Then: `sudo systemctl daemon-reload && sudo systemctl enable --now pk-relay`

## 4. Secure address (HTTPS)
Point a domain or subdomain (e.g. `relay.yourdomain.com`) at the server IP, then put this in `/etc/caddy/Caddyfile`:
```
relay.yourdomain.com {
  reverse_proxy 127.0.0.1:8787
}
```
`sudo systemctl reload caddy` — Caddy gets the HTTPS certificate automatically.
Without a domain, a free one from DuckDNS works.

## 5. Test
`curl https://relay.yourdomain.com/health` → `{"ok":true}`

## 6. Connect the app
In the app's secure form enter:
- **BAKONG_RELAY_URL** = `https://relay.yourdomain.com`
- **BAKONG_RELAY_SECRET** = the same value as RELAY_SECRET above

The Bakong key stays in the app only; renew it there every ~90 days.
