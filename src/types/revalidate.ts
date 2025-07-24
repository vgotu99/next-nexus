export type RevalidateTagsInput =
  | string[]
  | { server?: string[]; client?: string[] };

export interface NormalizedRevalidateTags {
  serverTags: string[];
  clientTags: string[];
}
