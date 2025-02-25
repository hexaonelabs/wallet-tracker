import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { UpdateComponent } from './components/app-update/app-update.component';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [IonApp, IonRouterOutlet, UpdateComponent],
})
export class AppComponent implements OnInit {
  themeIsDark = false;
  constructor() {}

  ngOnInit() {
    const localConfig = localStorage.getItem('theme');
    // Use matchMedia to check the user preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    // If the user preference is dark, turn on dark theme
    // If the user preference is light, turn on light theme
    // If there is no user preference, use the value from localStorage
    this.initializeDarkPalette(
      (localConfig !== null ? localConfig === 'dark' : false) ||
        (localConfig === null && prefersDark.matches)
    );

    // Listen for changes to the prefers-color-scheme media query
    prefersDark.addEventListener('change', (mediaQuery) =>
      this.initializeDarkPalette(mediaQuery.matches)
    );
  }

  // Check/uncheck the toggle and update the palette based on isDark
  initializeDarkPalette(isDark: boolean) {
    this.themeIsDark = isDark;
    this.toggleDarkPalette(isDark);
  }

  // Listen for the toggle check/uncheck to toggle the dark palette
  toggleChange(event: CustomEvent) {
    this.toggleDarkPalette(event.detail.checked);
  }

  // Add or remove the "ion-palette-dark" class on the html element
  toggleDarkPalette(isDarkmode: boolean) {
    console.log('toggleDarkPalette', isDarkmode);
    document.documentElement.classList.toggle('ion-palette-dark', isDarkmode);
    localStorage.setItem('theme', isDarkmode ? 'dark' : 'light');
  }
}
