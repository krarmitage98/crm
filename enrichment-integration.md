# AI enhancement integration

The AI Enhancer is deliberately provider-neutral. The CRM talks to one secure server endpoint; that endpoint can call one third-party service or combine several specialist providers.

## Suggested pipeline

1. Resolve the organisation's official domain from its name, email domain and existing website.
2. Treat the official website as the canonical company anchor. Read its structured data and metadata for the canonical name, description, logo/icon and verified social links.
3. Search the official site and an asset provider for additional logo candidates.
4. Ask an organisation-enrichment provider for industry, employee range, description and social profiles.
5. Ask a contact provider for professional profile, current title and a headshot candidate where permitted.
6. Use an AI model to normalise competing results, summarise source material and flag conflicts.
7. Return suggestions with their provider, source URL, observation date and confidence score.
8. Store the suggestions for human acceptance or rejection. Do not overwrite trusted CRM fields automatically.

The adapters are replaceable. This allows Workgroup to use a third-party supplier initially, change supplier later, or combine a low-cost logo service with a stronger contact-data provider.

## Fixed-cost first provider stack

- **Official company website:** canonical name, page description, structured organisation data and verified social/profile links.
- **Logo.dev Community:** company autocomplete, official domain matching and logo candidates, with its secret search key held only in Supabase.
- **Outlook and existing CRM data:** contact identity, email history and organisation evidence already available to the signed-in user.
- **Public sources:** supplementary company descriptions and verified links where the official site does not supply them.
- **CRM enhancement rules:** collapse duplicate domains, preserve source evidence and require human approval.

This first version has no pay-as-you-go provider. It uses the free Logo.dev allowance and cannot create a variable enrichment bill.

## Browser request

`enrichment-adapter.js` sends this provider-neutral shape:

```json
{
  "workspaceId": "workspace-id",
  "eventflowEventId": "event-cmo-london-nov-2026",
  "entityType": "organisation",
  "entityId": "organisation-id",
  "name": "Northstar Systems",
  "domain": "northstarsystems.example",
  "websiteUrl": "https://northstarsystems.example",
  "fields": ["domain", "logoUrl", "industry", "employeeRange", "description"]
}
```

The endpoint returns:

```json
{
  "jobId": "job-id",
  "status": "complete",
  "suggestions": [
    {
      "entityType": "organisation",
      "entityId": "organisation-id",
      "field": "logoUrl",
      "suggestedValue": "https://assets.example/logo.png",
      "confidence": 94,
      "source": {
        "provider": "chosen-provider",
        "label": "Official website",
        "url": "https://company.example"
      },
      "observedAt": "2026-07-23T10:00:00Z"
    }
  ]
}
```

## Live organisation search

The same secure endpoint also powers the organisation picker while someone is typing. Existing CRM matches are shown first without making a network request. If a provider is connected, the adapter sends:

```json
{
  "action": "search-organisations",
  "workspaceId": "workspace-id",
  "query": "northstar syst"
}
```

The endpoint returns selectable company candidates:

```json
{
  "organisations": [
    {
      "id": "provider-company-id",
      "name": "Northstar Systems",
      "domain": "northstarsystems.example",
      "logoUrl": "https://assets.example/northstar-logo.png",
      "industry": "Technology",
      "employeeRange": "500–1,000",
      "description": "Company summary",
      "confidence": 96,
      "source": {
        "provider": "chosen-provider",
        "label": "Company directory",
        "url": "https://provider.example/company/northstar"
      }
    }
  ]
}
```

Choosing a result links the canonical organisation immediately. New organisations are created only when no suitable match is selected, then queued for logo and company-detail enrichment.

The live organisation picker calls the secure Supabase function, which searches Logo.dev by company name and returns the official domain and a ready-to-display logo URL. Logo.dev's publishable image key is safe in browser code; its secret search key is never exposed. The preview still searches Wikidata as a supplementary public source, with duplicates collapsed by domain.

## Supabase deployment

- Deploy the enrichment endpoint as a Supabase Edge Function or equivalent server service.
- Store all third-party and AI API keys in server-side secrets.
- Validate the signed-in user and workspace before starting a job.
- Apply row-level security to jobs, suggestions and assets.
- Download approved external images into managed storage instead of relying permanently on third-party URLs.
- Keep asset provenance, licence or usage notes, content hash and last-checked date.
- Rate-limit jobs and cache provider results to control cost.

`config.js` only contains the public endpoint and Supabase publishable configuration. It must never contain a third-party secret.
When Supabase authentication is connected, the application can also supply an async `getAccessToken` function in that configuration; the adapter adds the returned user token as a bearer token.

## Eventfrog behaviour

Eventfrog reads accepted CRM values only. Tasks such as “submit sponsor logos” can open the relevant organisation or enhancement review in the sister CRM, while approved logos and people details can be displayed as if they were native Eventfrog data.
