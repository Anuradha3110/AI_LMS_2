"""
Export the 'users' collection from MongoDB Atlas (webx database) to a CSV file.
Output: users_export.csv in the same directory as this script.

Usage:
    python export_users_csv.py
"""
import asyncio
import csv
import os
from datetime import datetime

import certifi
import motor.motor_asyncio

MONGODB_URL = (
    "mongodb+srv://Anuradha_dev:Hexa%402201@cluster0.iyts5ys.mongodb.net/"
    "webx?retryWrites=true&w=majority"
)
DB_NAME = "webx"
COLLECTION = "users"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "users_export.csv")


async def fetch_users():
    client = motor.motor_asyncio.AsyncIOMotorClient(
        MONGODB_URL,
        tlsCAFile=certifi.where(),
    )
    db = client[DB_NAME]
    col = db[COLLECTION]
    docs = await col.find({}).to_list(length=10_000)
    client.close()
    return docs


def flatten(doc: dict) -> dict:
    """Flatten one MongoDB document to a simple key→value dict for CSV."""
    row = {}
    for k, v in doc.items():
        if k == "_id":
            row["_id"] = str(v)
        elif isinstance(v, dict):
            for sub_k, sub_v in v.items():
                row[f"{k}.{sub_k}"] = str(sub_v) if sub_v is not None else ""
        elif isinstance(v, list):
            row[k] = "; ".join(str(i) for i in v)
        elif isinstance(v, datetime):
            row[k] = v.isoformat()
        else:
            row[k] = str(v) if v is not None else ""
    return row


async def main():
    print(f"Connecting to MongoDB Atlas — {DB_NAME}.{COLLECTION} …")
    docs = await fetch_users()

    if not docs:
        print("No documents found in the users collection.")
        return

    print(f"Fetched {len(docs)} user document(s).")

    # Build the union of all field names across all docs (preserves insertion order)
    all_keys: list[str] = []
    seen: set[str] = set()
    for doc in docs:
        for k in flatten(doc).keys():
            if k not in seen:
                all_keys.append(k)
                seen.add(k)

    # Ensure _id is first
    if "_id" in all_keys:
        all_keys.remove("_id")
        all_keys.insert(0, "_id")

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_keys, extrasaction="ignore")
        writer.writeheader()
        for doc in docs:
            writer.writerow(flatten(doc))

    print(f"CSV saved: {OUTPUT_FILE}")
    print(f"Columns ({len(all_keys)}): {', '.join(all_keys)}")


if __name__ == "__main__":
    asyncio.run(main())
