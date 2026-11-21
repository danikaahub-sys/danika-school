#!/usr/bin/env python3
"""Keep server-side runtime overrides; always force uploaded auth secrets."""
import os
import sys
from pathlib import Path

CANONICAL = ("AUTH_ACCESS_TOKEN_SECRET", "AUTH_REFRESH_TOKEN_SECRET")


def read_env(path):
    if not path.exists():
        return {}
    values = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    return values


def merge_runtime(incoming, existing):
    result = dict(incoming)
    for key, value in existing.items():
        if key in CANONICAL:
            continue
        if key not in result:
            result[key] = value
        elif str(value or "").strip():
            result[key] = value
    for key in CANONICAL:
        if not incoming.get(key):
            raise ValueError("Canonical authentication secret is missing: " + key)
        result[key] = incoming[key]
    return result


if __name__ == "__main__":
    incoming, existing = map(Path, sys.argv[1:3])
    result = merge_runtime(read_env(incoming), read_env(existing))
    incoming.write_text("".join(key + "=" + value + "\n" for key, value in result.items()))
    os.chmod(incoming, 0o600)
    os.replace(incoming, existing)
