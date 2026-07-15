import { queryOptions } from "@tanstack/react-query";
import { getProfile } from "./profile.functions";

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    staleTime: 60_000,
  });
