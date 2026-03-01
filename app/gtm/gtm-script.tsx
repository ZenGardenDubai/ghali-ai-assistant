import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function GtmScript() {
  if (!GTM_ID || !GTM_ID_PATTERN.test(GTM_ID)) return null;

  return (
    <Script
      id="gtm-script"
      strategy="afterInteractive"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: GTM bootstrap requires inline initialization snippet.
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
      }}
    />
  );
}
