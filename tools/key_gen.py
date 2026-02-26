import hashlib
import random
import string

# === SECURITY CONFIGURATION (Must match check_assets.py) ===
_SALT = "AEGIS_CORE_V48_SECRET_SALT_2026"


def generate_key(member_id):
    """
    Generates a unique Sponsor Key based on Member ID or Name.
    Member ID can be GitHub username or email.
    """
    if not member_id:
        print("Error: Member ID is required.")
        return None

    # Part 1: Original ID (cleaned)
    clean_id = "".join([c for c in member_id if c.isalnum()]).upper()

    # Part 2: Randomized prefix
    prefix = "".join(
        [random.choice(string.ascii_uppercase + string.digits) for _ in range(4)]
    )

    # Part 3: Secure Hash (SHA256)
    raw_data = f"{prefix}{clean_id}{_SALT}"
    signature_full = str(hashlib.sha256(raw_data.encode()).hexdigest()).upper()
    signature = signature_full[0:8]

    # Final Format: AEGIS-ID-PREFIX-SIGNATURE
    final_key = f"AEGIS-{clean_id}-{prefix}-{signature}"
    return final_key


def main():
    print("====================================================")
    print("   AEGIS Intelligence Dashboard - Sponsor Key Gen")
    print("====================================================\n")

    mid = input("Enter Recipient (GitHub ID or Email): ").strip()
    key = generate_key(mid)

    if key:
        print(f"\n[SUCCESS] Generated Key for: {mid}")
        print("-" * 50)
        print(f"SPONSOR_KEY: {key}")
        print("-" * 50)
        print("\n* Provide this key to the sponsor to paste into their secrets.json.")


if __name__ == "__main__":
    main()
