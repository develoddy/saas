import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'app-saas';

  isNumiqRoute = false;

  private readonly defaultFavicon = '/assets/images/favicon.png';
  private readonly numiqFavicon = '/assets/brands/numiq/favicon.svg';
  private navigationSubscription?: Subscription;

  constructor(
    private readonly router: Router,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.updateFavicon(this.router.url);

    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.updateFavicon(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }

  private updateFavicon(url: string): void {
    const pathname = url.split(/[?#]/, 1)[0];

    const isNumiq =
      pathname === '/raffle-lab' ||
      pathname.startsWith('/raffle-lab/');

    this.isNumiqRoute = isNumiq;

    const favicon = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!favicon) {
      return;
    }

    favicon.type = isNumiq ? 'image/svg+xml' : 'image/png';
    favicon.href = isNumiq ? this.numiqFavicon : this.defaultFavicon;
  }
}
