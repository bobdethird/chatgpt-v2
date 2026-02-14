"use client";

import { type ReactNode, useMemo } from "react";
import {
  Renderer,
  type ComponentRenderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { registry, Fallback } from "./registry";

// =============================================================================
// Spec deduplication
// =============================================================================

/**
 * Sanitize a spec so that no children array or repeated state array contains
 * duplicates. The json-render Renderer uses element keys and repeat item keys
 * as React keys, so duplicates trigger React warnings.
 */
function deduplicateSpec(spec: Spec): Spec {
  const elements: Record<string, any> = {};
  let elementsDirty = false;

  for (const [key, element] of Object.entries(spec.elements)) {
    const el = element as any;

    // 1. Deduplicate children arrays (same element key listed twice)
    if (Array.isArray(el.children)) {
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const child of el.children) {
        if (!seen.has(child)) {
          seen.add(child);
          unique.push(child);
        }
      }
      if (unique.length !== el.children.length) {
        elements[key] = { ...el, children: unique };
        elementsDirty = true;
        continue;
      }
    }

    elements[key] = el;
  }

  // 2. Deduplicate state arrays used by repeat elements
  let state = spec.state;
  let stateDirty = false;

  if (state) {
    for (const el of Object.values(elements)) {
      const repeat = (el as any).repeat;
      if (!repeat?.statePath || !repeat?.key) continue;

      const segments = (repeat.statePath as string)
        .split("/")
        .filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let arr: any = state;
      for (const seg of segments) {
        if (arr && typeof arr === "object") arr = (arr as any)[seg];
        else {
          arr = undefined;
          break;
        }
      }

      if (!Array.isArray(arr)) continue;

      const keyField = repeat.key as string;
      const seen = new Set<string>();
      const unique: unknown[] = [];
      for (const item of arr) {
        if (item && typeof item === "object" && keyField in item) {
          const val = String((item as any)[keyField]);
          if (seen.has(val)) continue;
          seen.add(val);
        }
        unique.push(item);
      }

      if (unique.length !== arr.length) {
        // Deep-clone state once, then set the deduped array
        if (!stateDirty) {
          state = JSON.parse(JSON.stringify(state));
          stateDirty = true;
        }
        let parent: any = state;
        for (let i = 0; i < segments.length - 1; i++) {
          parent = parent[segments[i]];
        }
        parent[segments[segments.length - 1]] = unique;
      }
    }
  }

  if (!elementsDirty && !stateDirty) return spec;

  return {
    ...spec,
    elements: elementsDirty ? elements : spec.elements,
    ...(stateDirty ? { state } : {}),
  };
}

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

export function ExplorerRenderer({
  spec,
  loading,
}: ExplorerRendererProps): ReactNode {
  const safeSpec = useMemo(
    () => (spec ? deduplicateSpec(spec) : null),
    [spec],
  );

  if (!safeSpec) return null;

  return (
    <StateProvider initialState={safeSpec.state ?? {}}>
      <VisibilityProvider>
        <ActionProvider>
          <Renderer
            spec={safeSpec}
            registry={registry}
            fallback={fallback}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}