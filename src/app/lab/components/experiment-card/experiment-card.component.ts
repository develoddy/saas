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
    const routes: Record<string, string> = {
      mailflow: '/mailflow'
    };

    return routes[this.experiment?.key] ?? null;
  }
}
