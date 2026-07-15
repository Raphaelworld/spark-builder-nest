import { queryOptions } from "@tanstack/react-query";
import { listGoals } from "./goals.functions";
import { listPlannedBlocks } from "./planner.functions";

export const goalsQueryOptions = () =>
  queryOptions({
    queryKey: ["goals"],
    queryFn: () => listGoals(),
    staleTime: 15_000,
  });

export const plannedBlocksQueryOptions = () =>
  queryOptions({
    queryKey: ["plannedBlocks"],
    queryFn: () => listPlannedBlocks(),
    staleTime: 15_000,
  });
