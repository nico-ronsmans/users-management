import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { IUser } from '../../models/user.interface';
import { selectUser } from '../../state/users.store';

@Component({
  selector: 'app-user-detail',
  imports: [RouterLink],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent {
  private readonly route = inject(ActivatedRoute);

  readonly person = toSignal(
    this.route.paramMap.pipe(
      map(pm => pm.get('id')),
      filter((id): id is string => !!id),
      distinctUntilChanged(),
      switchMap(id => selectUser(Number(id))),
      map(user => user ?? null)
    ),
    { initialValue: undefined }
  );

  readonly piiEntries = computed<[string, string[]][]>(() => {
    const p = this.person();
    if (!p?.pii) return [];
    return Object.entries(p.pii).filter(([, arr]) => Array.isArray(arr) && arr.length > 0);
  });

  readonly dataSourceGroups = computed<[string, string[]][]>(() => {
    const p = this.person();
    if (!p?.dataSources) return [];
    const ds = p.dataSources;

    if (Array.isArray(ds)) {
      return ds.length ? [['All data sources', ds]] : [];
    }

    return Object.entries(ds)
      .map(([group, items]) => [group, Array.isArray(items) ? items : []] as [string, string[]])
      .filter(([, items]) => items.length > 0);
  });
}
