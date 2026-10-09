import type { FieldTaskSubmission } from '../types/contracts';

export interface AssessmentAnswers {
  wall: 1 | 2 | 3 | null;
  roof: 1 | 2 | 3 | null;
  water: 1 | 2 | 3 | null;
  motorcycle: boolean | null;
  productive: boolean | null;
  proof: FieldTaskSubmission['proof_type'] | '';
  cardPresented: boolean | null;
  cardMatches: boolean | null;
  pawning: boolean | null;
  evidenceReady: boolean;
  recommendation: FieldTaskSubmission['worker_recommendation'] | '';
  narrative: string;
}

// Completion reflects recorded answers, never the user's position in the stepper.
export function assessmentProgress(answers: AssessmentAnswers): boolean[] {
  return [
    answers.wall !== null && answers.roof !== null && answers.water !== null,
    answers.motorcycle === false || (answers.motorcycle === true && answers.productive !== null && Boolean(answers.proof)),
    answers.cardPresented !== null && answers.cardMatches !== null && answers.pawning !== null,
    answers.evidenceReady,
    Boolean(answers.recommendation) && answers.narrative.trim().length > 0,
  ];
}
