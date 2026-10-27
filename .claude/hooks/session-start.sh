#!/bin/bash
# SessionStart hook'as Claude Code debesies sesijoms: užtikrina, kad būtų Deno.
#
# Įprastai Deno jau įdiegia debesies aplinkos setup script'as (jo rezultatas kešuojamas), todėl
# čia — tik atsarginis kelias sesijoms, paleistoms kitoje aplinkoje (pvz. „Default“). Plačiau —
# CLAUDE.md „Debesies aplinka“.
set -euo pipefail

# Tik debesies sesijose — lokaliai Deno žmogus įsidiegia pats.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if command -v deno >/dev/null 2>&1; then
  exit 0
fi

# "Trusted" tinkle dl.deno.land užblokuotas, todėl — oficialus npm paketas "deno" (naujausia 2.x,
# kaip CI). Tinklo šliuzas perima TLS savo CA iš sistemos saugyklos; be --use-openssl-ca npm
# krenta su "self-signed certificate in certificate chain".
export NODE_OPTIONS="${NODE_OPTIONS:---use-openssl-ca}"
npm install -g --no-fund --no-audit --loglevel=error deno@2
echo "Deno įdiegtas: $(deno --version | head -n 1)"
