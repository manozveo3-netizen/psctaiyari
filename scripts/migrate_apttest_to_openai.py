#!/usr/bin/env python3
"""Migrate Chroma aptTest documents to OpenAI embeddings in aptTest_openai."""
import argparse
import json
import os
from typing import Iterator

import chromadb
from openai import OpenAI

TENANT = "42b47fe3-444a-4152-b50a-f7877e541819"
DATABASE = "projectSyndicate"
SOURCE_COLLECTION = "aptTest"
TARGET_COLLECTION = "aptTest_openai"
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
        result = source.get(
            limit=100,
            offset=offset,
            include=["documents", "metadatas"],
        )
        ids = result["ids"]
        if not ids:
            return
        for record_id, document, metadata in zip(
            ids, result["documents"], result["metadatas"]
        ):
            if document:
                yield {
                    "id": record_id,
                    "document": document,
                    "metadata": metadata or {},
                }
        offset += len(ids)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrate-existing", action="store_true")
    parser.add_argument("--upsert-new-chunks", action="store_true")
    args = parser.parse_args()

    chroma = chromadb.CloudClient(
        api_key=require("CHROMA_API_KEY"),
        tenant=TENANT,
        database=DATABASE,
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
        existing = list(source_records(source))
        migrated = upsert_records(target, openai, existing)

    if args.upsert_new_chunks:
        raw = require("RAG_NEW_CHUNKS_JSON")
        chunks = json.loads(raw)
        if not isinstance(chunks, list):
            raise RuntimeError("RAG_NEW_CHUNKS_JSON must be a JSON array of chunks")
        upserted_new = upsert_records(target, openai, chunks)

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
