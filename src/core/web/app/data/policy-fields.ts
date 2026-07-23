// Typed metadata for Auto-save Policy controls and their documentation anchors.
export type PolicyFieldPath =
  | 'autonomous_writes.enabled'
  | 'autonomous_writes.mode'
  | 'autonomous_writes.allowed_types'
  | 'autonomous_writes.allowed_scopes'
  | 'autonomous_writes.allowed_sources'
  | 'autonomous_writes.confidence_threshold'
  | 'autonomous_writes.daily_limit'
  | 'autonomous_writes.rollback_retention_days'
  | 'review.max_rule_lines'
  | 'review.benchmark_min_recall_at_k'
  | 'review.mandatory_metadata.context'
  | 'review.mandatory_metadata.triggers'
  | 'review.mandatory_metadata.role';

export type PolicyFieldMeta = {
  path: PolicyFieldPath;
  label: string;
  description?: string;
  docsPage: 'policy';
  docsAnchor: string;
};

export const POLICY_FIELD_META: Record<PolicyFieldPath, PolicyFieldMeta> = {
  'autonomous_writes.enabled': {
    path: 'autonomous_writes.enabled',
    label: 'Allow auto-save',
    description: 'Permit policy-approved candidates to write without an interactive prompt.',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-enabled',
  },
  'autonomous_writes.mode': {
    path: 'autonomous_writes.mode',
    label: 'Write mode',
    description: 'Review-only defers candidates; autonomous permits eligible writes.',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-mode',
  },
  'autonomous_writes.allowed_types': {
    path: 'autonomous_writes.allowed_types',
    label: 'Allowed types',
    description: 'Choose one or more memory types.',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-allowed-types',
  },
  'autonomous_writes.allowed_scopes': {
    path: 'autonomous_writes.allowed_scopes',
    label: 'Allowed scopes',
    description: 'Choose one or more save scopes.',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-allowed-scopes',
  },
  'autonomous_writes.allowed_sources': {
    path: 'autonomous_writes.allowed_sources',
    label: 'Allowed sources',
    description: 'Choose one or more automation sources.',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-allowed-sources',
  },
  'autonomous_writes.confidence_threshold': {
    path: 'autonomous_writes.confidence_threshold',
    label: 'Confidence threshold',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-confidence-threshold',
  },
  'autonomous_writes.daily_limit': {
    path: 'autonomous_writes.daily_limit',
    label: 'Daily write limit',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-daily-limit',
  },
  'autonomous_writes.rollback_retention_days': {
    path: 'autonomous_writes.rollback_retention_days',
    label: 'Rollback retention days',
    docsPage: 'policy',
    docsAnchor: 'autonomous-writes-rollback-retention-days',
  },
  'review.max_rule_lines': {
    path: 'review.max_rule_lines',
    label: 'Review rule line limit',
    docsPage: 'policy',
    docsAnchor: 'review-max-rule-lines',
  },
  'review.benchmark_min_recall_at_k': {
    path: 'review.benchmark_min_recall_at_k',
    label: 'Minimum recall benchmark',
    docsPage: 'policy',
    docsAnchor: 'review-benchmark-min-recall-at-k',
  },
  'review.mandatory_metadata.context': {
    path: 'review.mandatory_metadata.context',
    label: 'Require context metadata',
    description: 'Require this field before a policy candidate can be written.',
    docsPage: 'policy',
    docsAnchor: 'review-mandatory-metadata-context',
  },
  'review.mandatory_metadata.triggers': {
    path: 'review.mandatory_metadata.triggers',
    label: 'Require triggers metadata',
    description: 'Require this field before a policy candidate can be written.',
    docsPage: 'policy',
    docsAnchor: 'review-mandatory-metadata-triggers',
  },
  'review.mandatory_metadata.role': {
    path: 'review.mandatory_metadata.role',
    label: 'Require role metadata',
    description: 'Require this field before a policy candidate can be written.',
    docsPage: 'policy',
    docsAnchor: 'review-mandatory-metadata-role',
  },
};

export function policyFieldMeta(path: PolicyFieldPath): PolicyFieldMeta {
  return POLICY_FIELD_META[path];
}
