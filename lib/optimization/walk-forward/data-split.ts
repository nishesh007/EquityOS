/**
 * Historical data segmentation for walk-forward validation.
 * Strict chronological ordering — never allows future leakage.
 */

import type {
  DateWindow,
  WalkForwardConfig,
  WalkForwardMethod,
  WalkForwardSplit,
} from "./types";

const MS_PER_DAY = 86_400_000;

/** Trading-day calendar approximation (skip weekends). */
export function generateTradingCalendar(
  startIso: string,
  endIso: string
): string[] {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  const days: string[] = [];
  for (let t = start; t <= end; t += MS_PER_DAY) {
    const d = new Date(t);
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function windowFromBars(
  calendar: readonly string[],
  startIndex: number,
  barCount: number
): DateWindow | null {
  if (startIndex < 0 || barCount <= 0) return null;
  const endIndex = startIndex + barCount - 1;
  if (endIndex >= calendar.length) return null;
  return {
    start: calendar[startIndex]!,
    end: calendar[endIndex]!,
    barCount,
  };
}

/**
 * Assert chronological integrity: training must end before testing starts.
 */
export function assertNoLeakage(
  training: DateWindow,
  testing: DateWindow
): boolean {
  return Date.parse(training.end) < Date.parse(testing.start);
}

/**
 * Build walk-forward splits for rolling / anchored / expanding methods.
 * Training always precedes testing; windows only move forward in time.
 */
export function buildWalkForwardSplits(
  config: WalkForwardConfig
): { splits: WalkForwardSplit[]; error?: string } {
  const calendar = generateTradingCalendar(
    config.historyStart,
    config.historyEnd
  );

  if (calendar.length < config.trainingBars + config.testingBars) {
    return {
      splits: [],
      error: `Insufficient historical bars (${calendar.length}). Need at least ${
        config.trainingBars + config.testingBars
      }.`,
    };
  }

  if (config.trainingBars <= 0 || config.testingBars <= 0) {
    return { splits: [], error: "Training and testing periods must be positive." };
  }

  if (config.stepSize <= 0) {
    return { splits: [], error: "Step size must be positive." };
  }

  const splits: WalkForwardSplit[] = [];
  const method: WalkForwardMethod = config.method;
  const maxCycles = Math.max(1, config.validationCycles);

  let trainStart = 0;
  let cycle = 1;

  while (cycle <= maxCycles) {
    let training: DateWindow | null = null;
    let testing: DateWindow | null = null;

    if (method === "rolling") {
      training = windowFromBars(calendar, trainStart, config.trainingBars);
      const testStart = trainStart + config.trainingBars;
      testing = windowFromBars(calendar, testStart, config.testingBars);
      trainStart += config.stepSize;
    } else if (method === "anchored") {
      // Anchor start at day 0; training expands by step each cycle, test follows.
      const trainBars =
        config.trainingBars + (cycle - 1) * config.stepSize;
      training = windowFromBars(calendar, 0, trainBars);
      const testStart = trainBars;
      testing = windowFromBars(calendar, testStart, config.testingBars);
    } else {
      // Expanding: same as anchored growth of training, fixed test length.
      const trainBars =
        config.trainingBars + (cycle - 1) * config.stepSize;
      training = windowFromBars(calendar, 0, trainBars);
      const testStart = trainBars;
      testing = windowFromBars(calendar, testStart, config.testingBars);
    }

    if (!training || !testing) break;

    if (!assertNoLeakage(training, testing)) {
      return {
        splits: [],
        error: `Future leakage detected at cycle ${cycle}.`,
      };
    }

    // Ensure testing window is strictly after training end in calendar order.
    const trainEndIdx = calendar.indexOf(training.end);
    const testStartIdx = calendar.indexOf(testing.start);
    if (trainEndIdx < 0 || testStartIdx < 0 || testStartIdx <= trainEndIdx) {
      return {
        splits: [],
        error: `Invalid chronological order at cycle ${cycle}.`,
      };
    }

    splits.push({ cycle, training, testing });
    cycle += 1;

    if (method === "rolling") {
      const nextTestEnd =
        trainStart + config.trainingBars + config.testingBars - 1;
      if (nextTestEnd >= calendar.length) break;
    } else {
      const nextTrainBars =
        config.trainingBars + (cycle - 1) * config.stepSize;
      if (nextTrainBars + config.testingBars > calendar.length) break;
    }
  }

  if (splits.length === 0) {
    return {
      splits: [],
      error: "Could not form any valid walk-forward cycles for the configured windows.",
    };
  }

  return { splits };
}

export function validateWalkForwardConfig(
  config: WalkForwardConfig
): string | null {
  if (config.trainingBars < 20) {
    return "Training period should be at least 20 bars.";
  }
  if (config.testingBars < 5) {
    return "Testing period should be at least 5 bars.";
  }
  if (Date.parse(config.historyStart) >= Date.parse(config.historyEnd)) {
    return "History start must be before history end.";
  }
  if (config.validationCycles < 1 || config.validationCycles > 50) {
    return "Validation cycles must be between 1 and 50.";
  }
  return null;
}
