#!/usr/bin/env bash
set -u
BASE="http://localhost:3000"
EMAIL="auth-test-$(date +%s)@example.com"
CJ="$(mktemp)"
echo "EMAIL=$EMAIL"

echo "--- 0. /api/auth/me (no cookie) -> expect 401 ---"
echo "status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/auth/me")"

echo "--- 1. /apply unauthenticated -> expect 307 to /login ---"
curl -s -o /dev/null -w "status=%{http_code} redirect=%{redirect_url}\n" "$BASE/apply"

echo "--- 2. signup fresh -> expect 201 + Set-Cookie ctf_session ---"
curl -s -i -c "$CJ" -X POST "$BASE/api/auth/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"fullName\":\"Test Guardian\",\"password\":\"password123\",\"confirmPassword\":\"password123\"}" | sed -n '1,14p'

echo "--- 3. with cookie, /apply -> expect 200 and wizard renders ---"
echo "status=$(curl -s -o /dev/null -w '%{http_code}' -b "$CJ" "$BASE/apply")"
echo "wizard_marker_Form_CTF_1=$(curl -s -b "$CJ" "$BASE/apply" | grep -c 'Form CTF-1')"

echo "--- 4. duplicate signup (same email) -> expect 409 ---"
echo "status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/signup" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"fullName\":\"Test Guardian\",\"password\":\"password123\",\"confirmPassword\":\"password123\"}")"

echo "--- 5a. mismatched passwords -> expect 422 errors.confirmPassword ---"
curl -s -X POST "$BASE/api/auth/signup" -H "Content-Type: application/json" -d "{\"email\":\"x@x.com\",\"fullName\":\"A B\",\"password\":\"password123\",\"confirmPassword\":\"different\"}" -w "\nstatus=%{http_code}\n"

echo "--- 5b. short password -> expect 422 errors.password ---"
curl -s -X POST "$BASE/api/auth/signup" -H "Content-Type: application/json" -d "{\"email\":\"y@y.com\",\"fullName\":\"A B\",\"password\":\"short\",\"confirmPassword\":\"short\"}" -w "\nstatus=%{http_code}\n"

echo "--- 6. login correct -> expect 200 + Set-Cookie; wrong password -> expect 401 ---"
curl -s -i -c "$CJ" -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" | sed -n '1,8p'
echo "wrongpw_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}")"

echo "--- 7. logout -> expect 200; then /apply -> expect 307 to /login ---"
echo "logout_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/logout" -b "$CJ" -c "$CJ")"
curl -s -o /dev/null -w "post_logout_apply_status=%{http_code} redirect=%{redirect_url}\n" -b "$CJ" "$BASE/apply"

echo "--- 8. existing flows ---"
echo "health=$(curl -s "$BASE/api/health")"
echo "stats_total=$(curl -s "$BASE/api/stats" | grep -o '\"totalApplications\":[0-9]*')"
echo "home_status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")"

rm -f "$CJ"
echo "--- DONE ---"
