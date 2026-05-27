/**
 * Playwright route mocks for all RegNav API endpoints.
 *
 * IMPORTANT: Playwright processes routes last-registered-first (most recently
 * registered handler wins). Register generic catch-all routes FIRST and the
 * most specific routes LAST so the specific handlers take precedence.
 */
import type { Page, Route } from '@playwright/test';

export const DOC_ID  = 'a0000000-0000-0000-0000-000000000001';
export const JOB_ID  = 'b0000000-0000-0000-0000-000000000001';
export const RULE_ID = 'c0000000-0000-0000-0000-000000000001';
export const RUN_ID  = 'd0000000-0000-0000-0000-000000000001';

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function mockDoc() {
  return {
    id: DOC_ID,
    title: 'TX WC Notice 2026-12',
    sourceType: 'text',
    sourceUrl: null,
    stateCode: 'TX',
    lob: 'workers_comp',
    status: 'ready',
    chunkCount: 3,
    createdAt: '2026-05-01T00:00:00Z',
    archiveContentType: null,
    archiveSizeBytes: null,
  };
}

function mockJob() {
  return {
    id: JOB_ID,
    type: 'ruleminer',
    status: 'completed',
    progress: 100,
    progressMessage: 'Done',
    input: {},
    output: { rulesExtracted: 1 },
    error: null,
    attempts: 1,
    maxAttempts: 3,
    priority: 0,
    workerId: null,
    createdAt: '2026-05-01T00:00:00Z',
    startedAt: '2026-05-01T00:00:01Z',
    completedAt: '2026-05-01T00:00:05Z',
  };
}

function mockRuleDraft() {
  return {
    id: RULE_ID,
    ruleCode: 'TX-WC-0001',
    title: 'Coverage must include all employees',
    text: 'All employees must be covered under the WC policy.',
    rationale: 'State statute §401.021',
    ruleType: 'compliance',
    status: 'draft',
    stateCode: 'TX',
    lineOfBusiness: 'workers_comp',
    confidenceScore: 0.92,
    effectiveDate: null,
    reviewedAt: null,
    documentId: DOC_ID,
    createdAt: '2026-05-01T00:00:00Z',
  };
}

function mockValidationRun() {
  return {
    id: RUN_ID,
    filename: 'policy.wcpols',
    fileType: 'wcpols',
    stateCode: 'TX',
    lob: 'workers_comp',
    status: 'completed',
    totalRecords: 3,
    violationsFound: 2,
    createdAt: '2026-05-01T00:00:00Z',
    completedAt: '2026-05-01T00:00:05Z',
  };
}

function mockValidationResults() {
  return [
    { id: 'e1', runId: RUN_ID, recordIndex: 1, field: 'STATE', severity: 'error',
      message: 'Invalid state code: XX', ruleCode: 'STATE-001', ruleTitle: null },
    { id: 'e2', runId: RUN_ID, recordIndex: 2, field: 'CLASS_CODE', severity: 'warning',
      message: 'Missing class code', ruleCode: 'CLASS-002', ruleTitle: null },
  ];
}

function sseBody() {
  const data = JSON.stringify({
    id: JOB_ID,
    type: 'ruleminer',
    status: 'completed',
    progress: 100,
    message: 'Extraction complete',
    error: null,
    output: { rulesExtracted: 1 },
    attempts: 1,
  });
  return `event: done\ndata: ${data}\n\n`;
}

export async function mockAllApis(page: Page) {
  // ─────────────────────────────────────────────────────────────
  // Catch-all fallback — empty list for anything we forgot to mock.
  // Registered FIRST so specific routes below override it.
  // ─────────────────────────────────────────────────────────────
  await page.route(/\/api\/v1\//, (route: Route) =>
    route.fulfill(json([])),
  );

  // ─────────────────────────────────────────────────────────────
  // Analytics (no conflicts)
  // ─────────────────────────────────────────────────────────────
  await page.route(/\/api\/v1\/analytics\/summary/, (route: Route) =>
    route.fulfill(json({
      documents: 5,
      rules: { total: 3, draft: 1, approved: 2, rejected: 0 },
      validations: { total: 4, today: 1, violationsRate: 0.25 },
      complianceScore: 87,
    })),
  );

  // ─────────────────────────────────────────────────────────────
  // Misc routes needed for visual capture across all pages
  // ─────────────────────────────────────────────────────────────
  await page.route(/\/api\/v1\/health\/llm/, (route: Route) =>
    route.fulfill(json({
      overall: true,
      providers: {
        anthropic: { ok: true, latency_ms: 412 },
        openai:    { ok: true, latency_ms: 287, dimensions: 1536 },
      },
    })),
  );
  await page.route(/\/api\/v1\/config/, (route: Route) =>
    route.fulfill(json({
      entries: [
        { key: 'chat_model',         value: 'claude-sonnet-4-20250514', default: 'claude-sonnet-4-20250514', isOverridden: false },
        { key: 'embedding_model',    value: 'text-embedding-3-small',   default: 'text-embedding-3-small',   isOverridden: false },
        { key: 'rag_top_k',          value: '8',                        default: '8',                        isOverridden: false },
        { key: 'default_state_code', value: 'TX',                       default: '',                         isOverridden: true  },
        { key: 'default_lob',        value: 'workers_comp',             default: '',                         isOverridden: true  },
      ],
    })),
  );
  await page.route(/\/api\/v1\/users\/me/, (route: Route) =>
    route.fulfill(json({
      id: '00000000-0000-0000-0000-000000000002',
      email: 'dev@localhost',
      displayName: 'Dev User',
      roles: ['platform_admin'],
      tenantId: '00000000-0000-0000-0000-000000000001',
    })),
  );
  await page.route(/\/api\/v1\/users/, (route: Route) =>
    route.fulfill(json([
      { id: 'u1', email: 'alice@example.com', displayName: 'Alice', roles: ['compliance_officer'], status: 'active', createdAt: '2026-04-01T00:00:00Z' },
      { id: 'u2', email: 'bob@example.com',   displayName: 'Bob',   roles: ['analyst'],            status: 'active', createdAt: '2026-04-15T00:00:00Z' },
    ])),
  );
  await page.route(/\/api\/v1\/organizations/, (route: Route) =>
    route.fulfill(json([
      { id: 'o1', name: 'Acme Insurance', kind: 'carrier', country: 'US', state: 'TX', createdAt: '2026-04-01T00:00:00Z' },
    ])),
  );
  await page.route(/\/api\/v1\/audit/, (route: Route) =>
    route.fulfill(json([])),
  );
  await page.route(/\/api\/v1\/tenants/, (route: Route) =>
    route.fulfill(json([])),
  );
  await page.route(/\/api\/v1\/profiles/, (route: Route) =>
    route.fulfill(json([])),
  );
  await page.route(/\/api\/v1\/regscout/, (route: Route) =>
    route.fulfill(json([])),
  );

  // ─────────────────────────────────────────────────────────────
  // Notifications — generic FIRST, specific LAST
  // ─────────────────────────────────────────────────────────────
  // 1. Generic list (registered first → lowest priority)
  await page.route(/\/api\/v1\/notifications/, (route: Route) =>
    route.fulfill(json([])),
  );
  // 2. mark-all-read
  await page.route(/\/api\/v1\/notifications\/read-all/, (route: Route) =>
    route.fulfill(json({ ok: true })),
  );
  // 3. mark single read
  await page.route(/\/api\/v1\/notifications\/[^/]+\/read/, (route: Route) =>
    route.fulfill(json({
      id: 'n1', eventType: 'test', title: 'Test', body: null, link: null,
      severity: 'info', readAt: new Date().toISOString(), createdAt: '2026-05-01T00:00:00Z',
    })),
  );
  // 4. unread count (registered last → highest priority)
  await page.route(/\/api\/v1\/notifications\/unread-count/, (route: Route) =>
    route.fulfill(json({ unread: 3 })),
  );

  // ─────────────────────────────────────────────────────────────
  // RegIngest — generic FIRST, specific LAST
  // ─────────────────────────────────────────────────────────────
  // 1. document list (generic)
  await page.route(/\/api\/v1\/regingest\/documents/, (route: Route) =>
    route.fulfill(json([mockDoc()])),
  );
  // 2. document detail/delete (specific, registered after list)
  await page.route(/\/api\/v1\/regingest\/documents\/[^/]+/, (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill(json(mockDoc()));
  });
  // 3. text + url + file ingest (no overlap with documents paths)
  await page.route(/\/api\/v1\/regingest\/from-text/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );
  await page.route(/\/api\/v1\/regingest\/from-url/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );
  await page.route(/\/api\/v1\/regingest\/from-file/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );

  // ─────────────────────────────────────────────────────────────
  // Jobs — generic FIRST, SSE stream LAST
  // ─────────────────────────────────────────────────────────────
  // 1. Job list (generic)
  await page.route(/\/api\/v1\/jobs/, (route: Route) =>
    route.fulfill(json([mockJob()])),
  );
  // 2. Job detail (specific)
  await page.route(/\/api\/v1\/jobs\/[^/]+/, (route: Route) =>
    route.fulfill(json(mockJob())),
  );
  // 3. SSE stream — registered LAST so it wins over the detail handler
  await page.route(/\/api\/v1\/jobs\/[^/]+\/events/, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody(),
    }),
  );

  // ─────────────────────────────────────────────────────────────
  // RuleMiner — generic FIRST, most-specific LAST
  // ─────────────────────────────────────────────────────────────
  // 1. Rules list (generic)
  await page.route(/\/api\/v1\/ruleminer\/rules/, (route: Route) =>
    route.fulfill(json([mockRuleDraft()])),
  );
  // 2. Extract (no overlap with rules path)
  await page.route(/\/api\/v1\/ruleminer\/extract/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );
  // 3. Specific rule (detail/delete)
  await page.route(new RegExp(`/api/v1/ruleminer/rules/${RULE_ID}`), (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill(json(mockRuleDraft()));
  });
  // 4. Reject (registered after detail)
  await page.route(new RegExp(`/api/v1/ruleminer/rules/${RULE_ID}/reject`), (route: Route) =>
    route.fulfill(json({ ...mockRuleDraft(), status: 'rejected' })),
  );
  // 5. Approve — registered LAST (highest priority)
  await page.route(new RegExp(`/api/v1/ruleminer/rules/${RULE_ID}/approve`), (route: Route) =>
    route.fulfill(json({ ...mockRuleDraft(), status: 'approved', reviewedAt: new Date().toISOString() })),
  );

  // ─────────────────────────────────────────────────────────────
  // RegValidate — generic FIRST, results LAST
  // ─────────────────────────────────────────────────────────────
  // 1. Runs list (generic)
  await page.route(/\/api\/v1\/regvalidate\/runs/, (route: Route) =>
    route.fulfill(json([mockValidationRun()])),
  );
  // 2. Validate (no overlap with runs path)
  await page.route(/\/api\/v1\/regvalidate\/validate/, (route: Route) =>
    route.fulfill(json(mockValidationRun())),
  );
  // 3. Specific run (detail/delete)
  await page.route(new RegExp(`/api/v1/regvalidate/runs/${RUN_ID}`), (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill(json(mockValidationRun()));
  });
  // 4. Results — registered LAST (highest priority)
  await page.route(new RegExp(`/api/v1/regvalidate/runs/${RUN_ID}/results`), (route: Route) =>
    route.fulfill(json(mockValidationResults())),
  );
}
