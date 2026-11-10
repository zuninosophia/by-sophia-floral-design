"""Small, local-only preview server for By Sophia Floral Design."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import errno
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--open', action='store_true', help='Open the site in your browser')
    args = parser.parse_args()
    port = args.port
    server = None
    for candidate in range(port, port + 10):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', candidate), partial(Handler, directory=str(ROOT)))
            port = candidate
            break
        except OSError as error:
            if error.errno == errno.EADDRINUSE:
                continue
            raise SystemExit(f'Could not start the local website: {error}') from error
    if server is None:
        raise SystemExit('The local preview ports are busy. Try a different --port value.')
    url = f'http://127.0.0.1:{port}'
    print(f'By Sophia Floral Design\nLocal website: {url}\nKeep this window open. Press Control-C to stop.', flush=True)
    if args.open:
        threading.Timer(.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nLocal website stopped.', flush=True)
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
