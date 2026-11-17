#!/usr/bin/env python3
"""Migrate AptTest to OpenAI embeddings and ingest one Supabase-hosted RAG batch."""
import argparse
import json
import os
from typing import Iterator
from urllib.parse import quote

import chromadb
import requests
from openai import OpenAI

TENANT = "42b47fe3-444a-4152-b50a-f7877e541819"
DATABASE = "projectSyndicate"
SOURCE_COLLECTION = "aptTest"
TARGET_COLLECTION = "aptTest_openai"
STORAGE_BUCKET = "Images"
MODEL = "text-embedding-3-small"
BATCH_SIZE = 64


def require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required GitHub Actions secret: {name}")
    return value


def batches(items: list, size: int) -> Iterator[list]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def embed(client: OpenAI, documents: list[str]) -> list[list[float]]:
    response = client.embeddings.create(model=MODEL, input=documents)
    return [item.embedding for item in response.data]


def upsert_records(target, embedder: OpenAI, records: list[dict]) -> int:
    total = 0
    for group in batches(records, BATCH_SIZE):
        documents = [record["document"] for record in group]
        target.upsert(
            ids=[record["id"] for record in group],
            documents=documents,
            metadatas=[record["metadata"] for record in group],
            embeddings=embed(embedder, documents),
        )
        total += len(group)
    return total


def source_records(source) -> Iterator[dict]:
    offset = 0
    while True:
        result = source.get(limit=100, offset=offset, include=["documents", "metadatas"])
        ids = result["ids"]
        if not ids:
            return
        for record_id, document, metadata in zip(ids, result["documents"], result["metadatas"]):
            if document:
                yield {"id": record_id, "document": document, "metadata": metadata or {}}
        offset += len(ids)


def load_chunks_from_storage(path: str) -> list[dict]:
    base_url = require("SUPABASE_URL").rstrip("/")
    service_key = require("SUPABASE_SERVICE_ROLE_KEY")
    encoded_path = quote(path.lstrip("/"), safe="/")
    url = f"{base_url}/storage/v1/object/{STORAGE_BUCKET}/{encoded_path}"
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
        timeout=60,
    )
    response.raise_for_status()
    chunks = response.json()
    if not isinstance(chunks, list):
        raise RuntimeError("Storage JSON must be an array of RAG chunks")
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrate-existing", action="store_true")
    parser.add_argument("--new-chunks-storage-path")
    args = parser.parse_args()

    chroma = chromadb.CloudClient(
        api_key=require("CHROMA_API_KEY"), tenant=TENANT, database=DATABASE
    )
    source = chroma.get_collection(SOURCE_COLLECTION, embedding_function=None)
    target = chroma.get_or_create_collection(
        TARGET_COLLECTION,
        embedding_function=None,
        metadata={"embedding_model": MODEL, "embedding_dimensions": 1536},
    )
    openai = OpenAI(api_key=require("OPENAI_API_KEY"))
    migrated = 0
    upserted_new = 0

    if args.migrate_existing:
        migrated = upsert_records(target, openai, list(source_records(source)))
    if args.new_chunks_storage_path:
        upserted_new = upsert_records(
            target, openai, load_chunks_from_storage(args.new_chunks_storage_path)
        )

    print(json.dumps({
        "source_collection": SOURCE_COLLECTION,
        "target_collection": TARGET_COLLECTION,
        "embedding_model": MODEL,
        "migrated_existing": migrated,
        "upserted_new": upserted_new,
        "target_count": target.count(),
    }))


if __name__ == "__main__":
    main()
