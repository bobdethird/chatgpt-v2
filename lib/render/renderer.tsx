"use client";

import { type ReactNode, useMemo } from "react";
import {
  Renderer,
  type ComponentRenderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
  useStateStore,
} from "@json-render/react";

import { registry, handlers as createHandlers, Fallback } from "./registry";

// =============================================================================
// ExplorerRenderer
// =============================================================================

interface ExplorerRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

const fallback: ComponentRenderer = ({ element }) => (
  <Fallback type={element.type} />
);

function RendererWithActions({
  spec,
  loading,
}: {
  spec: Spec;
  loading?: boolean;
}): ReactNode {
  const store = useStateStore();
  const actionHandlers = useMemo(() => {
    const getSetState = () => (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      const next = updater(store.state);
      Object.entries(next).forEach(([key, value]) => {
        const path = key.startsWith("/") ? key : `/${key}`;
        store.set(path, value);
      });
    };
    const getState = () => store.state;
    return createHandlers(getSetState, getState);
  }, [store.state, store.set]);

  return (
    <VisibilityProvider>
      <ActionProvider handlers={actionHandlers}>
        <Renderer
          spec={spec}
          registry={registry}
          fallback={fallback}
          loading={loading}
        />
      </ActionProvider>
    </VisibilityProvider>
  );
}

export function ExplorerRenderer({
  spec,
  loading,
}: ExplorerRendererProps): ReactNode {
  if (!spec) return null;

  return (
    <StateProvider initialState={spec.state ?? {}}>
      <RendererWithActions spec={spec} loading={loading} />
    </StateProvider>
  );
}