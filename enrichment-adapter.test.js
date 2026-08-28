const assert = require('node:assert/strict');

global.window = {
  CRM_CONFIG: {
    brandfetchClientId: 'public-client-id'
  }
};

let requestedUrl = '';
global.fetch = async (url) => {
  requestedUrl = url;
  return {
    ok: true,
    json: async () => [{
      brandId: 'brand-1',
      name: 'Example & Co',
      domain: 'www.example.com',
      icon: 'https://search.brandfetch.io/temporary-icon'
    }]
  };
};

require('./enrichment-adapter.js');

(async () => {
  const adapter = global.window.WorkgroupEnrichment;
  assert.equal(
    adapter.brandfetchLogoUrl('https://www.Example.com/about'),
    'https://cdn.brandfetch.io/domain/example.com/w/800/h/400/fallback/transparent/type/logo?c=public-client-id'
  );

  const results = await adapter.searchBrandfetch('Example & Co');
  assert.equal(
    requestedUrl,
    'https://api.brandfetch.io/v2/search/Example%20%26%20Co?c=public-client-id'
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].domain, 'example.com');
  assert.equal(
    results[0].logoUrl,
    'https://cdn.brandfetch.io/domain/example.com/w/800/h/400/fallback/transparent/type/logo?c=public-client-id'
  );
  assert.ok(!results[0].logoUrl.includes('temporary-icon'));

  console.log('CRM enrichment adapter tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
