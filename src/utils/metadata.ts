/**
 * Response metadata utilities for Senegal Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
  _citation?: import('./citation.js').CitationMetadata;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let freshness: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) freshness = row.value;
  } catch {
    // Ignore
  }

  return {
    data_source: 'Journal Officiel du Sénégal (jo.gouv.sn) — République du Sénégal',
    jurisdiction: 'SN',
    disclaimer:
      'This data is sourced from the Journal Officiel du Sénégal under public access principles. ' +
      'The authoritative versions are in French. ' +
      'Always verify with the official Journal Officiel portal (jo.gouv.sn).',
    freshness,
  };
}
