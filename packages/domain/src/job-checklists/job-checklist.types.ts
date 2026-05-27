export interface JobChecklist {
  id: string;
  customerId: string;
  projectId: string;
  phaseId: string;
  depositReceived: boolean;
  tearoutRequired: boolean;
  tearoutCompleted: boolean;
  readyToTemplate: boolean;
  approvedForInstall: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateJobChecklistInput {
  depositReceived?: boolean | undefined;
  tearoutRequired?: boolean | undefined;
  tearoutCompleted?: boolean | undefined;
  readyToTemplate?: boolean | undefined;
  approvedForInstall?: boolean | undefined;
}
