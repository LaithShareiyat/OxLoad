// UK degree classification boundaries (percentage-based)
export const UK_CLASSIFICATIONS = [
  { min: 70, label: "First Class", shortLabel: "1st", color: "#10B981" },
  { min: 60, label: "Upper Second", shortLabel: "2:1", color: "#3B82F6" },
  { min: 50, label: "Lower Second", shortLabel: "2:2", color: "#F59E0B" },
  { min: 40, label: "Third Class", shortLabel: "3rd", color: "#EF4444" },
  { min: 0, label: "Fail", shortLabel: "Fail", color: "#6B7280" },
] as const;

export type UkClassification = "First Class" | "Upper Second" | "Lower Second" | "Third Class" | "Fail";

export interface ClassificationResult {
  classification: UkClassification;
  shortLabel: string;
  percentage: number;
  color: string;
}

export interface GradeEntry {
  pointsEarned: number;
  pointsPossible: number;
  weight?: number;
}

export function percentageToClassification(percentage: number): ClassificationResult {
  const match =
    UK_CLASSIFICATIONS.find((c) => percentage >= c.min) ??
    UK_CLASSIFICATIONS[UK_CLASSIFICATIONS.length - 1];
  return {
    classification: match.label as UkClassification,
    shortLabel: match.shortLabel,
    percentage,
    color: match.color,
  };
}

export function calculateClassification(entries: GradeEntry[]): {
  result: ClassificationResult | null;
  totalEarned: number;
  totalPossible: number;
} {
  if (entries.length === 0) return { result: null, totalEarned: 0, totalPossible: 0 };

  let weightedSum = 0;
  let totalWeight = 0;
  let totalEarned = 0;
  let totalPossible = 0;

  for (const entry of entries) {
    if (entry.pointsPossible <= 0) continue;
    const pct = (entry.pointsEarned / entry.pointsPossible) * 100;
    const weight = entry.weight || 1;
    weightedSum += pct * weight;
    totalWeight += weight;
    totalEarned += entry.pointsEarned;
    totalPossible += entry.pointsPossible;
  }

  if (totalWeight === 0) return { result: null, totalEarned, totalPossible };

  const avgPercentage = weightedSum / totalWeight;
  return {
    result: percentageToClassification(avgPercentage),
    totalEarned,
    totalPossible,
  };
}

export function whatIfClassification(
  currentEntries: GradeEntry[],
  hypotheticalEntries: GradeEntry[]
): {
  current: ClassificationResult | null;
  projected: ClassificationResult | null;
} {
  const { result: current } = calculateClassification(currentEntries);
  const { result: projected } = calculateClassification([
    ...currentEntries,
    ...hypotheticalEntries,
  ]);
  return { current, projected };
}
