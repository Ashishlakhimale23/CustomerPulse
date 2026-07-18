import { InternalPriorityLevel } from "../generated/prisma/client";

/**
 * Internal triage metric - separate from TicketPriority (P1-P4), which
 * still drives SLA/TAT and can be manually overridden by an admin. This
 * metric is purely informational context for triage and is computed fresh
 * from five weighted signals every time a ticket is created:
 *
 *   P1  is the work stopping         (from the selected category)
 *   P2  is this a safety violation   (from the selected category)
 *   P3  is this a shutdown job       (from the selected project)
 *   P4  reported by top management   (designation is CEO / COO / CXO)
 *   P5  is this a key client         (from the selected client)
 */
export interface InternalPriorityInputs {
  isWorkStopping: boolean;
  isSafetyViolation: boolean;
  isShutdownJob: boolean;
  isReportedByTopManagement: boolean;
  isKeyClient: boolean;
}

export interface InternalPriorityResult {
  level: InternalPriorityLevel;
  finalScore: number;
  selectedSumWeights: number;
  severityScore: number;
}

interface Factor {
  key: keyof InternalPriorityInputs;
  weight: number; // percentage points (sums to 100 across all 5 factors)
  impactMultiplier: number;
}

const FACTORS: Factor[] = [
  { key: "isWorkStopping", weight: 30, impactMultiplier: 2 },       // P1
  { key: "isSafetyViolation", weight: 25, impactMultiplier: 1.8 },  // P2
  { key: "isShutdownJob", weight: 20, impactMultiplier: 1.5 },      // P3
  { key: "isReportedByTopManagement", weight: 15, impactMultiplier: 1.3 }, // P4
  { key: "isKeyClient", weight: 10, impactMultiplier: 1.2 },        // P5
];

export const internalPriorityService = {
  /**
   * Runs the weighted scoring formula:
   *   selectedSumWeights = sum of the weight of every checked factor
   *   severityScore      = selectedSumWeights / 10
   *   activePriorityMix  = (checked factor's weight) / selectedSumWeights
   *   impactResult        = activePriorityMix * impactMultiplier
   *   finalScore          = sum(impactResult across checked factors) * severityScore
   *
   * If nothing is checked, selectedSumWeights is 0 and the score is 0 (LOW).
   */
  computeScore(inputs: InternalPriorityInputs): InternalPriorityResult {
    const selected = FACTORS.filter((f) => inputs[f.key]);
    const selectedSumWeights = selected.reduce((sum, f) => sum + f.weight, 0);

    if (selectedSumWeights === 0) {
      return { level: InternalPriorityLevel.LOW, finalScore: 0, selectedSumWeights: 0, severityScore: 0 };
    }

    const severityScore = selectedSumWeights / 10;

    const impactResultSum = selected.reduce((sum, f) => {
      const activePriorityMix = f.weight / selectedSumWeights;
      const impactResult = activePriorityMix * f.impactMultiplier;
      return sum + impactResult;
    }, 0);

    const finalScore = impactResultSum * severityScore;

    return {
      level: this.scoreToLevel(finalScore),
      finalScore,
      selectedSumWeights,
      severityScore,
    };
  },

  /**
   * Critical: 8-10 | High: 6-7.99 | Medium: 3-5.99 | Low: 0-2.99
   * The upper bound on Critical is open-ended (a finalScore can exceed 10
   * when several high-weight/high-multiplier factors stack) rather than
   * capped, so anything at or above 8 still resolves to CRITICAL.
   */
  scoreToLevel(finalScore: number): InternalPriorityLevel {
    if (finalScore >= 8) return InternalPriorityLevel.CRITICAL;
    if (finalScore >= 6) return InternalPriorityLevel.HIGH;
    if (finalScore >= 3) return InternalPriorityLevel.MEDIUM;
    return InternalPriorityLevel.LOW;
  },
};
