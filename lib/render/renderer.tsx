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
// Spec Repair — fix common LLM generation issues
// =============================================================================

type SpecElement = {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  [key: string]: unknown;
};

/**
 * Repairs a spec by fixing two systematic LLM generation issues:
 *
 * 1. **Naming mismatches**: A parent references "forecast-tabs" but the actual
 *    element is "forecast-tabs-container". We detect orphaned elements whose key
 *    starts with the missing key and swap the reference.
 *
 * 2. **Missing Card wrappers**: A Grid references "ny-card" which doesn't exist,
 *    but "ny-header", "ny-metrics", "ny-details" are orphaned. We auto-create a
 *    Card element with those top-level orphans as children.
 */
function repairSpec(spec: Spec): Spec {
  if (!spec?.root || !spec.elements) return spec;

  const elements: Record<string, SpecElement> = {};
  for (const [k, v] of Object.entries(spec.elements)) {
    elements[k] = v as SpecElement;
  }

  // Collect all child references and build parent→child map
  const allChildRefs = new Set<string>();
  for (const el of Object.values(elements)) {
    for (const c of el.children ?? []) allChildRefs.add(c);
  }

  // Find missing refs (referenced as child but not in elements)
  const missingRefs = [...allChildRefs].filter((ref) => !elements[ref]);
  if (missingRefs.length === 0) return spec;

  // Find orphaned elements (defined but not referenced and not root)
  const referencedKeys = new Set<string>([spec.root, ...allChildRefs]);
  const orphanedKeys = new Set(
    Object.keys(elements).filter((k) => !referencedKeys.has(k)),
  );

  let changed = false;

  for (const missing of missingRefs) {
    // ----- Strategy 1: Naming mismatch -----
    // Look for an orphaned element whose key starts with the missing key
    // e.g. "forecast-tabs" → "forecast-tabs-container"
    const SUFFIXES = ["-container", "-inner", "-wrapper", "-content", "-section"];
    let matched = false;

    for (const suffix of SUFFIXES) {
      const candidate = missing + suffix;
      if (orphanedKeys.has(candidate) && elements[candidate]) {
        // Swap the reference in all parents
        for (const [key, el] of Object.entries(elements)) {
          if (el.children?.includes(missing)) {
            elements[key] = {
              ...el,
              children: el.children.map((c) => (c === missing ? candidate : c)),
            };
          }
        }
        orphanedKeys.delete(candidate);
        changed = true;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // ----- Strategy 2: Auto-create missing Card wrapper -----
    // "ny-card" → prefix "ny-" → find orphaned ny-* elements → wrap in Card
    const prefixMatch = missing.match(/^(.+)-card$/);
    if (!prefixMatch) continue;

    const prefix = prefixMatch[1] + "-";

    // Find orphaned elements that share this prefix
    const prefixedOrphans = [...orphanedKeys].filter(
      (k) => k.startsWith(prefix) && elements[k],
    );
    if (prefixedOrphans.length === 0) continue;

    // Among those, find the "top-level" ones — NOT a child of another prefixed orphan
    const childrenOfPrefixed = new Set<string>();
    for (const k of prefixedOrphans) {
      for (const c of elements[k]?.children ?? []) {
        childrenOfPrefixed.add(c);
      }
    }
    const topLevelOrphans = prefixedOrphans.filter(
      (k) => !childrenOfPrefixed.has(k),
    );

    if (topLevelOrphans.length > 0) {
      // Try to extract a meaningful title from a Heading child element
      let title: string | null = null;
      for (const orphanKey of prefixedOrphans) {
        const el = elements[orphanKey];
        if (el?.type === "Heading" && typeof el.props?.text === "string") {
          title = el.props.text as string;
          break;
        }
      }

      elements[missing] = {
        type: "Card",
        props: title ? { title } : {},
        children: topLevelOrphans,
      };

      // Remove these from orphans set
      for (const k of prefixedOrphans) orphanedKeys.delete(k);
      changed = true;
    }
  }

  if (!changed) return spec;
  return { ...spec, elements } as Spec;
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
  // Repair then deduplicate spec (memoized by spec reference)
  const safeSpec = useMemo(
    () => (spec ? deduplicateSpec(repairSpec(spec)) : null),
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
