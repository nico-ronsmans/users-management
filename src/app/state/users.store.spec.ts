import { firstValueFrom } from 'rxjs';
import { take, skip, toArray } from 'rxjs/operators';
import {
  usersStore,
  users$,
  usersCount$,
  piiTypes$,
  selectUser,
  setUsers,
} from './users.store';
import { IUser } from '../models/user.interface';

describe('users.store', () => {
  beforeEach(() => {
    // Ensure a clean slate before each test
    setUsers([]);
  });

  it('should expose empty base selectors by default', async () => {
    const all = await firstValueFrom(users$.pipe(take(1)));
    const count = await firstValueFrom(usersCount$.pipe(take(1)));
    expect(all).toEqual([]);
    expect(count).toBe(0);
  });

  it('users$ should emit initial [] and then the updated list after setUsers', async () => {
    const payload: IUser[] = [
      { id: 1, name: 'A', pii: { email: ['e1'], phone: [] } } as any,
      { id: 2, name: 'B', pii: {} } as any,
      { id: 3, name: 'C' } as any, // pii undefined
      { id: 4, name: 'D', pii: { address: ['x'], email: ['e2'] } } as any, // duplicate 'email'
    ];

    const emissionsPromise = firstValueFrom(users$.pipe(take(2), toArray()));
    setUsers(payload);
    const emissions = await emissionsPromise;

    expect(emissions[0]).toEqual([]); // initial
    expect(emissions[1].map(u => u.id)).toEqual([1, 2, 3, 4]); // after update

    const count = await firstValueFrom(usersCount$.pipe(take(1)));
    expect(count).toBe(4);
  });

  it('piiTypes$ should collect unique pii keys, handle missing/empty pii, and sort them', async () => {
    const payload: IUser[] = [
      { id: 1, name: 'A', pii: { email: ['e1'], phone: [] } } as any,
      { id: 2, name: 'B', pii: {} } as any,
      { id: 3, name: 'C' } as any, // pii undefined
      { id: 4, name: 'D', pii: { address: ['x'], email: ['e2'] } } as any,
    ];
    setUsers(payload);

    const keys = await firstValueFrom(piiTypes$.pipe(take(1)));
    expect(keys).toEqual(['address', 'email', 'phone']); // sorted and deduped
  });

  it('selectUser should return the entity by id and undefined for missing ids', async () => {
    setUsers([
      { id: 10, name: 'X' } as any,
      { id: 20, name: 'Y' } as any,
    ]);

    const u20 = await firstValueFrom(selectUser(20).pipe(take(1)));
    const uMissing = await firstValueFrom(selectUser(999).pipe(take(1)));

    expect(u20?.id).toBe(20);
    expect(uMissing).toBeUndefined();
  });

  it('setUsers should replace entities (not append)', async () => {
    setUsers([
      { id: 1, name: 'A' } as any,
      { id: 2, name: 'B' } as any,
    ]);

    // Replace with a different set
    setUsers([{ id: 3, name: 'C', pii: { ssn: ['s'] } } as any]);

    const all = await firstValueFrom(users$.pipe(take(1)));
    const count = await firstValueFrom(usersCount$.pipe(take(1)));
    const keys = await firstValueFrom(piiTypes$.pipe(take(1)));

    expect(all.map(u => u.id)).toEqual([3]);
    expect(count).toBe(1);
    expect(keys).toEqual(['ssn']); // derived selector recomputed on replacement
    const u1 = await firstValueFrom(selectUser(1).pipe(take(1)));
    expect(u1).toBeUndefined();
  });
});
