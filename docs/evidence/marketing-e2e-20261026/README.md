# Evidencia de marketing: distinguir entornos

PR: https://github.com/DigitalAppcorp/pazo-app/pull/125 (DRAFT, no merge).
Código reconciliado: bf7ca3e113a8953fb2dcb604752af651523ff320.
CI inicial: https://github.com/DigitalAppcorp/pazo-app/actions/runs/40387638158
(en ejecución al registrar esta referencia; no se afirma PASS anticipado).

- `prepared-migrations.json`: ambas fuentes exactas de PR91, sin aplicación alojada.
- `local-tests.json`: resúmenes y SHA256 de logs locales, no correos/proveedores reales.
- `synthetic-*.png`: fixtures del laboratorio PG17; “Collection active” es simulado.
- `hosted-pwa.json`: siete observaciones HTTP públicas reales, sin sesión/cobros.
- `hosted-browser.json` / `hosted-390.png`: carga pública real, POST bloqueado;
  no autentica usuarios, no certifica datos de RPC ni una PWA física instalada.
- `hosted-preflight.json`: metadatos leídos de Supabase/Vercel; no secretos ni
  datos de usuarios; salud financiera interna momentánea, no venta real.

Los datos sintéticos no son resultados comerciales. No crear campañas ni gastar.
Estado y gate autoritativo: [informe](../../PAZO_MARKETING_E2E_READINESS_20261026.md).
