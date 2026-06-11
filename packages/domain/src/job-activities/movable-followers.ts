export type MovableFollowerCandidate = {
  id: string;
  title: string;
  status: string;
  sortOrder: number;
  scheduledEventId: string | null;
  autoscheduleState: string | null;
};

export const movableFollowers = <T extends MovableFollowerCandidate>(
  activities: T[],
  anchor: MovableFollowerCandidate,
): T[] =>
  activities
    .filter(
      (candidate) =>
        candidate.sortOrder > anchor.sortOrder &&
        candidate.autoscheduleState === 'autoscheduled' &&
        (candidate.status === 'scheduled' || candidate.status === 'confirmed') &&
        candidate.scheduledEventId !== null,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
