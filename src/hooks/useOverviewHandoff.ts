import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useChatSession } from '../context/ChatSessionContext';
import { useDatasource } from '../context/DatasourceContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { ChatSessionRead, ConnectorResponse, DataSourceResponse } from '../types/api';
import { AUTO_OVERVIEW_ORIGIN } from '../lib/overviewSeen';
import { workspaceChatPath } from './useSessionInUrl';

const POLL_INTERVAL_MS = 1500;
/** Connector schema sync can take a while; files/sheets usually resolve within seconds. */
const HANDOFF_TIMEOUT_MS = 45_000;

export type OverviewHandoffPhase = 'syncing' | 'writing';

export interface OverviewHandoffState {
  active: boolean;
  phase: OverviewHandoffPhase;
}

interface StartOptions {
  /** Connector created by the flow (Postgres / Supabase); lets us show "syncing" vs "writing". */
  connectorId?: string;
}

type Source = DataSourceResponse | ConnectorResponse;

interface Baseline {
  sourceIds: Set<string>;
  overviewIds: Set<string>;
}

function snapshot(sources: readonly Source[]): Baseline {
  const sourceIds = new Set<string>();
  const overviewIds = new Set<string>();
  for (const s of sources) {
    sourceIds.add(s.id);
    if (s.overview_session_id) overviewIds.add(s.overview_session_id);
  }
  return { sourceIds, overviewIds };
}

function isConnector(source: Source): source is ConnectorResponse {
  return 'metadata_status' in source;
}

/** Minimal list entry for a session the backend just created (reconciled by a forced reload). */
function toSessionRecord(source: Source, sessionId: string): ChatSessionRead {
  const now = new Date().toISOString();
  return {
    id: sessionId,
    dataset_id: isConnector(source) ? null : source.id,
    connector_id: isConnector(source) ? source.id : null,
    title: `Overview of ${source.name}`,
    origin: AUTO_OVERVIEW_ORIGIN,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };
}

/**
 * After a datasource is connected, select it in the prompt box right away and, once the
 * backend has created its overview chat, open that chat atomically (list + active id + URL +
 * workspace pointer). New sources are found by diffing ids against the baseline captured when
 * the connection panel opened, so it works for files, Sheets and connectors alike.
 */
export function useOverviewHandoff(workspaceId: string | undefined) {
  const navigate = useNavigate();
  const { datasources, connectors, refreshDatasources, refreshConnectors } = useWorkspace();
  const { openSession } = useChatSession();
  const { setSelectedDatasourceId } = useDatasource();
  const [state, setState] = useState<OverviewHandoffState>({ active: false, phase: 'writing' });

  const sourcesRef = useRef<Source[]>([]);
  useEffect(() => {
    sourcesRef.current = [...datasources, ...connectors];
  }, [datasources, connectors]);
  const runIdRef = useRef(0);
  const baselineRef = useRef<Baseline | null>(null);

  useEffect(() => () => void (runIdRef.current += 1), []);

  /**
   * Snapshot the sources / overview chats that already exist. Call when the connection panel
   * opens so a source (or overview) created before `start()` runs is still recognised as new.
   */
  const arm = useCallback(() => {
    baselineRef.current = snapshot(sourcesRef.current);
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    setState((s) => ({ ...s, active: false }));
  }, []);

  const start = useCallback(
    async (options: StartOptions = {}): Promise<boolean> => {
      if (!workspaceId) return false;
      const runId = ++runIdRef.current;
      const baseline = baselineRef.current ?? snapshot(sourcesRef.current);
      baselineRef.current = null;
      const deadline = Date.now() + HANDOFF_TIMEOUT_MS;
      const isCurrent = () => runIdRef.current === runId;
      let selected = false;

      setState({ active: true, phase: options.connectorId ? 'syncing' : 'writing' });

      while (isCurrent() && Date.now() < deadline) {
        const [ds, cs] = await Promise.all([
          refreshDatasources({ silent: true }),
          refreshConnectors({ silent: true }),
        ]);
        if (!isCurrent()) return false;

        const all: Source[] = [...ds, ...cs];
        const fresh = options.connectorId
          ? cs.find((c) => c.id === options.connectorId)
          : all.find((s) => !baseline.sourceIds.has(s.id));

        // Select the new source as soon as it exists, whether or not an overview follows.
        if (fresh && !selected) {
          selected = true;
          setSelectedDatasourceId(fresh.id);
        }

        const overviewId =
          fresh?.overview_session_id && !baseline.overviewIds.has(fresh.overview_session_id)
            ? fresh.overview_session_id
            : null;
        if (fresh && overviewId) {
          openSession(toSessionRecord(fresh, overviewId), {
            workspaceId,
            sourceId: fresh.id,
          });
          navigate(workspaceChatPath(workspaceId, overviewId));
          setState((s) => ({ ...s, active: false }));
          return true;
        }

        if (fresh && isConnector(fresh)) {
          if (fresh.metadata_status === 'FAILED') break;
          setState({
            active: true,
            phase: fresh.metadata_status === 'COMPLETED' ? 'writing' : 'syncing',
          });
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      if (isCurrent()) {
        setState((s) => ({ ...s, active: false }));
        toast.info('Your overview will appear in your chats as soon as it is ready.');
      }
      return false;
    },
    [
      workspaceId,
      refreshDatasources,
      refreshConnectors,
      openSession,
      setSelectedDatasourceId,
      navigate,
    ],
  );

  return { state, arm, start, cancel };
}
