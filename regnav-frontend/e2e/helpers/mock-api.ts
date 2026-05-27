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
    {
      id: 'e1', runId: RUN_ID, recordIndex: 1, field: 'STATE', severity: 'error',
      message: 'Invalid state code: XX', ruleCode: 'STATE-001', ruleTitle: null,
    },
    {
      id: 'e2', runId: RUN_ID, recordIndex: 2, field: 'CLASS_CODE', severity: 'warning',
      message: 'Missing class code', ruleCode: 'CLASS-002', ruleTitle: null,
    },
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
  // Analytics
  await page.route(/\/api\/v1\/analytics\/summary/, (route: Route) =>
    route.fulfill(json({
      documents: 5,
      rules: { total: 3, draft: 1, approved: 2, rejected: 0 },
      validations: { total: 4, today: 1, violationsRate: 0.25 },
      complianceScore: 87,
    })),
  );

  // Notifications — unread-count and read-all must come before generic pattern
  await page.route(/\/api\/v1\/notifications\/unread-count/, (route: Route) =>
    route.fulfill(json({ unread: 3 })),
  );
  await page.route(/\/api\/v1\/notifications\/read-all/, (route: Route) =>
    route.fulfill(json({ ok: true })),
  );
  await page.route(/\/api\/v1\/notifications\/[^/]+\/read/, (route: Route) =>
    route.fulfill(json({
      id: 'n1', eventType: 'test', title: 'Test', body: null, link: null,
      severity: 'info', readAt: new Date().toISOString(), createdAt: '2026-05-01T00:00:00Z',
    })),
  );
  await page.route(/\/api\/v1\/notifications/, (route: Route) =>
    route.fulfill(json([])),
  );

  // RegIngest — specific paths before generic /documents
  await page.route(/\/api\/v1\/regingest\/from-text/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );
  await page.route(/\/api\/v1\/regingest\/from-url/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );
  await page.route(/\/api\/v1\/regingest\/documents\/[^/]+/, (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill(json(mockDoc()));
  });
  await page.route(/\/api\/v1\/regingest\/documents/, (route: Route) =>
    route.fulfill(json([mockDoc()])),
  );

  // Jobs — SSE stream before generic job detail
  await page.route(/\/api\/v1\/jobs\/[^/]+\/events/, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody(),
    }),
  );
  await page.route(/\/api\/v1\/jobs\/[^/]+/, (route: Route) =>
    route.fulfill(json(mockJob())),
  );
  await page.route(/\/api\/v1\/jobs/, (route: Route) =>
    route.fulfill(json([mockJob()])),
  );

  // RuleMiner — approve/reject/delete before generic rules list
  await page.route(new RegExp(`/api/v1/ruleminer/rules/${RULE_ID}/approve`), (route: Route) =>
    route.fulfill(json({ ...mockRuleDraft(), status: 'approved', reviewedAt: new Date().toISOString() })),
  );
  await page.route(new RegExp(`/api/v1/ruleminer/rules/${RULE_ID}/reject`), (route: Route) =>
    route.fulfill(json({ ...mockRuleDraft(), status: 'rejected' })),
  );
  await page.route(new RegExp(`/api/v1/ruleminer/rules/${RULE_ID}`), (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill(json(mockRuleDraft()));
  });
  await page.route(/\/api\/v1\/ruleminer\/extract/, (route: Route) =>
    route.fulfill(json({ jobId: JOB_ID })),
  );
  await page.route(/\/api\/v1\/ruleminer\/rules/, (route: Route) =>
    route.fulfill(json([mockRuleDraft()])),
  );

  // RegValidate — results before runs/{id}, runs/{id} before list
  await page.route(new RegExp(`/api/v1/regvalidate/runs/${RUN_ID}/results`), (route: Route) =>
    route.fulfill(json(mockValidationResults())),
  );
  await page.route(new RegExp(`/api/v1/regvalidate/runs/${RUN_ID}`), (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill(json(mockValidationRun()));
  });
  await page.route(/\/api\/v1\/regvalidate\/validate/, (route: Route) =>
    route.fulfill(json(mockValidationRun())),
  );
  await page.route(/\/api\/v1\/regvalidate\/runs/, (route: Route) =>
    route.fulfill(json([mockValidationRun()])),
  );
}
