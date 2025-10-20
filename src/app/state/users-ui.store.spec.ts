import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  usersUiStore,
  search$,
  selectedPiiTypes$,
  sort$,
  setSearch,
  togglePiiType,
  setSort,
  clearFilters,
  type SortConfig,
} from './users-ui.store';

describe('users-ui.store', () => {
  beforeEach(() => {
    // Reset store and session storage before each test
    sessionStorage.clear();
    clearFilters();
  });

  it('should expose initial selectors', async () => {
    const s = await firstValueFrom(search$.pipe(take(1)));
    const types = await firstValueFrom(selectedPiiTypes$.pipe(take(1)));
    const sort = await firstValueFrom(sort$.pipe(take(1)));

    expect(s).toBe('');
    expect(types).toEqual([]);
    expect(sort).toBeNull();
  });

  it('setSearch should trim and lowercase and handle undefined/empty', async () => {
    setSearch('  AlIce  ');
    expect(await firstValueFrom(search$.pipe(take(1)))).toBe('alice');

    setSearch('   ');
    expect(await firstValueFrom(search$.pipe(take(1)))).toBe('');

    setSearch(undefined as any);
    expect(await firstValueFrom(search$.pipe(take(1)))).toBe('');
  });

  it('togglePiiType should add, dedupe, and remove types', async () => {
    // Add one
    togglePiiType('email', true);
    expect(await firstValueFrom(selectedPiiTypes$.pipe(take(1)))).toEqual(['email']);

    // Add again (no duplicates)
    togglePiiType('email', true);
    expect(await firstValueFrom(selectedPiiTypes$.pipe(take(1)))).toEqual(['email']);

    // Add another
    togglePiiType('phone', true);
    expect(await firstValueFrom(selectedPiiTypes$.pipe(take(1)))).toEqual(['email', 'phone']);

    // Remove existing
    togglePiiType('email', false);
    expect(await firstValueFrom(selectedPiiTypes$.pipe(take(1)))).toEqual(['phone']);

    // Remove missing (no-op)
    togglePiiType('does-not-exist', false);
    expect(await firstValueFrom(selectedPiiTypes$.pipe(take(1)))).toEqual(['phone']);
  });

  it('setSort should set and clear the sort config', async () => {
    const cfg1: Exclude<SortConfig, null> = { column: 'name', direction: 'asc' };
    setSort(cfg1);
    expect(await firstValueFrom(sort$.pipe(take(1)))).toEqual(cfg1);

    const cfg2: Exclude<SortConfig, null> = { column: 'dataSourcesCount', direction: 'desc' };
    setSort(cfg2);
    expect(await firstValueFrom(sort$.pipe(take(1)))).toEqual(cfg2);

    setSort(null);
    expect(await firstValueFrom(sort$.pipe(take(1)))).toBeNull();
  });

  it('clearFilters should reset state and persist to sessionStorage', async () => {
    // Mutate state
    setSearch('bob');
    togglePiiType('email', true);
    setSort({ column: 'name', direction: 'asc' });

    // State is persisted
    const persisted1 = JSON.parse(sessionStorage.getItem('users-ui') || '{}');
    expect(persisted1.search).toBe('bob');
    expect(persisted1.selectedPiiTypes).toEqual(['email']);
    expect(persisted1.sort).toEqual({ column: 'name', direction: 'asc' });

    // Reset and verify state + persistence
    clearFilters();

    const s = await firstValueFrom(search$.pipe(take(1)));
    const types = await firstValueFrom(selectedPiiTypes$.pipe(take(1)));
    const sort = await firstValueFrom(sort$.pipe(take(1)));

    expect(s).toBe('');
    expect(types).toEqual([]);
    expect(sort).toBeNull();

    const persisted2 = JSON.parse(sessionStorage.getItem('users-ui') || '{}');
    expect(persisted2).toEqual({ search: '', selectedPiiTypes: [], sort: null });
  });

  it('should have a working store instance', () => {
    // Smoke test that the store exists and has an id
    expect((usersUiStore as any).name).toBe('users-ui');
  });
});
