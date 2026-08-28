(() => {
  'use strict';

  const COMPANY_SUFFIXES = new Set([
    'and', 'the', 'company', 'co', 'limited', 'ltd', 'plc', 'llp',
    'inc', 'incorporated', 'corporation', 'corp', 'holdings'
  ]);

  function domainFromInput(value = '') {
    const raw = String(value).trim().toLowerCase();
    if (!raw || raw.includes(' ')) return '';
    try {
      const hostname = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function normalise(value = '') {
    const domain = domainFromInput(value);
    const source = domain ? domain.split('.')[0] : String(value);
    return source
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(token => token && !COMPANY_SUFFIXES.has(token))
      .join(' ');
  }

  function editDistance(left, right) {
    const a = String(left);
    const b = String(right);
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= b.length; column += 1) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
        );
      }
      previous.splice(0, previous.length, ...current);
    }
    return previous[b.length];
  }

  function similarity(left, right) {
    const a = normalise(left);
    const b = normalise(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const longest = Math.max(a.length, b.length);
    return longest ? 1 - editDistance(a, b) / longest : 0;
  }

  function keysFor(organisation) {
    return [
      organisation?.name,
      organisation?.domain,
      ...(Array.isArray(organisation?.aliases) ? organisation.aliases : [])
    ].filter(Boolean);
  }

  function findBest(input, organisations = []) {
    const target = normalise(input);
    if (!target) return null;
    const ranked = organisations.map(organisation => {
      const scores = keysFor(organisation).map(key => similarity(input, key));
      return { organisation, confidence: Math.max(0, ...scores) };
    }).sort((left, right) => right.confidence - left.confidence);
    const best = ranked[0];
    const runnerUp = ranked[1];
    if (!best || best.confidence < 0.78) return null;
    if (best.confidence < 0.9 && runnerUp && best.confidence - runnerUp.confidence < 0.07) return null;
    return {
      organisation: best.organisation,
      confidence: Math.round(best.confidence * 100),
      exact: best.confidence === 1
    };
  }

  function search(input, organisations = [], limit = 5) {
    const target = normalise(input);
    if (!target) return [];
    return organisations.map(organisation => {
      const keys = keysFor(organisation);
      let confidence = Math.max(0, ...keys.map(key => similarity(input, key)));
      if (keys.some(key => normalise(key).startsWith(target))) confidence = Math.max(confidence, 0.96);
      if (keys.some(key => normalise(key).includes(target))) confidence = Math.max(confidence, 0.9);
      return { organisation, confidence: Math.round(confidence * 100) };
    })
      .filter(item => item.confidence >= 35)
      .sort((left, right) => right.confidence - left.confidence || left.organisation.name.localeCompare(right.organisation.name))
      .slice(0, limit);
  }

  function titleCase(value) {
    const text = String(value || '').trim().replace(/\s+/g, ' ');
    if (/[A-Z]/.test(text)) return text;
    return text.replace(/\b[a-z]/g, letter => letter.toUpperCase());
  }

  function createDraft(input) {
    const domain = domainFromInput(input);
    const name = domain
      ? titleCase(domain.split('.')[0].replace(/[-_]+/g, ' '))
      : titleCase(input);
    return {
      name,
      domain,
      aliases: String(input).trim() && String(input).trim() !== name ? [String(input).trim()] : [],
      industry: '',
      employeeRange: '',
      description: '',
      logo: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      logoUrl: '',
      enrichment: 'Ready to enhance',
      notes: 'Organisation added dynamically and queued for company matching.'
    };
  }

  window.WorkgroupOrganisationMatcher = Object.freeze({
    normalise,
    similarity,
    findBest,
    search,
    createDraft
  });
})();
