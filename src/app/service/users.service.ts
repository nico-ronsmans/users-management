import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, take, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IUser } from '../models/user.interface';
import { setUsers } from '../state/users.store';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  load(): Observable<IUser[]> {
    return this.http.get<IUser[]>('/api/users')
      .pipe(
        take(1),
        map((users: IUser[]) =>
          users.map((u: IUser) => ({
            ...u,
            _dataSourcesCount: this.countDataSources(u),
          }))
        ),
        tap((enriched: IUser[]) => setUsers(enriched)));
  }

  private countDataSources(u: IUser): number {
    const ds = u.dataSources;
    return (
      (ds?.documents?.length || 0) +
      (ds?.databases?.length || 0) +
      (ds?.emails?.length || 0) +
      (ds?.chats?.length || 0)
    );
  }
}
