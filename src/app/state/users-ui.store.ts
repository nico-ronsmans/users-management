import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState, sessionStorageStrategy } from '@ngneat/elf-persist-state';
import { IUser } from '../models/user.interface';

export type SortColumn = keyof IUser | 'dataSourcesCount';
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { column: SortColumn; direction: SortDirection } | null;

type UsersUiState = {
  search: string;
  selectedPiiTypes: string[];
  sort: SortConfig;
};

const initialState: UsersUiState = {
  search: '',
  selectedPiiTypes: [],
  sort: null,
};

export const usersUiStore = createStore({ name: 'users-ui' }, withProps<UsersUiState>(initialState));

// Selectors
export const search$ = usersUiStore.pipe(select(s => s.search));
export const selectedPiiTypes$ = usersUiStore.pipe(select(s => s.selectedPiiTypes));
export const sort$ = usersUiStore.pipe(select(s => s.sort));

// Updaters
export const setSearch = (value: string) => usersUiStore.update(setProp('search', (value || '').trim().toLowerCase()));
export const togglePiiType = (type: string, checked: boolean) =>
  usersUiStore.update(state => {
    const next = new Set(state.selectedPiiTypes);
    checked ? next.add(type) : next.delete(type);
    return { ...state, selectedPiiTypes: Array.from(next) };
  });
export const setSort = (config: Exclude<SortConfig, null> | null) => usersUiStore.update(setProp('sort', config));
export const clearFilters = () => usersUiStore.update(() => initialState);

persistState(usersUiStore, { key: 'users-ui', storage: sessionStorageStrategy });
