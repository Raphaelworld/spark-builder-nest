import { queryOptions } from "@tanstack/react-query";
import { getCurrentWeeklyReview, getPulses } from "./reflections.functions";

export const weeklyReviewQueryOptions = () =>
  queryOptions({
    queryKey: ["weeklyReview"],
    queryFn: () => getCurrentWeeklyReview(),
    staleTime: 30_000,
  });

export const pulsesQueryOptions = () =>
  queryOptions({
    queryKey: ["pulses"],
    queryFn: () => getPulses(),
    staleTime: 30_000,
  });
