export { Widget, type WidgetProps, type WidgetMenuItem } from "./Widget";
export { WidgetEmptyState } from "./WidgetEmptyState";
export { WidgetSkeleton } from "./WidgetSkeleton";
export {
  WIDGET_SIZES,
  WIDGET_SIZE_SPECS,
  resolveWidgetSize,
  type WidgetSize,
  type WidgetSizeSpec,
} from "./widgetSizes";
export { KpiTile } from "./KpiTile";
export { ConvictionMeter } from "./ConvictionMeter";
export { RiskGauge } from "./RiskGauge";
export { HeatMeter } from "./HeatMeter";
export { StatusIndicator, type IndicatorState } from "./StatusIndicator";
export { WidgetToolbar, type WidgetToolbarProps } from "./WidgetToolbar";

// Sprint 10C.R6 — dockable widget registry
export {
  WORKSPACE_REGIONS,
  WORKSPACE_SIZES,
  WORKSPACE_SIZE_SPANS,
  WORKSPACE_SIZE_LABELS,
  sizeFromSpan,
  registerWidget,
  getWidgetDefinition,
  listWidgetDefinitions,
  searchWidgets,
  resetWidgetRegistryForTests,
  type WorkspaceRegion,
  type WorkspaceSize,
  type WidgetCategory,
  type WidgetDefinition,
} from "./widgetRegistry";
