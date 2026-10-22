import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';

import { ManagementDemoComponent } from './management-demo.component';
import { RaffleNumbersService } from '../../../shared/services/raffle-numbers.service';

describe('ManagementDemoComponent', () => {
  let service: RaffleNumbersService;
  let component: ManagementDemoComponent;

  beforeEach(() => {
    service = new RaffleNumbersService();
    component = new ManagementDemoComponent(service);
  });

  it('shows a message when an active reservation blocks a status change', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1]
    );

    expect(reservation).not.toBeNull();

    component.selectNumber(service.numbers[0]);
    component.changeSelectedNumberStatus('confirmed');

    expect(service.numbers[0].status).toBe('pending');
    expect(component.statusMessage).toBe(
      'No se puede modificar este número mientras tenga una reserva activa.'
    );
  });

  it('clears the rejection message when selecting another number', () => {
    service.createReservation('Participante ficticio', [1]);

    component.selectNumber(service.numbers[0]);
    component.changeSelectedNumberStatus('confirmed');

    expect(component.statusMessage).not.toBeNull();

    component.selectNumber(service.numbers[1]);

    expect(component.statusMessage).toBeNull();
  });

  it('renders an accessible alert when a reservation blocks a change', async () => {
    await TestBed.configureTestingModule({
      declarations: [ManagementDemoComponent],
      imports: [CommonModule, RouterTestingModule],
      providers: [RaffleNumbersService]
    }).compileComponents();

    const fixture = TestBed.createComponent(ManagementDemoComponent);
    const renderedComponent = fixture.componentInstance;

    fixture.detectChanges();

    renderedComponent.selectNumber(renderedComponent.numbers[0]);
    fixture.detectChanges();

    const reservationService = TestBed.inject(RaffleNumbersService);
    const reservation = reservationService.createReservation(
      'Participante ficticio',
      [1]
    );

    expect(reservation).not.toBeNull();

    renderedComponent.changeSelectedNumberStatus('confirmed');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector(
      '.management-status-message[role="alert"]'
    ) as HTMLElement | null;

    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain(
      'No se puede modificar este número mientras tenga una reserva activa.'
    );

    renderedComponent.selectNumber(renderedComponent.numbers[1]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.management-status-message')
    ).toBeNull();
  });

  it('keeps successful manual status changes working', () => {
    component.selectNumber(service.numbers[0]);
    component.changeSelectedNumberStatus('confirmed');

    expect(service.numbers[0].status).toBe('confirmed');
    expect(component.statusMessage).toBeNull();
  });
});
