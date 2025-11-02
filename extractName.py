import requests
import time
import json
import re
from bs4 import BeautifulSoup
from urllib.parse import quote
import os

# Configuration (matches values from your App.js)
DEFAULT_PREFIX = "595948"
DEFAULT_TESTNO = "5E5F5C5D5E5F5C595E5F5C5F5E5F5C5A5E5F5C"
DEFAULT_FL = "5956485E595648"
PROXY_BASE = "https://api.allorigins.win/raw?url="

# Mappings from the JS encodeString
CHAR_MAPPINGS = {"D": "2b", "R": "3d", "C": "2c", "A": "2e", "B": "2d"}
DIGIT_MAPPINGS = {
    "0": "5f",
    "1": "5e",
    "2": "5d",
    "3": "5c",
    "4": "5b",
    "5": "5a",
    "6": "59",
    "7": "58",
    "8": "57",
    "9": "56",
}


def encode_string(input_string: str, prefix: str = DEFAULT_PREFIX) -> str | None:
    """
    Reproduce the JS encodeString behaviour:
    prefix + token for each character; tokens from CHAR_MAPPINGS or DIGIT_MAPPINGS.
    Returns None if an unsupported character is found.
    """
    encoded = []
    for ch in input_string:
        token = CHAR_MAPPINGS.get(ch) or DIGIT_MAPPINGS.get(ch)
        if token is None:
            return None
        encoded.append(prefix + token)
    return "".join(encoded)


def fetch_name_from_encoded(encoded_id: str, retry: int = 3, backoff: float = 0.5) -> str | None:
    """
    Fetch the target page via the same allorigins proxy and extract the Name from
    <th class="th-last"> using a regex similar to the JS code.
    """
    target_url = (
        "https://www.time4education.com/moodle/aimcatresults/aimcat_performance.asp"
        f"?testno={DEFAULT_TESTNO}&idcardno={encoded_id}&fl={DEFAULT_FL}"
    )
    proxied = PROXY_BASE + quote(target_url, safe="")
    for attempt in range(1, retry + 1):
        try:
            resp = requests.get(proxied, timeout=15)
            if resp.status_code != 200:
                raise requests.HTTPError(f"Status {resp.status_code}")
            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
            th = soup.select_one("th.th-last")
            if not th:
                return None
            inner = th.decode_contents()  # preserve the same raw HTML substring pattern
            # Regex similar to JS: look for "Name : VEDANT DANGI &nbsp;"
            m = re.search(r"Name\s*:\s*([A-Z0-9 .\-]+)&nbsp;", inner, flags=re.I)
            if m:
                return m.group(1).strip()
            # fallback: try plain text extraction after 'Name :'
            txt = th.get_text(" ", strip=True)
            m2 = re.search(r"Name\s*:\s*([A-Za-z0-9 .\-]+)", txt, flags=re.I)
            return m2.group(1).strip() if m2 else None
        except Exception:
            if attempt < retry:
                time.sleep(backoff * attempt)
                continue
            return None


def main(
    prefix: str = DEFAULT_PREFIX,
    out_json: str = "aimcat_names_1.json",
    delay: float = 0.1,
):
    """
    Iterate ID numbers from start..end (inclusive), build ID like 'DRCAB5A{NNN}',
    encode, fetch name, and write results to CSV.
    """
    # 1. Load existing data
    results = []
    if os.path.exists(out_json):
        try:
            with open(out_json, "r", encoding="utf-8") as jf:
                results = json.load(jf)
            print(f"Loaded {len(results)} records from {out_json}.", flush=True)
        except json.JSONDecodeError:
            print(f"Error decoding JSON from {out_json}. Starting with an empty list.", flush=True)
    else:
        # If the file doesn't exist, you'd typically want to run the full range
        # based on start/end, but as the prompt explicitly removes that logic,
        # we'll assume the file should exist or the script will do nothing if empty.
        # For this refactor, let's stick to the resume logic.
        print(f"File {out_json} not found. Exiting.", flush=True)
        return
    
    # 2. Identify missing names
    to_fetch = [r for r in results if r.get("name") is None and r.get("status") != "encode_failed"]
    total_to_fetch = len(to_fetch)
    print(f"Found {total_to_fetch} entries with 'name': null to re-fetch.", flush=True)

    if total_to_fetch == 0:
        print("All names have been fetched or marked as 'encode_failed'. Nothing to do.", flush=True)
        return

    # Create a mapping for quick lookup and update
    results_map = {r["idcard"]: r for r in results}

    # 3. Iterate and fetch for missing names
    for idx, entry in enumerate(to_fetch, start=1):
        idcard = entry["idcard"]
        
        # Ensure 'idcard' is present before encoding
        if not idcard:
            print(f"Skipping entry at index {idx} due to missing idcard.", flush=True)
            continue

        encoded = encode_string(idcard, prefix)
        if encoded is None:
            # Update the entry's status in the map
            results_map[idcard]["name"] = None
            results_map[idcard]["status"] = "encode_failed"
            print(f"[{idx}/{total_to_fetch}] {idcard} - encode_failed", flush=True)
            continue
        name = fetch_name_from_encoded(encoded)
        status = "found" if name else "not_found"
        
        # Update the entry's details in the map
        results_map[idcard]["name"] = name or None
        results_map[idcard]["status"] = status
        
        pct = (idx / total_to_fetch) * 100
        # Print concise progress line
        if name:
            print(f"[{idx}/{total_to_fetch}] {idcard} - {status} - name: {name} - {pct:.1f}%", flush=True)
        else:
            print(f"[{idx}/{total_to_fetch}] {idcard} - {status} - {pct:.1f}%", flush=True)
        # polite pause
        time.sleep(delay)

    # Summary
    found_count = sum(1 for r in results if r["status"] == "found")
    not_found = sum(1 for r in results if r["status"] == "not_found")
    encode_failed = sum(1 for r in results if r["status"] == "encode_failed")
    print(f"Done. found={found_count}, not_found={not_found}, encode_failed={encode_failed}", flush=True)

    # 5. Write updated JSON output (overwriting the old file)
    # The 'results' list now reflects the updates made through 'results_map' because
    # the list elements are mutable dictionaries referenced by the map.
    try:
        with open(out_json, "w", encoding="utf-8") as jf:
            json.dump(results, jf, ensure_ascii=False, indent=2)
        print(f"Updated results saved to {out_json}.", flush=True)
    except Exception as e:
        print(f"Error writing to JSON file: {e}", flush=True)


    # Write JSON output
    with open(out_json, "w", encoding="utf-8") as jf:
        json.dump(results, jf, ensure_ascii=False, indent=2)




if __name__ == "__main__":
    # Default run: DRCAB5A001..DRCAB5A999 -> aimcat_names.csv
    main()