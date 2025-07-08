import React from "react";
import { getRequestCache } from "../cache";
import { CacheHydrator } from "./CacheHydrator";

interface NextFetchProviderProps {
  children: React.ReactNode;
}

export const NextFetchProvider = ({ children }: NextFetchProviderProps) => {
  const renderedChildren = children;
  const requestCache = getRequestCache();
  const collectedData = requestCache.getAll();

  return (
    <>
      {renderedChildren}
      {collectedData.length > 0 && <CacheHydrator data={collectedData} />}
    </>
  );
}
