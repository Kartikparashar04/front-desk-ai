import subprocess
import urllib.request
import json
import os

# 1. Retrieve GitHub PAT from git credential manager
p = subprocess.Popen(
    ["git", "credential", "fill"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)
stdout, _ = p.communicate(input="protocol=https\nhost=github.com\n\n")
token = None
username = "Kartikparashar04"
for line in stdout.splitlines():
    if line.startswith("password="):
        token = line.split("=", 1)[1]
    elif line.startswith("username="):
        username = line.split("=", 1)[1]

if not token:
    print("Error: Could not retrieve GitHub token from credential manager.")
    exit(1)

repo_name = "front-desk-ai"

# 2. Check if repo already exists or create it
repo_url = f"https://api.github.com/repos/{username}/{repo_name}"
req_check = urllib.request.Request(
    repo_url,
    headers={
        "Authorization": f"Bearer {token}",
        "User-Agent": "Antigravity",
        "Accept": "application/vnd.github.v3+json"
    }
)

exists = False
try:
    with urllib.request.urlopen(req_check) as res:
        if res.status == 200:
            exists = True
            print(f"Repository '{repo_name}' already exists.")
except urllib.error.HTTPError as e:
    if e.code == 404:
        exists = False
    else:
        print(f"Error checking repo: {e.code} {e.reason}")

if not exists:
    print(f"Creating repository '{repo_name}' on GitHub under user '{username}'...")
    create_req = urllib.request.Request(
        "https://api.github.com/user/repos",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Antigravity",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        },
        data=json.dumps({
            "name": repo_name,
            "description": "Front Desk AI — Universal apparel sizing intelligence and deterministic garment fit recommendation engine (frontdeskai.shop)",
            "private": False,
            "has_issues": True,
            "has_projects": True,
            "has_wiki": True
        }).encode("utf-8")
    )
    try:
        with urllib.request.urlopen(create_req) as res:
            res_data = json.loads(res.read().decode())
            print(f"Repository created successfully: {res_data.get('html_url')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Error creating repo: {e.code} {e.reason} - {body}")
        exit(1)

# 3. Setup local git repo
remote_url = f"https://github.com/{username}/{repo_name}.git"
print(f"Target remote: {remote_url}")

def run_git(cmd):
    result = subprocess.run(
        cmd,
        cwd=r"C:\Users\Kartik\.gemini\antigravity\scratch\FitCheck",
        capture_output=True,
        text=True
    )
    print(f"$ {' '.join(cmd)}")
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip())
    return result

# git init
run_git(["git", "init", "-b", "main"])

# configure user if needed
run_git(["git", "config", "user.name", "Kartikparashar04"])
run_git(["git", "config", "user.email", "116263770+Kartikparashar04@users.noreply.github.com"])

# git remote
run_git(["git", "remote", "remove", "origin"])
run_git(["git", "remote", "add", "origin", remote_url])

# git add
run_git(["git", "add", "."])

# git status
run_git(["git", "status", "--short"])

# git commit
run_git(["git", "commit", "-m", "feat: Front Desk AI universal sizing engine and e-commerce link scraper v2.5"])

# git push
p_push = run_git(["git", "push", "-u", "origin", "main", "--force"])

if p_push.returncode == 0:
    print(f"\nSUCCESS! Code pushed to https://github.com/{username}/{repo_name}")
else:
    print("\nPush failed. See error above.")
