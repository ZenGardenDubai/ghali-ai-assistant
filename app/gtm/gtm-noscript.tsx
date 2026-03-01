const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function GtmNoScript() {
  if (!GTM_ID || !GTM_ID_PATTERN.test(GTM_ID)) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
