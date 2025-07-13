import type { NextFetchRequestConfig, NextFetchStatic } from "@/types";
import { createNextFetchInstance } from "./client";

const nextFetch: NextFetchStatic = {
  create: (config?: NextFetchRequestConfig) => {
    return createNextFetchInstance(config);
  },
};

export default nextFetch;
