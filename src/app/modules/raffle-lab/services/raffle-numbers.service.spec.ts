import { RaffleNumbersService } from './raffle-numbers.service';

describe('RaffleNumbersService - reservations', () => {
  let service: RaffleNumbersService;

  beforeEach(() => {
    service = new RaffleNumbersService();
  });

  it('creates a reservation for available numbers', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1, 2]
    );

    expect(reservation).not.toBeNull();
    expect(reservation?.status).toBe('active');
    expect(reservation?.numbers).toEqual([1, 2]);

    expect(service.numbers[0].status).toBe('pending');
    expect(service.numbers[1].status).toBe('pending');
  });

  it('rejects duplicate numbers without changing states', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1, 1]
    );

    expect(reservation).toBeNull();
    expect(service.numbers[0].status).toBe('available');
  });

  it('rejects occupied and nonexistent numbers', () => {
    const occupied = service.createReservation(
      'Participante ficticio',
      [1, 7]
    );

    const nonexistent = service.createReservation(
      'Participante ficticio',
      [1, 101]
    );

    expect(occupied).toBeNull();
    expect(nonexistent).toBeNull();
    expect(service.numbers[0].status).toBe('available');
    expect(service.numbers[6].status).toBe('confirmed');
  });

  it('protects numbers belonging to active reservations', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1]
    );

    expect(reservation).not.toBeNull();

    const changed = service.updateNumberStatus(
      1,
      'available'
    );

    expect(changed).toBeFalse();
    expect(service.numbers[0].status).toBe('pending');
  });

  it('generates different identifiers for successive reservations', () => {
    const first = service.createReservation(
      'Participante A',
      [1]
    );

    const second = service.createReservation(
      'Participante B',
      [2]
    );

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.id).not.toBe(second?.id);
  });

  it('confirms all numbers in an active reservation', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1, 2]
    );

    expect(reservation).not.toBeNull();

    const confirmed = service.confirmReservation(
      reservation!.id
    );

    expect(confirmed).toBeTrue();
    expect(reservation!.status).toBe('active');
    expect(service.numbers[0].status).toBe('confirmed');
    expect(service.numbers[1].status).toBe('confirmed');
  });

  it('rejects confirmation of an unknown reservation', () => {
    const confirmed = service.confirmReservation(
      'reservation-inexistente'
    );

    expect(confirmed).toBeFalse();
    expect(service.numbers[0].status).toBe('available');
  });

  it('rejects confirmation after expiration', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const clock = spyOn<any>(service, 'now')
      .and.returnValue(start);

    const reservation = service.createReservation(
      'Participante ficticio',
      [1],
      15
    );

    expect(reservation).not.toBeNull();

    clock.and.returnValue(
      new Date(start.getTime() + 16 * 60 * 1000)
    );

    const confirmed = service.confirmReservation(
      reservation!.id
    );

    expect(confirmed).toBeFalse();
    expect(reservation!.status).toBe('active');
    expect(service.numbers[0].status).toBe('pending');
  });


  it('protects stored reservations from external mutations', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1]
    );

    expect(reservation).not.toBeNull();

    reservation!.status = 'cancelled';
    reservation!.numbers.push(2);

    expect(service.updateNumberStatus(1, 'available')).toBeFalse();
    expect(service.confirmReservation(reservation!.id)).toBeTrue();
    expect(service.numbers[0].status).toBe('confirmed');
    expect(service.numbers[1].status).toBe('available');
  });


  it('cancels an active reservation and releases its numbers', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1, 2]
    );

    expect(reservation).not.toBeNull();

    expect(service.cancelReservation(reservation!.id)).toBeTrue();
    expect(service.numbers[0].status).toBe('available');
    expect(service.numbers[1].status).toBe('available');
    expect(reservation!.status).toBe('active');

    const newReservation = service.createReservation(
      'Otro participante',
      [1, 2]
    );

    expect(newReservation).not.toBeNull();
  });

  it('rejects cancelling the same reservation twice', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1]
    );

    expect(reservation).not.toBeNull();
    expect(service.cancelReservation(reservation!.id)).toBeTrue();
    expect(service.cancelReservation(reservation!.id)).toBeFalse();
  });

  it('rejects cancellation of a confirmed reservation', () => {
    const reservation = service.createReservation(
      'Participante ficticio',
      [1]
    );

    expect(reservation).not.toBeNull();
    expect(service.confirmReservation(reservation!.id)).toBeTrue();
    expect(service.cancelReservation(reservation!.id)).toBeFalse();
    expect(service.numbers[0].status).toBe('confirmed');
  });

  it('rejects cancellation of an expired reservation', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const clock = spyOn<any>(service, 'now')
      .and.returnValue(start);

    const reservation = service.createReservation(
      'Participante ficticio',
      [1],
      15
    );

    expect(reservation).not.toBeNull();

    clock.and.returnValue(
      new Date(start.getTime() + 16 * 60 * 1000)
    );

    expect(service.cancelReservation(reservation!.id)).toBeFalse();
    expect(service.numbers[0].status).toBe('pending');
  });


  it('expires a reservation and releases its numbers', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const clock = spyOn<any>(service, 'now')
      .and.returnValue(start);

    const reservation = service.createReservation(
      'Participante ficticio',
      [1, 2],
      15
    );

    expect(reservation).not.toBeNull();

    clock.and.returnValue(
      new Date(start.getTime() + 16 * 60 * 1000)
    );

    expect(service.expireReservations()).toBe(1);
    expect(service.numbers[0].status).toBe('available');
    expect(service.numbers[1].status).toBe('available');

    const newReservation = service.createReservation(
      'Otro participante',
      [1, 2]
    );

    expect(newReservation).not.toBeNull();
    expect(service.expireReservations()).toBe(0);
  });


  it('preserves confirmed, cancelled and unexpired reservations', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const clock = spyOn<any>(service, 'now')
      .and.returnValue(start);

    const confirmed = service.createReservation(
      'Participante confirmado', [1], 15
    );
    const cancelled = service.createReservation(
      'Participante cancelado', [2], 15
    );
    const active = service.createReservation(
      'Participante activo', [3], 30
    );

    expect(confirmed).not.toBeNull();
    expect(cancelled).not.toBeNull();
    expect(active).not.toBeNull();

    expect(service.confirmReservation(confirmed!.id)).toBeTrue();
    expect(service.cancelReservation(cancelled!.id)).toBeTrue();

    clock.and.returnValue(
      new Date(start.getTime() + 16 * 60 * 1000)
    );

    expect(service.expireReservations()).toBe(0);

    expect(service.numbers[0].status).toBe('confirmed');
    expect(service.numbers[1].status).toBe('available');
    expect(service.numbers[2].status).toBe('pending');

    expect(service.numbers[6].status).toBe('confirmed');
    expect(service.numbers[11].status).toBe('pending');
  });


  it('releases expired numbers before creating a new reservation', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const clock = spyOn<any>(service, 'now')
      .and.returnValue(start);

    const first = service.createReservation(
      'Primer participante',
      [1, 2],
      15
    );

    expect(first).not.toBeNull();
    expect(service.numbers[0].status).toBe('pending');

    clock.and.returnValue(
      new Date(start.getTime() + 16 * 60 * 1000)
    );

    const second = service.createReservation(
      'Segundo participante',
      [1, 2],
      15
    );

    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first!.id);
    expect(service.numbers[0].status).toBe('pending');
    expect(service.numbers[1].status).toBe('pending');
    expect(service.confirmReservation(first!.id)).toBeFalse();
    expect(service.confirmReservation(second!.id)).toBeTrue();
  });


  it('expires reservations before manually updating a number', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const clock = spyOn<any>(service, 'now')
      .and.returnValue(start);

    const reservation = service.createReservation(
      'Participante ficticio', [1], 15
    );

    expect(reservation).not.toBeNull();
    expect(service.numbers[0].status).toBe('pending');

    clock.and.returnValue(
      new Date(start.getTime() + 16 * 60 * 1000)
    );

    expect(service.updateNumberStatus(1, 'confirmed')).toBeTrue();
    expect(service.numbers[0].status).toBe('confirmed');
    expect(service.confirmReservation(reservation!.id)).toBeFalse();
  });

});
