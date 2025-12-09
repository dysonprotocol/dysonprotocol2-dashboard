"""
Migration Swap Script

Swaps IBC-wrapped old DYS tokens for native udys at 1:1 rate.

Usage:
    1. Call swap() with an attached MsgSend that transfers IBC tokens to this script
    2. Script sends back equivalent udys

The script address must be pre-funded with udys reserves.
"""

from dys import (
    _query,
    _msg,
    get_executor_address,
    get_script_address,
    get_attached_messages,
    emit_event,
)

# IBC denom for old DYS on the new chain
# SHA256("transfer/channel-1/dys") = 2ED385C0A97745B42B6A82A1CDECA206C005037E5FF620D12D0CEADCC6F35141
IBC_OLD_DYS_DENOM = (
    "ibc/2ED385C0A97745B42B6A82A1CDECA206C005037E5FF620D12D0CEADCC6F35141"
)

# Native denom on new chain
NATIVE_DENOM = "udys"


def swap():
    """
    Swap IBC old DYS tokens for native udys.

    This function expects an attached MsgSend that transfers IBC tokens
    to this script address. It will verify the transfer and send back
    the equivalent amount of native udys.

    Conversion rate: 1:1 (1 ibc/old-dys = 1 udys)

    The swap is atomic - if anything fails, no tokens are transferred.

    Returns:
        dict: Swap result with amount, recipient, and denoms

    Raises:
        ValueError: If no IBC tokens attached, or insufficient reserves
    """
    caller = get_executor_address()
    script = get_script_address()

    # Get attached messages - must contain the IBC token transfer
    attached = get_attached_messages()

    if not attached:
        raise ValueError("No attached messages. Include MsgSend with IBC tokens.")

    # Sum up IBC tokens transferred to this script
    ibc_amount = 0
    for msg in attached:
        if msg.get("@type") == "/cosmos.bank.v1beta1.MsgSend":
            if msg.get("to_address") == script:
                for coin in msg.get("amount", []):
                    if coin.get("denom") == IBC_OLD_DYS_DENOM:
                        ibc_amount += int(coin.get("amount", "0"))
                    else:
                        raise ValueError(
                            f"Invalid denom: {coin.get('denom')}. Expected: {IBC_OLD_DYS_DENOM}"
                        )
            else:
                raise ValueError(
                    f"Invalid to address: {msg.get('to_address')}. Expected: {script}"
                )
        else:
            raise ValueError(f"Invalid message type: {msg.get('@type')}")

    if ibc_amount <= 0:
        raise ValueError(
            f"No IBC tokens transferred. Expected denom: {IBC_OLD_DYS_DENOM}"
        )

    # Check reserves
    reserves_result = _query(
        {
            "@type": "/cosmos.bank.v1beta1.QueryBalanceRequest",
            "address": script,
            "denom": NATIVE_DENOM,
        }
    )
    reserves = int(reserves_result.get("balance", {}).get("amount", "0"))
    if reserves < ibc_amount:
        raise ValueError(
            f"Insufficient reserves: have {reserves} udys, need {ibc_amount}"
        )

    # Send native tokens to caller (1:1 swap)
    _msg(
        {
            "@type": "/cosmos.bank.v1beta1.MsgSend",
            "from_address": script,
            "to_address": caller,
            "amount": [{"denom": NATIVE_DENOM, "amount": str(ibc_amount)}],
        }
    )
    emit_event("amount_swapped", str(ibc_amount))

    return {
        "amount_swapped": ibc_amount,
    }


# =============================================================================
# WSGI Dashboard Loader
# =============================================================================

import re, json
from urllib.parse import parse_qs

from dys import get_script_address, get_executor_address, _msg, _query

DEFAULT_VERSION = "0f3461e"
DEFAULT_CDN_TEMPLATE = "https://cdn.jsdelivr.net/gh/{owner}/{repo}@{version}/dist/"
OWNER = "dysonprotocol"
REPO = "dysonprotocol2-dashboard"


def parse_cookies(h: str) -> dict:
    if not h:
        return {}
    out = {}
    for p in h.split(";"):
        if "=" in p:
            k, v = p.strip().split("=", 1)
            out[k] = v
    return out


def msg(**kwargs):
    assert get_executor_address() == "dys217gxwmfaxq0qvprqg8ugxm0lqpwjfg875jcg9uf"
    return _msg(kwargs)


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
        start_response(
            "302 Found",
            headers + [("Location", cdn_base + "assets/" + p[len("/assets/") :])],
        )
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

