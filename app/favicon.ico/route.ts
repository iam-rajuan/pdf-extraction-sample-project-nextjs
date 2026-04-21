export function GET() {
  const icon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0f172a"/>
  <path d="M18 16h28v32H18z" fill="#f8fafc"/>
  <path d="M24 25h16M24 32h16M24 39h10" stroke="#0f766e" stroke-width="4" stroke-linecap="round"/>
</svg>`.trim();

  return new Response(icon, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400"
    }
  });
}
