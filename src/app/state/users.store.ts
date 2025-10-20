import { createStore } from '@ngneat/elf';
import {
  withEntities,
  selectAllEntities,
  selectEntity,
  selectEntitiesCount,
  setEntities
} from '@ngneat/elf-entities';
import { map } from 'rxjs/operators';
import { IUser } from '../models/user.interface';
import { Observable } from 'rxjs';

export const usersStore = createStore(
  { name: 'users' },
  withEntities<IUser, 'id'>({ idKey: 'id' })
);

// Base selectors
export const users$: Observable<IUser[]> = usersStore.pipe(selectAllEntities());
export const usersCount$: Observable<number> = usersStore.pipe(selectEntitiesCount());

// Derived selectors
export const piiTypes$ = users$.pipe(
  map(persons => {
    const set = new Set<string>();
    for (const p of persons) {
      Object.keys(p.pii || {}).forEach(k => set.add(k));
    }
    return Array.from(set).sort();
  })
);

// Helpers
export const selectUser = (id:number) =>
  usersStore.pipe(selectEntity(id));

export const setUsers = (data: IUser[]) =>
  usersStore.update(setEntities(data));
