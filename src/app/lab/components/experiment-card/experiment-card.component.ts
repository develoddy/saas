import { Component, Input } from '@angular/core';
import { LabExperiment } from '../../../services/lab.service';

@Component({
  selector: 'app-experiment-card',
  templateUrl: './experiment-card.component.html',
  styleUrls: ['./experiment-card.component.scss']
})
export class ExperimentCardComponent {
  @Input() experiment!: LabExperiment;

  get experimentRoute(): string | null {
    const route = this.experiment?.route;

    if (
      typeof route === 'string' &&
      /^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/.test(route)
    ) {
      return route;
    }

    return null;
  }
}
