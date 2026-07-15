import { queryOptions } from "@tanstack/react-query";
import { getEvidence } from "@/lib/evidence.functions";

export const evidenceQueryOptions = () =>
  queryOptions({
    queryKey: ["evidence"],
    queryFn: () => getEvidence(),
  });
