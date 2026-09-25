import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TrackingService } from '../../../services/tracking.service';

const MODULE_KEY = 'parking-reservation-landing';
const EXPERIMENT = 'parking_reservation_v1';

/**
 * 🅿️ Parking Reservation — Smoke Test V1
 *
 * Fake-door landing measuring whether drivers care about the risk that a
 * prepaid parking reservation may fail at the physical car park.
 *
 * Funnel:
 * landing_view
 * → check_reservation_click
 * → problem_response
 * → email_submitted
 *
 * @module modules/parking-reservation/landing
 */
@Component({
  selector: 'app-parking-reservation-landing',
  templateUrl: './parking-reservation-landing.component.html',
  styleUrls: ['./parking-reservation-landing.component.scss']
})
export class ParkingReservationLandingComponent implements OnInit {

  problemForm: FormGroup;
  emailForm: FormGroup;

  checkRequested = false;
  problemSubmitted = false;
  emailSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private tracking: TrackingService
  ) {
    this.problemForm = this.fb.group({
      problem_type: ['', Validators.required]
    });

    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.tracking.pageView('parking_reservation_landing', {
      module: MODULE_KEY,
      experiment: EXPERIMENT
    });

    this.tracking.landingView(MODULE_KEY, {
      experiment: EXPERIMENT
    });
  }

  /**
   * Primary intent signal.
   * Fires BEFORE asking any question so form friction does not contaminate
   * the main fake-door signal.
   */
  checkReservation(): void {
    if (this.checkRequested) {
      return;
    }

    this.tracking.track('check_reservation_click', {
      module: MODULE_KEY,
      experiment: EXPERIMENT
    });

    this.checkRequested = true;
  }

  /**
   * Captures which pain intensity the visitor identifies with:
   * economic loss, time/stress, or concern without previous experience.
   */
  submitProblem(): void {
    if (this.problemForm.invalid) {
      this.problemForm.markAllAsTouched();
      return;
    }

    const problemType = this.problemForm.value.problem_type;

    this.tracking.track('problem_response', {
      module: MODULE_KEY,
      experiment: EXPERIMENT,
      problem_type: problemType
    });

    this.tracking.landingEngagement(
      MODULE_KEY,
      'problem_response',
      {
        experiment: EXPERIMENT,
        problem_type: problemType
      }
    );

    this.problemSubmitted = true;
  }

  notifyMe(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email: string = this.emailForm.value.email;
    const normalizedEmail = email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split('@')[1] || '';
    const emailHash = this.simpleHash(normalizedEmail);

    this.tracking.track('email_submitted', {
      module: MODULE_KEY,
      experiment: EXPERIMENT,
      email_hash: emailHash,
      email_domain: emailDomain,
      problem_type: this.problemForm.value.problem_type
    });

    this.tracking.leadCaptured(
      MODULE_KEY,
      'email_submitted',
      {
        experiment: EXPERIMENT,
        email_hash: emailHash,
        email_domain: emailDomain,
        problem_type: this.problemForm.value.problem_type
      }
    );

    this.emailSubmitted = true;
  }

  private simpleHash(str: string): string {
    let hash = 2166136261;

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash +=
        (hash << 1) +
        (hash << 4) +
        (hash << 7) +
        (hash << 8) +
        (hash << 24);
    }

    return (hash >>> 0).toString(16);
  }
}