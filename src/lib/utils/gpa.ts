export type GpaScale = "4.0" | "4.3" | "uk";

interface GradeEntry {
  pointsEarned: number;
  pointsPossible: number;
  weight?: number; // 0-1, defaults to equal weight
  credits?: number;
}

// US 4.0 scale mapping
const SCALE_4_0: Record<string, number> = {
  "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};

// US 4.3 scale (with A+)
const SCALE_4_3: Record<string, number> = {
  "A+": 4.3, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};

// UK classification boundaries (percentage-based)
const UK_CLASSIFICATIONS = [
  { min: 70, label: "First Class (1st)", value: 4.0 },
  { min: 60, label: "Upper Second (2:1)", value: 3.3 },
  { min: 50, label: "Lower Second (2:2)", value: 2.7 },
  { min: 40, label: "Third Class (3rd)", value: 2.0 },
  { min: 0, label: "Fail", value: 0.0 },
];

/**
 * Convert a percentage score to a letter grade
 */
export function percentageToLetter(percentage: number, scale: GpaScale = "4.0"): string {
  if (percentage >= 93) return scale === "4.3" ? "A+" : "A";
  if (percentage >= 90) return "A";
  if (percentage >= 87) return "A-";
  if (percentage >= 83) return "B+";
  if (percentage >= 80) return "B";
  if (percentage >= 77) return "B-";
  if (percentage >= 73) return "C+";
  if (percentage >= 70) return "C";
  if (percentage >= 67) return "C-";
  if (percentage >= 63) return "D+";
  if (percentage >= 60) return "D";
  if (percentage >= 57) return "D-";
  return "F";
}

/**
 * Convert a letter grade to GPA points
 */
export function letterToGpa(letter: string, scale: GpaScale = "4.0"): number {
  const gradeMap = scale === "4.3" ? SCALE_4_3 : SCALE_4_0;
  return gradeMap[letter.toUpperCase()] ?? 0;
}

/**
 * Calculate GPA from a set of grade entries
 */
export function calculateGpa(
  entries: GradeEntry[],
  scale: GpaScale = "4.0"
): {
  gpa: number;
  letterGrade: string;
  classification?: string;
  totalCredits: number;
  courseGpas: number[];
} {
  if (entries.length === 0) {
    return { gpa: 0, letterGrade: "N/A", totalCredits: 0, courseGpas: [] };
  }

  const courseGpas: number[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const entry of entries) {
    if (entry.pointsPossible <= 0) continue;

    const percentage = (entry.pointsEarned / entry.pointsPossible) * 100;
    const letter = percentageToLetter(percentage, scale);
    const gpaPoints = letterToGpa(letter, scale);

    courseGpas.push(gpaPoints);

    const weight = entry.credits || entry.weight || 1;
    weightedSum += gpaPoints * weight;
    totalWeight += weight;
  }

  const gpa = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const roundedGpa = Math.round(gpa * 100) / 100;

  // Determine letter grade for overall GPA
  let letterGrade: string;
  if (roundedGpa >= 3.7) letterGrade = "A";
  else if (roundedGpa >= 3.3) letterGrade = "B+";
  else if (roundedGpa >= 3.0) letterGrade = "B";
  else if (roundedGpa >= 2.7) letterGrade = "B-";
  else if (roundedGpa >= 2.3) letterGrade = "C+";
  else if (roundedGpa >= 2.0) letterGrade = "C";
  else if (roundedGpa >= 1.0) letterGrade = "D";
  else letterGrade = "F";

  // UK classification
  let classification: string | undefined;
  if (scale === "uk") {
    const avgPercentage =
      entries.reduce(
        (sum, e) =>
          sum + (e.pointsPossible > 0 ? (e.pointsEarned / e.pointsPossible) * 100 : 0),
        0
      ) / entries.length;

    classification =
      UK_CLASSIFICATIONS.find((c) => avgPercentage >= c.min)?.label || "Fail";
  }

  return {
    gpa: roundedGpa,
    letterGrade,
    classification,
    totalCredits: totalWeight,
    courseGpas,
  };
}

/**
 * "What-if" GPA calculator: calculates GPA with hypothetical future grades
 */
export function whatIfGpa(
  currentEntries: GradeEntry[],
  hypotheticalEntries: GradeEntry[],
  scale: GpaScale = "4.0"
): {
  currentGpa: number;
  projectedGpa: number;
  delta: number;
} {
  const current = calculateGpa(currentEntries, scale);
  const combined = calculateGpa([...currentEntries, ...hypotheticalEntries], scale);

  return {
    currentGpa: current.gpa,
    projectedGpa: combined.gpa,
    delta: Math.round((combined.gpa - current.gpa) * 100) / 100,
  };
}
