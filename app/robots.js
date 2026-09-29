const SITE = (process.env.SITE_URL || 'https://www.bfrenz.com').replace(/\/+$/, '');

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin', '/api/', '/mail', '/edit', '/home', '/requests', '/invite', '/report',
          '/blocked', '/reset', '/forgot', '/shop/success', '/bulletins',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
