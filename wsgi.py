import re, json
from urllib.parse import parse_qs

DEFAULT_VERSION = "030e8ca"
DEFAULT_CDN_TEMPLATE = "https://cdn.jsdelivr.net/gh/{owner}/{repo}@{version}/dist/"
OWNER = "dysonprotocol"
REPO = "dysonprotocol2-dashboard"

def parse_cookies(h: str) -> dict:
    if not h: return {}
    out = {}
    for p in h.split(";"):
        if "=" in p:
            k, v = p.strip().split("=", 1)
            out[k] = v
    return out

def build_cdn_base(version: str, template: str) -> str:
    repl = {"owner": OWNER, "repo": REPO, "version": version}
    base = re.sub(r"\{(owner|repo|version)\}", lambda m: repl[m.group(1)], template)
    return base if base.endswith("/") else base + "/"

def wsgi(environ, start_response):
    qs = parse_qs(environ.get("QUERY_STRING", ""), keep_blank_values=True)
    ck = parse_cookies(environ.get("HTTP_COOKIE", ""))

    headers = [("Content-type", "text/html; charset=UTF-8")]

    if "version" in qs:
        v = (qs.get("version") or [""])[0]
        headers.append(("Set-Cookie", f"version={v}; Path=/; HttpOnly; SameSite=Lax"))
        ck["version"] = v
    if "cdn" in qs:
        c = (qs.get("cdn") or [""])[0]
        headers.append(("Set-Cookie", f"cdn={c}; Path=/; HttpOnly; SameSite=Lax"))
        ck["cdn"] = c

    version = ck.get("version") or DEFAULT_VERSION
    cdn_template = ck.get("cdn") or DEFAULT_CDN_TEMPLATE
    cdn_base = build_cdn_base(version, cdn_template)

    p = environ.get("PATH_INFO", "")
    if p.startswith("/assets/"):
        start_response("302 Found", headers + [("Location", cdn_base + "assets/" + p[len("/assets/"):])])
        return []

    js = f"""
    <script>
      (function() {{
        function boot() {{
          const base = {json.dumps(cdn_base)};
          const version = {json.dumps(version)};
          const cdnTemplate = {json.dumps(cdn_template)};
          console.log('[manifest] cfg', base, version, cdnTemplate);
          const url = base + 'manifest.json';
          console.log('[manifest] fetch', url);
          fetch(url)
            .then(r => {{ console.log('[manifest] manifest fetch status', r.status); return r.json(); }})
            .then(data => {{
              console.log('[manifest] manifest data', data);
              const e = data["index.html"];
              if (!e || !e.file) throw new Error('manifest missing index.html');
              if (Array.isArray(e.css) && e.css[0]) {{
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.crossOrigin = 'anonymous';
                link.href = base + e.css[0];
                document.head.appendChild(link);
                console.log('[manifest] css appended', link.href);
              }}
              const s = document.createElement('script');
              s.type = 'module';
              s.crossOrigin = 'anonymous';
              s.src = base + e.file;
              document.head.appendChild(s);
              console.log('[manifest] script appended', s.src);
            }})
            .catch(err => {{ console.error('[manifest] boot error', err); throw err; }});
        }}
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
      }})();
    </script>
    """

    html = f"""<!doctype html>
<html lang="en" class="group/html">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dyson Protocol Dashboard</title>
    <meta name="description" content="Make Dwapps, get Paid." />
    <script>
      ;(() => {{
        try {{
          const k = 'vueuse-color-scheme'
          const s = localStorage.getItem(k)
          const d = s ? s : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          if (d === 'dark') document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
          console.log('[theme/bootstrap] resolved', {{ stored: s, applied: d }})
        }} catch (e) {{
          console.warn('[theme/bootstrap] error', e)
        }}
      }})()
    </script>
  </head>
  <body>
    <div id="app">Loading...</div>
  </body>
  {js}
</html>"""

    start_response("200 OK", headers)
    return [html.encode()]

if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    host, port = "0.0.0.0", 8080
    try:
        httpd = make_server(host, port, wsgi)
        print(f"Serving on http://{host}:{port}")
        httpd.serve_forever()
    except Exception as e:
        print(f"Error: {e}")
        httpd.shutdown()
        httpd.server_close()

