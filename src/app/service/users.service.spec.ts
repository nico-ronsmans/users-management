// TypeScript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { IUser } from '../models/user.interface';
import { users$ } from '../state/users.store';
import { take } from 'rxjs/operators';
import { skip } from 'rxjs/operators';
import { provideHttpClient } from '@angular/common/http';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsersService,
        provideHttpClient(),
        provideHttpClientTesting() ],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('load() should GET /api/users, enrich with _dataSourcesCount, and update the store', (done) => {
    // Arrange: mock payload hitting all count branches (present/missing arrays)
    const payload: IUser[] = [
      {
        id: 1,
        name: 'A',
        pii: {},
        dataSources: {
          documents: ['d1', 'd2'], // 2
          databases: ['db1'],      // 1
          // emails/chats omitted -> 0
        } as any,
      } as any,
      {
        id: 2,
        name: 'B',
        pii: {},
        dataSources: undefined as any, // all -> 0
      } as any,
      {
        id: 3,
        name: 'C',
        pii: {},
        dataSources: {
          emails: ['e1'],          // 1
          chats: ['c1', 'c2'],     // 2
          // documents/databases omitted -> 0
        } as any,
      } as any,
    ];

    // Observe store update (skip initial empty emission)
    let storeUpdated = false;
    users$.pipe(skip(1), take(1)).subscribe((enriched) => {
      expect(enriched.length).toBe(3);
      expect((enriched[0] as any)._dataSourcesCount).toBe(3); // 2 + 1
      expect((enriched[1] as any)._dataSourcesCount).toBe(0);
      expect((enriched[2] as any)._dataSourcesCount).toBe(3); // 1 + 2
      storeUpdated = true;
    });

    // Act: call load and flush response
    service.load().pipe(take(1)).subscribe((res) => {
      // Assert: response enriched as well
      expect(res.length).toBe(3);
      expect((res[0] as any)._dataSourcesCount).toBe(3);
      expect((res[1] as any)._dataSourcesCount).toBe(0);
      expect((res[2] as any)._dataSourcesCount).toBe(3);
      expect(storeUpdated).toBeTrue();
      done();
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(payload);
  });

  it('load() should handle empty response and clear the store', (done) => {
    // Observe store update to empty list
    users$.pipe(skip(1), take(1)).subscribe((enriched) => {
      expect(enriched).toEqual([]);
      done();
    });

    service.load().pipe(take(1)).subscribe((res) => {
      expect(res).toEqual([]);
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
