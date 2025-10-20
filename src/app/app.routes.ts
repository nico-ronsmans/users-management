import { Routes } from '@angular/router';
import { UserDetailComponent } from './pages/user-detail/user-detail.component';
import { UsersDashboardComponent } from './pages/users-dashboard/users-dashboard.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: UsersDashboardComponent },
  { path: 'user/:id', component: UserDetailComponent },
  { path: '**', redirectTo: '' }
];
