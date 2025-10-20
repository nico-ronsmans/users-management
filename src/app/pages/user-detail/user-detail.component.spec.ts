import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { effect } from '@angular/core';

import { UserDetailComponent } from './user-detail.component';
import { IUser } from '../../models/user.interface';
import { setUsers } from '../../state/users.store';

describe('UserDetailComponent', () => {
  let fixture: ComponentFixture<UserDetailComponent>;
  let component: UserDetailComponent;

  let paramMap$: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    // Arrange
    paramMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent, RouterTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } }],
    }).compileComponents();

    // Act
    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and start in loading state', () => {
    // Assert
    expect(component).toBeTruthy();
    expect(component.person()).toBeUndefined(); // loading
    expect(component.piiEntries()).toEqual([]);
    expect(component.dataSourceGroups()).toEqual([]);
  });

  it('should remain loading when route id is missing or empty', () => {
    // Arrange
    // (no users in store, no id initially)

    // Act
    paramMap$.next(convertToParamMap({})); // no id
    fixture.detectChanges();

    // Assert
    expect(component.person()).toBeUndefined();

    // Act
    paramMap$.next(convertToParamMap({ id: '' })); // falsy id
    fixture.detectChanges();

    // Assert
    expect(component.person()).toBeUndefined();
  });

  it('should set person to null when user not found', () => {
    // Arrange
    setUsers([]); // empty store

    // Act
    paramMap$.next(convertToParamMap({ id: '1' }));
    fixture.detectChanges();

    // Assert
    expect(component.person()).toBeNull();
    expect(component.piiEntries()).toEqual([]);
    expect(component.dataSourceGroups()).toEqual([]);
  });

  it('should compute piiEntries and object-form dataSourceGroups', () => {
    // Arrange
    const user = {
      id: 2,
      name: 'Jane',
      pii: {
        email: ['j@x'],
        phone: [], // filtered out
        invalid: 'ignored' as any, // filtered out
      },
      dataSources: {
        documents: ['doc1', 'doc2'],
        emails: [], // filtered out
        databases: [], // filtered out
        chats: [], // filtered out
        weird: 'nope' as any, // becomes [] then filtered out
      },
    } as any as IUser;
    setUsers([user]);

    // Act
    paramMap$.next(convertToParamMap({ id: '2' }));
    fixture.detectChanges();

    // Assert
    expect(component.person()).toEqual(user);
    expect(component.piiEntries()).toEqual([['email', ['j@x']]]);
    expect(component.dataSourceGroups()).toEqual([['documents', ['doc1', 'doc2']]]);
  });

  it('should handle missing dataSources and array-form cases', () => {
    // Arrange
    const base = { id: 3, name: 'X' } as any as IUser;
    setUsers([base]);

    // Act
    paramMap$.next(convertToParamMap({ id: '3' }));
    fixture.detectChanges();

    // Assert: no dataSources -> []
    expect(component.dataSourceGroups()).toEqual([]);

    // Arrange: array form empty -> []
    const u2 = { ...base, dataSources: [] as string[] } as any as IUser;
    setUsers([u2]);

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.dataSourceGroups()).toEqual([]);

    // Arrange: array form non-empty -> single "All data sources" group
    const u3 = { ...base, dataSources: ['a', 'b'] } as any as IUser;
    setUsers([u3]);

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.dataSourceGroups()).toEqual([['All data sources', ['a', 'b']]]);
  });

  it('should ignore duplicate route id and react when id changes', () => {
    // Arrange
    // Seed store so id `5` is found (null -> user) to clearly observe a change.
    setUsers([{ id: 5, name: 'Y' } as any as IUser]);

    let runs = 0;
    let ref: { destroy: () => void } | undefined;

    TestBed.runInInjectionContext(() => {
      ref = effect(() => {
        // reads the signal to count updates
        void component.person();
        runs++;
      });
    });

    try {
      // Act: first id
      paramMap$.next(convertToParamMap({ id: '4' })); // not found -> null
      fixture.detectChanges();
      const afterFirst = runs;

      // Act: same id again (distinctUntilChanged should prevent a new emission)
      paramMap$.next(convertToParamMap({ id: '4' }));
      fixture.detectChanges();

      // Assert: no extra run
      expect(runs).toBe(afterFirst);

      // Act: different id -> found -> user object
      paramMap$.next(convertToParamMap({ id: '5' }));
      fixture.detectChanges();

      // Assert: one more run
      expect(runs).toBe(afterFirst + 1);
    } finally {
      // cleanup effect
      ref?.destroy();
    }
  });
});
