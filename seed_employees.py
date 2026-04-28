"""
Seed real employees into the users collection.
Sources:
  1. Attendence collection  — filtered to valid employee names
  2. Team_progress collection — any name not already in users

All inserted users get:
  role = "employee"
  tenant_id = same as existing admin user
  password  = "Employee@123" (bcrypt hashed)
  is_active = True

Safe to re-run: existing users are NOT modified; duplicates are skipped by email.
"""
import asyncio
import certifi
import motor.motor_asyncio
from bson import ObjectId
from datetime import datetime, timezone
from passlib.context import CryptContext

MONGODB_URL = (
    "mongodb+srv://Anuradha_dev:Hexa%402201@cluster0.iyts5ys.mongodb.net/"
    "webx?retryWrites=true&w=majority"
)

# Garbage strings that appear in the Attendence collection but are NOT names
_JUNK = {
    "", "late", "absent", "present", "on leave", "total",
    "attendance summary", "status", "name", "role",
}

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEFAULT_PASSWORD_HASH = pwd_ctx.hash("Employee@123")


def _slug(name: str) -> str:
    """'Diya kulkarni' -> 'diya.kulkarni'"""
    return name.strip().lower().replace(" ", ".")


def _is_valid_name(name) -> bool:
    if not isinstance(name, str):
        return False
    cleaned = name.strip()
    if cleaned.lower() in _JUNK:
        return False
    # Must contain at least one space (first + last name) or be >=4 chars
    return len(cleaned) >= 3


async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
    db = client["webx"]

    # ── 1. Determine tenant_id from existing admin ──────────────────────────────
    admin = await db["users"].find_one({"role": "admin"})
    if not admin:
        print("ERROR: No admin user found — cannot determine tenant_id.")
        client.close()
        return
    tenant_id = admin["tenant_id"]
    print(f"Using tenant_id: {tenant_id}")

    # ── 2. Collect existing names/emails already in users ───────────────────────
    existing = await db["users"].find({}).to_list(length=5000)
    existing_emails = {u["email"].lower() for u in existing}
    existing_names  = {(u.get("full_name") or "").strip().lower() for u in existing}

    # ── 3. Collect candidate names from Attendence ──────────────────────────────
    att_docs = await db["Attendence"].find({}).to_list(length=500)
    att_employees: dict[str, str] = {}   # name -> department/role
    for d in att_docs:
        name = (d.get("Name") or d.get("name") or "").strip()
        role = d.get("Role") or d.get("role") or "General"
        if not _is_valid_name(name):
            continue
        if not isinstance(role, str):
            role = "General"
        att_employees[name] = role.strip() or "General"

    print(f"Valid Attendence employees: {list(att_employees.keys())}")

    # ── 4. Collect candidate names from Team_progress ───────────────────────────
    tp_docs = await db["Team_progress"].find({}).to_list(length=500)
    tp_employees: dict[str, str] = {}    # name -> role
    for d in tp_docs:
        name = (d.get("Name") or d.get("name") or "").strip()
        role = (d.get("Role") or d.get("role") or "General").strip()
        if not _is_valid_name(name):
            continue
        tp_employees[name] = role or "General"

    print(f"Valid Team_progress employees: {list(tp_employees.keys())}")

    # ── 5. Merge: Attendence wins for role; TP fills any gaps ───────────────────
    candidates: dict[str, str] = {**tp_employees, **att_employees}   # att overrides

    # ── 6. Insert employees not already in users ────────────────────────────────
    inserted = 0
    skipped  = 0
    for name, dept in candidates.items():
        if name.lower() in existing_names:
            print(f"  SKIP (name exists): {name}")
            skipped += 1
            continue
        email = f"{_slug(name)}@webisdom.com"
        if email in existing_emails:
            print(f"  SKIP (email exists): {email}")
            skipped += 1
            continue

        doc = {
            "_id":           ObjectId(),
            "tenant_id":     tenant_id,
            "email":         email,
            "full_name":     name,
            "password_hash": DEFAULT_PASSWORD_HASH,
            "role":          "employee",
            "department":    dept,
            "is_active":     True,
            "created_at":    datetime.now(timezone.utc),
            "last_login_at": None,
        }
        await db["users"].insert_one(doc)
        existing_emails.add(email)
        existing_names.add(name.lower())
        print(f"  INSERTED: {name} ({dept})  ->  {email}")
        inserted += 1

    print(f"\nDone. Inserted: {inserted}  Skipped: {skipped}")

    # ── 7. Print final users list ────────────────────────────────────────────────
    all_users = await db["users"].find({}).to_list(length=5000)
    print(f"\nTotal users now: {len(all_users)}")
    for u in all_users:
        print(f"  [{u.get('role','?'):8}] {u.get('full_name','?'):25}  {u.get('email','')}")

    client.close()


asyncio.run(main())
