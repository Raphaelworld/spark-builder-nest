import { queryOptions } from "@tanstack/react-query";
import { getActiveSession, getTodaySummary } from "./sessions.functions";

export const activeSessionQueryOptions = () =>
  queryOptions({
    queryKey: ["activeSession"],
    queryFn: () => getActiveSession(),
    staleTime: 5_000,
  });

export const todaySummaryQueryOptions = () =>
  queryOptions({
    queryKey: ["todaySummary"],
    queryFn: () => getTodaySummary(),
    staleTime: 30_000,
  });
