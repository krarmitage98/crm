(() => {
  'use strict';

  const FIELD_LABELS = {
    domain: 'Official website',
    logoUrl: 'Company logo',
    industry: 'Industry',
    employeeRange: 'Employee range',
    description: 'Company summary',
    jobTitle: 'Job title',
    linkedin: 'LinkedIn profile',
    headshotUrl: 'Headshot'
  };

  function normaliseSuggestion(item, request) {
    const source = item.source || {};
    return {
      entityType: item.entityType || request.entityType,
      entityId: item.entityId || request.entityId,
      field: item.field,
      fieldLabel: item.fieldLabel || FIELD_LABELS[item.field] || item.field,
      currentValue: item.currentValue ?? '',
      suggestedValue: item.suggestedValue ?? item.value ?? '',
      valueLabel: item.valueLabel || item.displayValue || item.suggestedValue || item.value || '',
      confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
      sourceLabel: source.label || item.sourceLabel || item.provider || 'Enrichment provider',
      sourceUrl: source.url || item.sourceUrl || '',
      provider: source.provider || item.provider || 'Provider adapter',
      observedAt: item.observedAt || new Date().toISOString()
    };
  }

  function isConfigured() {
    return Boolean(window.CRM_CONFIG?.enrichmentEndpoint);
  }

  function isCompanySearchConfigured() {
    return true;
  }

  function logoDevUrl(domain) {
    const cleanDomain = String(domain || '').trim().replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '');
    const token = String(window.CRM_CONFIG?.logoDevPublishableKey || '').trim();
    return cleanDomain && token
      ? `https://img.logo.dev/${encodeURIComponent(cleanDomain)}?token=${encodeURIComponent(token)}&size=256&format=png`
      : '';
  }

  function cleanDomain(value) {
    const input = String(value || '').trim();
    if (!input) return '';
    try {
      return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
        .hostname
        .replace(/^www\./i, '')
        .toLowerCase();
    } catch {
      return input.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '').toLowerCase();
    }
  }

  function brandfetchLogoUrl(domain) {
    const clean = cleanDomain(domain);
    const clientId = String(window.CRM_CONFIG?.brandfetchClientId || '').trim();
    return clean && clientId
      ? `https://cdn.brandfetch.io/domain/${encodeURIComponent(clean)}/w/800/h/400/fallback/transparent/type/logo?c=${encodeURIComponent(clientId)}`
      : '';
  }

  async function request(payload) {
    const endpoint = window.CRM_CONFIG?.enrichmentEndpoint;
    if (!endpoint) throw new Error('Connect the secure enrichment endpoint before running live research.');
    const accessToken = typeof window.CRM_CONFIG?.getAccessToken === 'function'
      ? await window.CRM_CONFIG.getAccessToken()
      : '';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(window.CRM_CONFIG?.supabasePublishableKey
          ? { apikey: window.CRM_CONFIG.supabasePublishableKey }
          : {})
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.message || `Enhancement service returned ${response.status}.`);
    }
    const result = await response.json();
    return {
      jobId: result.jobId || '',
      status: result.status || 'complete',
      suggestions: (result.suggestions || []).map(item => normaliseSuggestion(item, payload))
    };
  }

  async function searchOrganisationsViaEndpoint(query) {
    const endpoint = window.CRM_CONFIG?.enrichmentEndpoint;
    if (!endpoint) return [];
    const accessToken = typeof window.CRM_CONFIG?.getAccessToken === 'function'
      ? await window.CRM_CONFIG.getAccessToken()
      : '';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(window.CRM_CONFIG?.supabasePublishableKey
          ? { apikey: window.CRM_CONFIG.supabasePublishableKey }
          : {})
      },
      body: JSON.stringify({
        action: 'search-organisations',
        workspaceId: window.CRM_CONFIG?.workspaceId || '',
        query: String(query || '').trim()
      })
    });
    if (!response.ok) throw new Error('Company search is temporarily unavailable.');
    const result = await response.json();
    return (result.organisations || []).map((item, index) => ({
      id: item.id || `company-result-${index}`,
      name: item.name || '',
      domain: item.domain || '',
      logoUrl: item.logoUrl || '',
      industry: item.industry || '',
      employeeRange: item.employeeRange || '',
      description: item.description || '',
      confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
      sourceLabel: item.source?.label || item.sourceLabel || item.provider || 'Company search',
      sourceUrl: item.source?.url || item.sourceUrl || '',
      provider: item.source?.provider || item.provider || 'Company search adapter'
    })).map(item => ({
      ...item,
      logoUrl: item.logoUrl || logoDevUrl(item.domain)
    })).filter(item => item.name);
  }

  async function searchOrganisationsViaBrandfetch(query) {
    const clientId = String(window.CRM_CONFIG?.brandfetchClientId || '').trim();
    if (!clientId) return [];
    const response = await fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}?c=${encodeURIComponent(clientId)}`);
    if (!response.ok) throw new Error('Internet company search is temporarily unavailable.');
    const result = await response.json();
    return (Array.isArray(result) ? result : []).slice(0, 8).map((item, index) => {
      const domain = cleanDomain(item.domain);
      return {
        id: item.brandId || `brandfetch-result-${index}`,
        name: item.name || domain || '',
        domain,
        logoUrl: brandfetchLogoUrl(domain),
        industry: '',
        employeeRange: '',
        description: '',
        confidence: item.claimed ? 98 : 88,
        sourceLabel: 'Brandfetch company search',
        sourceUrl: domain ? `https://${domain}` : '',
        provider: 'Brandfetch'
      };
    }).filter(item => item.name && item.domain && item.logoUrl);
  }

  async function searchOrganisationsViaClearbit(query) {
    if (String(query || '').trim().length < 2) return [];
    const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const result = await response.json();
    const normalisedQuery = String(query).trim().toLowerCase();
    return (Array.isArray(result) ? result : []).slice(0, 8).map((item, index) => ({
      id: item.domain || `clearbit-result-${index}`,
      name: item.name || item.domain || '',
      domain: item.domain || '',
      logoUrl: item.logo || '',
      industry: '',
      employeeRange: '',
      description: '',
      confidence: String(item.name || '').trim().toLowerCase() === normalisedQuery ? 97 : 86,
      sourceLabel: 'Internet company directory',
      sourceUrl: item.domain ? `https://${item.domain}` : '',
      provider: 'Company autocomplete'
    })).filter(item => item.name);
  }

  function claimValue(entity, property) {
    return entity?.claims?.[property]?.find(claim => claim.rank !== 'deprecated')
      ?.mainsnak?.datavalue?.value || '';
  }

  async function searchOrganisationsViaWikidata(query) {
    if (String(query || '').trim().length < 2) return [];
    const searchParams = new URLSearchParams({
      action: 'wbsearchentities',
      search: String(query).trim(),
      language: 'en',
      format: 'json',
      limit: '10',
      origin: '*'
    });
    const searchResponse = await fetch(`https://www.wikidata.org/w/api.php?${searchParams}`);
    if (!searchResponse.ok) return [];
    const searchData = await searchResponse.json();
    const organisationWords = /\b(company|corporation|business|organisation|organization|enterprise|firm|group|bank|airline|manufacturer|retailer|publisher|newspaper|consultancy|services|agency|brand|foundation|charity|university)\b/i;
    const candidates = (searchData.search || [])
      .filter(item => organisationWords.test(`${item.label || ''} ${item.description || ''}`))
      .slice(0, 6);
    if (!candidates.length) return [];
    const entityParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: candidates.map(item => item.id).join('|'),
      props: 'claims',
      format: 'json',
      origin: '*'
    });
    const entityResponse = await fetch(`https://www.wikidata.org/w/api.php?${entityParams}`);
    const entityData = entityResponse.ok ? await entityResponse.json() : { entities: {} };
    return candidates.map(item => {
      const entity = entityData.entities?.[item.id];
      const website = String(claimValue(entity, 'P856') || '');
      const logoFile = String(claimValue(entity, 'P154') || '');
      let domain = '';
      try {
        domain = new URL(website).hostname.replace(/^www\./, '');
      } catch {}
      const exact = String(item.label || '').trim().toLowerCase() === String(query).trim().toLowerCase();
      return {
        id: item.id,
        name: item.label || '',
        domain,
        logoUrl: logoFile
          ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(logoFile)}`
          : '',
        industry: '',
        employeeRange: '',
        description: item.description || '',
        confidence: exact ? 94 : 78,
        sourceLabel: 'Wikidata internet search',
        sourceUrl: `https://www.wikidata.org/wiki/${encodeURIComponent(item.id)}`,
        provider: 'Wikidata'
      };
    }).filter(item => item.name);
  }

  async function searchOrganisations(query) {
    const searches = [
      searchOrganisationsViaClearbit(query),
      searchOrganisationsViaWikidata(query)
    ];
    if (window.CRM_CONFIG?.enrichmentEndpoint) searches.push(searchOrganisationsViaEndpoint(query));
    if (window.CRM_CONFIG?.brandfetchClientId) searches.push(searchOrganisationsViaBrandfetch(query));
    const results = (await Promise.allSettled(searches))
      .filter(item => item.status === 'fulfilled')
      .flatMap(item => item.value);
    const unique = new Map();
    results.forEach(item => {
      const key = String(item.domain || item.name).trim().toLowerCase();
      const existing = unique.get(key);
      if (!existing) {
        unique.set(key, item);
        return;
      }
      const preferred = item.confidence > existing.confidence ? item : existing;
      const supplement = preferred === item ? existing : item;
      unique.set(key, {
        ...preferred,
        logoUrl: preferred.logoUrl || supplement.logoUrl,
        description: preferred.description || supplement.description,
        industry: preferred.industry || supplement.industry,
        employeeRange: preferred.employeeRange || supplement.employeeRange
      });
    });
    return [...unique.values()].sort((left, right) => right.confidence - left.confidence).slice(0, 8);
  }

  window.WorkgroupEnrichment = Object.freeze({
    version: '1.0',
    capabilities: Object.keys(FIELD_LABELS),
    isConfigured,
    isCompanySearchConfigured,
    normaliseSuggestion,
    brandfetchLogoUrl,
    searchBrandfetch: searchOrganisationsViaBrandfetch,
    request,
    searchOrganisations
  });
})();
