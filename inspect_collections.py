"""Inspect Attendence and Team_progress collections."""
import asyncio
import json
import certifi
import motor.motor_asyncio
from bson import ObjectId
from datetime import datetime

MONGODB_URL = (
    "mongodb+srv://Anuradha_dev:Hexa%402201@cluster0.iyts5ys.mongodb.net/"
    "webx?retryWrites=true&w=majority"
)

def _ser(obj):
    if isinstance(obj, ObjectId): return str(obj)
    if isinstance(obj, datetime): return obj.isoformat()
    if isinstance(obj, dict): return {k: _ser(v) for k, v in obj.items()}
    if isinstance(obj, list): return [_ser(i) for i in obj]
    return obj

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
    db = client["webx"]

    att = await db["Attendence"].find({}).to_list(length=500)
    tp  = await db["Team_progress"].find({}).to_list(length=500)
    usr = await db["users"].find({}).to_list(length=500)

    print(f"\n=== Attendence ({len(att)} docs) ===")
    for d in att[:5]:
        print(json.dumps(_ser(d), indent=2))

    print(f"\n=== Team_progress ({len(tp)} docs) ===")
    for d in tp[:5]:
        print(json.dumps(_ser(d), indent=2))

    print(f"\n=== users ({len(usr)} docs) ===")
    for d in usr:
        print(json.dumps(_ser(d), indent=2))

    print(f"\nATTENDANCE NAMES: {[d.get('Name') or d.get('name','') for d in att]}")
    print(f"TEAM_PROGRESS NAMES: {[d.get('name','') for d in tp]}")
    client.close()

asyncio.run(main())
