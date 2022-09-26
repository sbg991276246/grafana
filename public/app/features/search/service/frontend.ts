import uFuzzy from '@leeoniya/ufuzzy';

import { DataFrameView, SelectableValue, ArrayVector } from '@grafana/data';
import { TermCount } from 'app/core/components/TagFilter/TagFilter';

import { DashboardQueryResult, GrafanaSearcher, QueryResponse, SearchQuery } from '.';

// https://stackoverflow.com/questions/9960908/permutations-in-javascript/37580979#37580979
function permute(arr: unknown[]) {
  let length = arr.length,
    result = [arr.slice()],
    c = new Array(length).fill(0),
    i = 1,
    k,
    p;

  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i];
      p = arr[i];
      arr[i] = arr[k];
      arr[k] = p;
      ++c[i];
      i = 1;
      result.push(arr.slice());
    } else {
      c[i] = 0;
      ++i;
    }
  }

  return result;
}

export class FrontendSearcher implements GrafanaSearcher {
  readonly cache = new Map<string, Promise<FullResultCache>>();

  constructor(private parent: GrafanaSearcher) {}

  async search(query: SearchQuery): Promise<QueryResponse> {
    if (query.facet?.length) {
      throw new Error('facets not supported!');
    }
    // Don't bother... not needed for this exercise
    if (query.tags?.length || query.ds_uid?.length) {
      return this.parent.search(query);
    }

    // TODO -- make sure we refresh after a while
    const all = await this.getCache(query.kind);
    const view = all.search(query.query);
    return {
      isItemLoaded: () => true,
      loadMoreItems: async (startIndex: number, stopIndex: number): Promise<void> => {},
      totalRows: view.length,
      view,
    };
  }

  async getCache(kind?: string[]): Promise<FullResultCache> {
    const key = kind ? kind.sort().join(',') : '*';

    const cacheHit = this.cache.get(key);
    if (cacheHit) {
      try {
        return await cacheHit;
      } catch (e) {
        // delete the cache key so that the next request will retry
        this.cache.delete(key);
        return new FullResultCache(new DataFrameView({ name: 'error', fields: [], length: 0 }));
      }
    }

    const resultPromise = this.parent
      .search({
        kind, // match the request
        limit: 5000, // max for now
      })
      .then((res) => new FullResultCache(res.view));

    this.cache.set(key, resultPromise);
    return resultPromise;
  }

  async starred(query: SearchQuery): Promise<QueryResponse> {
    return this.parent.starred(query);
  }

  // returns the appropriate sorting options
  async getSortOptions(): Promise<SelectableValue[]> {
    return this.parent.getSortOptions();
  }

  async tags(query: SearchQuery): Promise<TermCount[]> {
    return this.parent.tags(query);
  }
}

class FullResultCache {
  readonly names: string[];
  empty: DataFrameView<DashboardQueryResult>;

  ufuzzy = new uFuzzy({
    // allow 1 extra char between each char within needle's terms
    intraMax: 1,
  });

  constructor(private full: DataFrameView<DashboardQueryResult>) {
    this.names = this.full.fields.name.values.toArray();

    // Copy with empty values
    this.empty = new DataFrameView<DashboardQueryResult>({
      ...this.full.dataFrame, // copy folder metadata
      fields: this.full.dataFrame.fields.map((v) => ({ ...v, values: new ArrayVector([]) })),
      length: 0, // for now
    });
  }

  // single instance that is mutated for each response (not great, but OK for now)
  search(query?: string): DataFrameView<DashboardQueryResult> {
    if (!query?.length || query === '*') {
      return this.full;
    }

    const allFields = this.full.dataFrame.fields;
    const haystack = this.names;

    // eslint-disable-next-line
    const values = allFields.map((v) => [] as any[]); // empty value for each field

    // out-of-order terms
    const oooIdxs = new Set<number>();
    const oooNeedles = permute(query.split(/[^A-Za-z0-9]+/g)).map((terms) => terms.join(' '));

    oooNeedles.forEach((needle) => {
      let idxs = this.ufuzzy.filter(haystack, needle);
      let info = this.ufuzzy.info(idxs, haystack, needle);
      let order = this.ufuzzy.sort(info, haystack, needle);

      for (let i = 0; i < order.length; i++) {
        let haystackIdx = info.idx[order[i]];

        if (!oooIdxs.has(haystackIdx)) {
          oooIdxs.add(haystackIdx);

          for (let c = 0; c < allFields.length; c++) {
            values[c].push(allFields[c].values.get(haystackIdx));
          }
        }
      }
    });

    // mutates the search object
    this.empty.dataFrame.fields.forEach((f, idx) => {
      f.values = new ArrayVector(values[idx]); // or just set it?
    });
    this.empty.dataFrame.length = this.empty.dataFrame.fields[0].values.length;

    return this.empty;
  }
}
