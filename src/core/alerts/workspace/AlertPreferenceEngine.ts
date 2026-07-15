/**
 * Alert Preference Engine — saved filters/views/personalization (Sprint 9C.R7).
 */

import { safeAlertText } from "../AlertModels";
import type { AlertCenterFilterId, AlertCenterGroupBy } from "../center/AlertCenterModels";
import {
  DEFAULT_PREFERENCES,
  type AlertDensity,
  type AlertPreferences,
  type AlertSavedFilter,
  type AlertSavedSearch,
  type AlertSavedView,
} from "./AlertWorkspaceModels";

let prefSeq = 0;

export function resetPreferenceSequence(): void {
  prefSeq = 0;
}

export class AlertPreferenceEngine {
  private preferences: AlertPreferences = { ...DEFAULT_PREFERENCES };
  private readonly filters = new Map<string, AlertSavedFilter>();
  private readonly searches = new Map<string, AlertSavedSearch>();
  private readonly views = new Map<string, AlertSavedView>();

  clear(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.filters.clear();
    this.searches.clear();
    this.views.clear();
  }

  getPreferences(): AlertPreferences {
    return { ...this.preferences };
  }

  setPreferences(patch: Partial<AlertPreferences>): AlertPreferences {
    this.preferences = {
      ...this.preferences,
      ...patch,
      highlightColor: safeAlertText(
        patch.highlightColor ?? this.preferences.highlightColor,
        DEFAULT_PREFERENCES.highlightColor
      ),
    };
    return this.getPreferences();
  }

  saveFilter(input: {
    name: string;
    filter: AlertCenterFilterId;
    searchText?: string;
  }): AlertSavedFilter {
    prefSeq += 1;
    const saved: AlertSavedFilter = {
      id: `filter::${prefSeq}`,
      name: safeAlertText(input.name, `Filter ${prefSeq}`),
      filter: input.filter,
      searchText: safeAlertText(input.searchText, ""),
      createdAt: new Date().toISOString(),
    };
    this.filters.set(saved.id, saved);
    return { ...saved };
  }

  saveSearch(input: {
    name: string;
    query: string;
    ticker?: string;
  }): AlertSavedSearch {
    prefSeq += 1;
    const saved: AlertSavedSearch = {
      id: `search::${prefSeq}`,
      name: safeAlertText(input.name, `Search ${prefSeq}`),
      query: safeAlertText(input.query, ""),
      ticker: safeAlertText(input.ticker, ""),
      createdAt: new Date().toISOString(),
    };
    this.searches.set(saved.id, saved);
    return { ...saved };
  }

  saveView(input: {
    name: string;
    filter?: AlertCenterFilterId;
    groupBy?: AlertCenterGroupBy;
    sort?: AlertPreferences["defaultSort"];
    density?: AlertDensity;
  }): AlertSavedView {
    prefSeq += 1;
    const saved: AlertSavedView = {
      id: `view::${prefSeq}`,
      name: safeAlertText(input.name, `View ${prefSeq}`),
      filter: input.filter ?? this.preferences.defaultFilter,
      groupBy:
        input.groupBy ??
        (this.preferences.defaultGrouping === "none"
          ? "category"
          : this.preferences.defaultGrouping),
      sort: input.sort ?? this.preferences.defaultSort,
      density: input.density ?? this.preferences.defaultDensity,
      createdAt: new Date().toISOString(),
    };
    this.views.set(saved.id, saved);
    return { ...saved };
  }

  listFilters(): AlertSavedFilter[] {
    return [...this.filters.values()].map((f) => ({ ...f }));
  }

  listSearches(): AlertSavedSearch[] {
    return [...this.searches.values()].map((s) => ({ ...s }));
  }

  listViews(): AlertSavedView[] {
    return [...this.views.values()].map((v) => ({ ...v }));
  }

  removeView(id: string): boolean {
    return this.views.delete(id);
  }
}
