import { type WorkflowStep } from "./steps";

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  isCompleted?: boolean;
  finalState?: { messages: { role: string; content: string }[] };
}
