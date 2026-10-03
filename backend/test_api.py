import urllib.request
import json

url = "http://127.0.0.1:8000/auth/login"
payload = {
    "email": "test.student@necnchatbox.local",
    "password": "Test@123"
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print("LOGIN RESPONSE:")
        print(json.dumps(result, indent=2))
except Exception as e:
    print("ERROR:", e)