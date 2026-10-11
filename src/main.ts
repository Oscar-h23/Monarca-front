import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/layout/shell.component';
import { routes } from './app/app.routes';
bootstrapApplication(AppComponent, {providers:[provideRouter(routes,withInMemoryScrolling({scrollPositionRestoration:'enabled'})),provideHttpClient()]}).catch(console.error);
