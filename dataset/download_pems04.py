#!/usr/bin/env python3
"""Download and verify the public PEMS04 NPZ used by TrafficLens."""

import argparse
import hashlib
import os
import tempfile
import urllib.request


SOURCE_URL = (
    "https://raw.githubusercontent.com/guoshnBJTU/ASTGNN/main/"
    "data/PEMS04/PEMS04.npz"
)
EXPECTED_SIZE = 32956284
EXPECTED_SHA256 = "95a3c9b720fffdb85f0330d09bfab41b0b3cad0ca86c0d7d5f3accacb4ac999a"


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url, output):
    parent = os.path.dirname(os.path.abspath(output))
    os.makedirs(parent, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="pems04-", suffix=".npz", dir=parent)
    os.close(fd)
    try:
        urllib.request.urlretrieve(url, temporary)
        size = os.path.getsize(temporary)
        checksum = sha256(temporary)
        if size != EXPECTED_SIZE or checksum != EXPECTED_SHA256:
            raise RuntimeError(
                f"verification failed: size={size}, sha256={checksum}"
            )
        os.replace(temporary, output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(f"downloaded {output}: {size} bytes, sha256={checksum}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="dataset/pems04.npz")
    parser.add_argument("--url", default=SOURCE_URL)
    args = parser.parse_args()
    download(args.url, args.out)


if __name__ == "__main__":
    main()