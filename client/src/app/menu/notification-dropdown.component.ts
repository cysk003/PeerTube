import { CommonModule } from '@angular/common'
import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router'
import { Notifier, PeerTubeSocket, ScreenService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { LoaderComponent } from '@app/shared/shared-main/loaders/loader.component'
import { UserNotificationService } from '@app/shared/shared-main/users/user-notification.service'
import { UserNotificationsComponent } from '@app/shared/standalone-notifications/user-notifications.component'
import { NgbDropdown, NgbDropdownModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap'
import { Subject, Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'

@Component({
  selector: 'my-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  styleUrls: [ './notification-dropdown.component.scss' ],
  standalone: true,
  imports: [
    CommonModule,
    NgbPopoverModule,
    UserNotificationsComponent,
    GlobalIconComponent,
    LoaderComponent,
    RouterLink,
    RouterLinkActive,
    NgbDropdownModule
  ]
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @ViewChild('dropdown', { static: false }) dropdown: NgbDropdown

  @Output() navigate = new EventEmitter<HTMLAnchorElement>()

  unreadNotifications = 0
  loaded = false
  opened = false

  markAllAsReadSubject = new Subject<boolean>()

  private notificationSub: Subscription
  private routeSub: Subscription

  constructor (
    private userNotificationService: UserNotificationService,
    private screenService: ScreenService,
    private peertubeSocket: PeerTubeSocket,
    private notifier: Notifier,
    private router: Router
  ) {
  }

  ngOnInit () {
    this.userNotificationService.countUnreadNotifications()
        .subscribe({
          next: result => {
            this.unreadNotifications = result
            this.subscribeToNotifications()
          },

          error: err => this.notifier.error(err.message)
        })

    this.routeSub = this.router.events
                        .pipe(filter(event => event instanceof NavigationEnd))
                        .subscribe(() => this.closeDropdown())
  }

  ngOnDestroy () {
    if (this.notificationSub) this.notificationSub.unsubscribe()
    if (this.routeSub) this.routeSub.unsubscribe()
  }

  get isInMobileView () {
    return this.screenService.isInMobileView()
  }

  closeDropdown () {
    if (this.dropdown) this.dropdown.close()
  }

  onDropdownShown () {
    this.opened = true
  }

  onDropdownHidden () {
    this.loaded = false
    this.opened = false
  }

  onNotificationLoaded () {
    this.loaded = true
  }

  onNavigate (link: HTMLAnchorElement) {
    this.closeDropdown()
    this.navigate.emit(link)
  }

  markAllAsRead () {
    this.markAllAsReadSubject.next(true)
  }

  private async subscribeToNotifications () {
    const obs = await this.peertubeSocket.getMyNotificationsSocket()

    this.notificationSub = obs.subscribe(data => {
      if (data.type === 'new') return this.unreadNotifications++
      if (data.type === 'read') return this.unreadNotifications--
      if (data.type === 'read-all') return this.unreadNotifications = 0
    })
  }
}