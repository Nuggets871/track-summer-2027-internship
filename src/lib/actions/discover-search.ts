"use server";

// Thin server-action wrapper around the read-only Discover query layer
// (src/lib/data/discover.ts) so the client-side explorer can search/filter/
// sort/paginate over potentially thousands of rows without ever fetching
// the full table into the browser.

import {
  searchDiscoverListings,
  getListingDetail,
  parseListingArrays,
  getJobSources,
  getJobSourceEditableConfig,
  type DiscoverFilters,
  type DiscoverSort,
} from "@/lib/data/discover";

export async function searchListingsAction(filters: DiscoverFilters, sort: DiscoverSort, page: number) {
  return searchDiscoverListings(filters, sort, page);
}

export async function getListingDetailAction(id: string) {
  const listing = await getListingDetail(id);
  if (!listing) return null;
  return { ...listing, ...parseListingArrays(listing) };
}

export async function getJobSourcesAction() {
  return getJobSources();
}

export async function getJobSourceEditableConfigAction(id: string) {
  return getJobSourceEditableConfig(id);
}
