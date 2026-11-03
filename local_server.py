from __future__ import annotations

import argparse
import os
import re
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


SITE_DIR = Path(__file__).resolve().parent / "site"
CATEGORY_ROUTE = re.compile(
    r"^/(audio|mice)(/[^/]+)?/?$"
)
PROFILE_ROUTE = re.compile(r"^/user(?:/[0-9]+)?/?$")
ARTICLE_ROUTE = re.compile(r"^/articles/[^/]+/?$")


def local_network_addresses() -> list[str]:
    """Return usable IPv4 addresses for devices on the same local network."""
    addresses: set[str] = set()

    try:
        for address in socket.gethostbyname_ex(socket.gethostname())[2]:
            addresses.add(address)
    except OSError:
        pass

    # A UDP connect does not send data, but lets the OS select the active
    # network interface more reliably on machines with several adapters.
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("1.1.1.1", 80))
            addresses.add(probe.getsockname()[0])
    except OSError:
        pass

    return sorted(
        address
        for address in addresses
        if address
        and not address.startswith("127.")
        and not address.startswith("169.254.")
        and address != "0.0.0.0"
    )


class TervionaHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        original_path = self.path
        parsed = urlsplit(original_path)

        if CATEGORY_ROUTE.fullmatch(parsed.path):
            self.path = urlunsplit(("", "", "/category.html", parsed.query, ""))
        elif PROFILE_ROUTE.fullmatch(parsed.path):
            self.path = urlunsplit(("", "", "/profile.html", parsed.query, ""))
        elif parsed.path.rstrip("/") == "/articles":
            self.path = urlunsplit(("", "", "/articles.html", parsed.query, ""))
        elif ARTICLE_ROUTE.fullmatch(parsed.path):
            generated = SITE_DIR / parsed.path.lstrip("/") / "index.html"
            if not generated.is_file():
                self.path = urlunsplit(("", "", "/article.html", parsed.query, ""))
        elif parsed.path.rstrip("/") == "/methodology":
            self.path = urlunsplit(("", "", "/methodology.html", parsed.query, ""))

        try:
            return super().send_head()
        finally:
            self.path = original_path

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Terviona web server with production-style routes")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Address to listen on. Use 0.0.0.0 to make the site available on the local network.",
    )
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    os.chdir(SITE_DIR)
    server = ThreadingHTTPServer((args.host, args.port), TervionaHandler)
    print(f"Terviona on this computer: http://localhost:{args.port}/")

    if args.host in {"0.0.0.0", "::"}:
        addresses = local_network_addresses()
        if addresses:
            print("\nOpen on a phone connected to the same Wi-Fi:")
            for address in addresses:
                print(f"  http://{address}:{args.port}/")
        else:
            print("\nThe site is available on the local network, but the Wi-Fi address could not be detected.")

    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
