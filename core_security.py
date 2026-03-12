import hashlib
import json
import os

# AEGIS Core Security Module (v2.9.5)
# This module is intended to be compiled into a binary (.pyd/.so)
# to protect sensitive logic and sponsorship salt.

# Obfuscated Salt (Salt is divided to prevent simple string search)
_PART1 = "AEGIS"
_PART2 = "_CORE_V48"
_PART3 = "_SECRET_"
_PART4 = "SALT_2026"


def get_salt():
    return f"{_PART1}{_PART2}{_PART3}{_PART4}"


def is_sponsor_raw(secrets_path):
    """
    Core sponsorship validation logic.
    Works directly with the secrets file path to avoid circular dependencies.
    """
    if not os.path.exists(secrets_path):
        return False

    try:
        with open(secrets_path, "r", encoding="utf-8-sig") as f:
            content = f.read().strip()
            data = json.loads(content) if content else {}

        key = data.get("SPONSOR_KEY", "")
        seed = data.get("SEED_KEY_VALUE", "")

        if not key.startswith("AEGIS-") or not seed:
            return False

        parts = key.split("-")
        if len(parts) != 4:
            return False

        _, i, px, s = parts

        # Binary-ready hashing logic
        salt = get_salt()
        # Identity(i)와 ProductCode(px)를 모두 포함하여 서명 위조 방지
        raw = f"{i}{px}{seed}{salt}"
        v = hashlib.sha256(raw.encode()).hexdigest().upper()[:8]

        return v == s
    except Exception:
        return False
