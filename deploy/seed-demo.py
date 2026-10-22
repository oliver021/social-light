#!/usr/bin/env python3
"""Make the demo feel alive: register the demo accounts and have them follow seeded profiles.

Run after `docker compose up` and after the content-engine corpora were pushed:
  (cd content-engine && dotnet run -- seed push creators-circles-v1 --api $GW --identity $GW)
  (cd content-engine && dotnet run -- seed push paradigm-circles-v1 --api $GW --identity $GW)
  GATEWAY=http://localhost:8088 python3 deploy/seed-demo.py
Credentials: DEMO_PASSWORD env var, or the `password:` line of deploy/demo-users.local.
If neither exists a random password is generated and written to deploy/demo-users.local.
"""
import json, os, secrets, urllib.parse, urllib.request, urllib.error

GW = os.environ.get("GATEWAY", "http://localhost:8088")
HERE = os.path.dirname(os.path.abspath(__file__))
CRED = os.path.join(HERE, "demo-users.local")
USERS = [("demo.alice@social.test", "Alice Demo", 20), ("demo.bob@social.test", "Bob Demo", 12)]


def call(method, path, body=None, token=None, form=None):
    data, headers = None, {}
    if form is not None:
        data = urllib.parse.urlencode(form).encode(); headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif body is not None:
        data = json.dumps(body).encode(); headers["Content-Type"] = "application/json"
    if token: headers["Authorization"] = f"Bearer {token}"
    try:
        with urllib.request.urlopen(urllib.request.Request(GW + path, data, headers, method=method), timeout=30) as r:
            raw = r.read(); return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, None


def password():
    if os.environ.get("DEMO_PASSWORD"): return os.environ["DEMO_PASSWORD"]
    if os.path.exists(CRED):
        for l in open(CRED):
            if l.startswith("password:"): return l.split(":", 1)[1].strip()
    pw = "Demo-" + secrets.token_hex(5) + "!1"
    open(CRED, "w").write("# Local demo accounts (NOT committed).\n" + "".join(u[0] + "\n" for u in USERS) + f"password: {pw}\n")
    return pw


pw = password()
for email, name, n_follow in USERS:
    st, _ = call("POST", "/api/account/register", {"email": email, "password": pw, "displayName": name})
    assert st in (200, 201, 409), f"register {email}: {st}"
    st, tok = call("POST", "/connect/token", form={"grant_type": "password", "client_id": "social-tests",
        "client_secret": "secret", "username": email, "password": pw, "scope": "openid profile socialapi offline_access"})
    assert st == 200, f"login {email}: {st}"
    token = tok["access_token"]
    _, me = call("GET", "/api/profiles/me", token=token)
    my_id = me.get("userId") or me.get("id")
    _, profiles = call("GET", "/api/profiles", token=token)
    others = [p for p in profiles if (p.get("userId") or p.get("id")) != my_id and not p.get("userId", "").startswith("demo")]
    done = 0
    for p in others[:n_follow]:
        st, _ = call("POST", "/api/follows", {"followerId": my_id, "followingId": p.get("userId") or p.get("id"),
                     "status": "active", "createdAt": "2026-01-01T00:00:00Z"}, token=token)
        done += st in (200, 201)
    print(f"{email}: following {done}")
