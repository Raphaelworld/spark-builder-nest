import { queryOptions } from "@tanstack/react-query";
import { getInsights } from "./insights.functions";

export const insightsQueryOptions = (days: number = 30) =>
  queryOptions({
    queryKey: ["insights", days],
    queryFn: () => getInsights({ data: { days } }),
    staleTime: 30_000,
  });
