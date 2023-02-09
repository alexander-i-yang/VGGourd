#Use to create local host
import http.server
import socketserver
import sys

port = 8080

args = sys.argv
if len(args) > 1: port = int(args[1])

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
      ".js": "application/javascript",
});


httpd = socketserver.TCPServer(("", port), Handler)
httpd.serve_forever()