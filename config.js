window.CRM_CONFIG = {
  enrichmentEndpoint: 'https://ugouqwkbzmwimpgkegso.supabase.co/functions/v1/crm-enrichment',
  brandfetchClientId: localStorage.getItem('workgroup-brandfetch-client-id')
    || localStorage.getItem('workgroup-crm-brandfetch-client-id')
    || localStorage.getItem('workgroup-agenda-brandfetch-client-id')
    || '',
  logoDevPublishableKey: 'pk_Rz-WlodSQKiY7gt4Ef_gnA',
  supabaseUrl: 'https://ugouqwkbzmwimpgkegso.supabase.co',
  supabasePublishableKey: 'sb_publishable_bOXENCumPtOzVqKSaQ222w_VxN8HmfM',
  workspaceId: '00000000-0000-4000-8000-000000000001',
  getAccessToken: async () => (await window.WorkgroupCrmData?.session())?.access_token || ''
};
