"""Read-only checks against the live TokTickIT URL. Never prints a credential.

WHAT THIS SCRIPT DOES
    Called by .github/workflows/deploy.yml after every deployment:
        python3 deploy/smoke_test.py SERVICE_URL
    Exits non-zero (failing the workflow) if any check fails. Each public check
    is retried up to 5 times, 3 seconds apart, to ride out a Cloud Run cold start.

    Checks (in order)
      1. GET /api/health      -> {"status": "ok"}
      2. GET /api/ready       -> {"db": "connected"}   (the service reaches Cloud SQL)
      3. GET /                -> an HTML page          (the built React app is served)
      4. GET /api/categories  -> a non-empty list      (migration + seed ran)
      5. GET /api/version     -> {"commit": EXPECTED_COMMIT}, only when the
         EXPECTED_COMMIT env var is set (deploy.yml sets it to the image tag),
         so a release cannot pass while an older revision is still serving.
      6. OPTIONAL sign-in: POST /api/auth/login, GET /api/auth/me with the
         tt_session cookie, POST /api/auth/logout. Runs only when BOTH
         SMOKE_EMAIL and SMOKE_PASSWORD are set. Use a demo Requester, never the
         Administrator. The session is always logged out, even if a check fails.

TokTickIT CHANGES FROM THE KIT
    - Sessions are a cookie (tt_session), not a Bearer token in the body.
    - The commit check (5) was added for R-08.

Standard library only. Offline unit tests: deploy/tests/test_smoke.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

SESSION_COOKIE = 'tt_session'


def request(base, path, data=None, cookie=None):
    """GET (or POST when data is given) and return the body bytes."""
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if cookie:
        headers['Cookie'] = cookie
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def login(base, email, password):
    """Sign in and return the 'tt_session=...' cookie pair (never printed)."""
    req = urllib.request.Request(base + '/api/auth/login',
                                 headers={'Content-Type': 'application/json'},
                                 data=json.dumps({'email': email, 'password': password}).encode())
    with urllib.request.urlopen(req, timeout=30) as response:
        for header in response.headers.get_all('Set-Cookie') or []:
            pair = header.split(';', 1)[0].strip()
            if pair.startswith(SESSION_COOKIE + '=') and len(pair) > len(SESSION_COOKIE) + 1:
                return pair
    raise ValueError('No session cookie')


def check(base):
    expected_commit = os.getenv('EXPECTED_COMMIT')
    checks = [
        ('/api/health', lambda b: json.loads(b).get('status') == 'ok'),
        ('/api/ready', lambda b: json.loads(b).get('db') == 'connected'),
        ('/', lambda b: b'<html' in b.lower()),
        ('/api/categories', lambda b: isinstance(json.loads(b), list) and len(json.loads(b)) > 0),
    ]
    if expected_commit:
        checks.append(('/api/version', lambda b: json.loads(b).get('commit') == expected_commit))

    for path, predicate in checks:
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    cookie = None
    try:
        cookie = login(base, email, password)
        request(base, '/api/auth/me', cookie=cookie)
        print('PASS login and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if cookie:
            request(base, '/api/auth/logout', data={}, cookie=cookie)
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
