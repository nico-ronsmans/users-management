import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UsersDashboardComponent } from './users-dashboard.component';
import { IUser } from '../../models/user.interface';
import { setUsers } from '../../state/users.store';
import { clearFilters, setSort } from '../../state/users-ui.store';
import * as UsersUiStore from '../../state/users-ui.store';

describe('UsersDashboardComponent', () => {
  let component: UsersDashboardComponent;
  let fixture: ComponentFixture<UsersDashboardComponent>;

  const u = (id: number, name: any, pii?: Record<string, string[]>, dataSources?: any): IUser =>
    ({ id, name, pii, dataSources } as any as IUser);

  beforeEach(async () => {
    sessionStorage.clear();
    clearFilters();
    setUsers([]);

    TestBed.overrideComponent(UsersDashboardComponent, { set: { template: '' } });

    await TestBed.configureTestingModule({
      imports: [UsersDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    clearFilters();
    setUsers([]);
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.users()).toEqual([]);
    expect(component.filtered()).toEqual([]);
    expect(component.stats()).toEqual({ totalUsers: 0, totalPiiItems: 0, avgDataSourcesPerUser: 0 });
  });

  it('should filter by search (debounced) and cancel previous keystrokes', fakeAsync(() => {
    // Arrange
    setUsers([
      u(1, 'alice', { email: ['a'] }),
      u(2, 'bob', { email: [] }),
      u(3, 'charlie', { phone: ['p'] }),
    ]);

    // Act: first type, but not enough time elapsed
    component.onSearchDebounced('al');
    tick(100);
    // Assert: not applied yet
    expect(component.filtered().map(p => p.id)).toEqual([1, 2, 3]);

    // Act: user types again before 200ms -> previous timer cleared
    component.onSearchDebounced('alice');
    tick(199);
    // Assert: still not applied
    expect(component.filtered().map(p => p.id)).toEqual([1, 2, 3]);

    // Act: reach debounce threshold
    tick(1);

    // Assert: filter applied -> only alice
    expect(component.filtered().map(p => p.id)).toEqual([1]);
    // Stats computed on filtered
    expect(component.stats()).toEqual({ totalUsers: 1, totalPiiItems: 1, avgDataSourcesPerUser: 0 });
  }));

  it('should filter by multiple PII types (require all selected)', () => {
    // Arrange
    setUsers([
      u(1, 'alice', { email: ['a1'], phone: ['p1'] }),
      u(2, 'bob', { email: [] }), // email key exists, empty list
      u(3, 'charlie', { phone: ['p2'] }),
    ]);

    // Act: select email
    component.onTogglePiiType('email', true);

    // Assert: users having the `email` key
    expect(component.filtered().map(p => p.id)).toEqual([1, 2]);

    // Act: also require phone
    component.onTogglePiiType('phone', true);

    // Assert: must have both -> only alice
    expect(component.filtered().map(p => p.id)).toEqual([1]);

    // Act: uncheck email -> require only phone
    component.onTogglePiiType('email', false);

    // Assert: alice and charlie
    expect(component.filtered().map(p => p.id)).toEqual([1, 3]);
  });

  it('should sort by name asc/desc and handle null/undefined values', () => {
    // Arrange
    setUsers([
      u(1, 'b'),
      u(2, undefined as any),
      u(3, 'a'),
    ]);

    // Act: sort by name asc via onSort
    component.onSort('name');
    fixture.detectChanges();

    // Assert: "a", "b", then undefined/null
    expect(component.filtered().map(p => p.id)).toEqual([3, 1, 2]);

    // Act: force desc deterministically via UI store (avoids toggle race)
    setSort({ column: 'name', direction: 'desc' });
    fixture.detectChanges();

    // Assert: "b", "a", then undefined/null
    expect(component.filtered().map(p => p.id)).toEqual([1, 3, 2]);

    // Act: switch to another column resets direction to asc (exercise onSort branch)
    component.onSort('dataSourcesCount');
    fixture.detectChanges();

    // Arrange
    expect(component.filtered().map(p => p.id)).toEqual([1, 2, 3]);
  });

  it('should compute stats over filtered users', () => {
    // Arrange
    setUsers([
      u(1, 'alice', { email: ['a', 'b'] }),
      u(2, 'bob', { phone: [] }), // contributes 0 PII items
    ]);

    // Act
    const s = component.stats();

    // Assert
    expect(s.totalUsers).toBe(2);
    expect(s.totalPiiItems).toBe(2);
    expect(s.avgDataSourcesPerUser).toBe(0);
  });

  it('should cache filtered and stats results for identical inputs', () => {
    // Arrange
    setUsers([
      u(1, 'alice', { email: ['a'] }),
      u(2, 'bob', { phone: ['p'] }),
    ]);

    // Act
    const f1 = component.filtered();
    const f2 = component.filtered();
    const s1 = component.stats();
    const s2 = component.stats();

    // Assert: same instances when nothing changed
    expect(f1).toBe(f2);
    expect(s1).toBe(s2);
  });
});
