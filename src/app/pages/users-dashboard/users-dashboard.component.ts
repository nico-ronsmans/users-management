import {
  ChangeDetectionStrategy,
  Component,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { users$, piiTypes$ } from '../../state/users.store';
import { IUser } from '../../models/user.interface';
import {
  search$,
  selectedPiiTypes$,
  sort$,
  setSearch,
  togglePiiType,
  setSort,
  type SortConfig,
} from '../../state/users-ui.store';

type DashboardStats = {
  totalUsers: number;
  totalPiiItems: number;
  avgDataSourcesPerUser: number;
};

type userRow = IUser & { _dataSourcesCount: number };

@Component({
  selector: 'app-users-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './users-dashboard.component.html',
  styleUrl: './users-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersDashboardComponent {
  readonly users = toSignal(users$, { initialValue: [] as IUser[] });
  readonly piiTypes = toSignal(piiTypes$, { initialValue: [] as string[] });

  // UI state
  readonly search = toSignal(search$, { initialValue: '' });
  private readonly selectedPiiTypesArr = toSignal(selectedPiiTypes$, { initialValue: [] as string[] });
  readonly selectedPiiTypes = computed<Set<string>>(() => new Set(this.selectedPiiTypesArr()));
  readonly sort = toSignal(sort$, { initialValue: null as SortConfig });

  // Cache for memoization
  private lastFilterKey = '';
  private lastFiltered: userRow[] = [];
  private lastStatsKey = '';
  private lastStats: DashboardStats = { totalUsers: 0, totalPiiItems: 0, avgDataSourcesPerUser: 0 };

  /** Computed: filtered and sorted users with caching */
  readonly filtered = computed<userRow[]>(() => {
    const users = this.users();
    const search = this.search();
    const selected = this.selectedPiiTypes();
    const sort = this.sort();

    const key = `${users.length}-${search}-${Array.from(selected).join(',')}-${sort?.column}-${sort?.direction}`;
    if (key === this.lastFilterKey) {
      return this.lastFiltered;
    }

    const base = this.applyFilters(users, search, selected) as userRow[];
    const sorted = sort ? this.applySort(base, sort) : base;

    this.lastFilterKey = key;
    this.lastFiltered = sorted;
    return sorted;
  });

  /** Computed: dashboard stats with caching */
  readonly stats = computed<DashboardStats>(() => {
    const filtered = this.filtered();
    const key = `${filtered.length}-${filtered.map(p => p.id).join(',')}`;

    if (key === this.lastStatsKey) {
      return this.lastStats;
    }

    const computedStats = this.computeStats(filtered);
    this.lastStatsKey = key;
    this.lastStats = computedStats;
    return computedStats;
  });

  // === UI actions (dispatch to store) ===
  private searchTimeout: any;
  onSearchDebounced(v: string): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => setSearch(v), 200);
  }

  onTogglePiiType(type: string, checked: boolean): void {
    togglePiiType(type, checked);
  }

  onSort(column: keyof IUser | 'dataSourcesCount'): void {
    const current = this.sort();
    if (!current || current.column !== column) {
      setSort({ column, direction: 'asc' });
    } else {
      setSort({ column, direction: current.direction === 'asc' ? 'desc' : 'asc' });
    }
  }

  // === Filtering, sorting, and stats ===
  private applyFilters(users: IUser[], search: string, selected: Set<string>): IUser[] {
    const hasSearch = !!search;
    const requireAllPii = selected.size > 0;

    return users.filter(p => {
      if (hasSearch && !p.name?.toLowerCase().includes(search)) return false;
      if (!requireAllPii) return true;

      const userPiiTypes = new Set(Object.keys(p.pii ?? {}));
      for (const type of selected) {
        if (!userPiiTypes.has(type)) return false;
      }
      return true;
    });
  }

  private applySort<T extends IUser & Partial<userRow>>(persons: T[], sort: Exclude<SortConfig, null>): T[] {
    const { column, direction } = sort;
    const dir = direction === 'asc' ? 1 : -1;

    return [...persons].sort((a, b) => {
      const aValue = column === 'dataSourcesCount' ? (a as any)._dataSourcesCount ?? 0 : (a as any)[column];
      const bValue = column === 'dataSourcesCount' ? (b as any)._dataSourcesCount ?? 0 : (b as any)[column];

      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue > bValue ? dir : aValue < bValue ? -dir : 0;
    });
  }

  private computeStats(persons: Array<IUser | userRow>): DashboardStats {
    const totalPersons = persons.length;
    let totalPiiItems = 0;
    let totalDataSources = 0;

    for (const p of persons) {
      const piiValues = Object.values(p.pii ?? {});
      for (const arr of piiValues) totalPiiItems += arr?.length ?? 0;
      totalDataSources += (p as any)._dataSourcesCount ?? 0;
    }

    const avgDataSourcesPerPerson =
      totalPersons > 0 ? Number((totalDataSources / totalPersons).toFixed(2)) : 0;

    return { totalUsers: totalPersons, totalPiiItems, avgDataSourcesPerUser: avgDataSourcesPerPerson };
  }
}
