import { describe, expect, it } from 'vitest';
import { LEAD_TIME_HOURS } from './times';
import { leadTimeResponseToSelection, leadTimeSelectionToRequest } from './lead-time';

describe('cost policy lead-time select round trip', () => {
  it('submits and renders a selected 48-hour threshold as 48', () => {
    expect(LEAD_TIME_HOURS).toContain(48);

    const requestValue = leadTimeSelectionToRequest(true, '48');
    expect(requestValue).toBe(48);

    const renderedSelection = leadTimeResponseToSelection(requestValue);
    expect(renderedSelection).toBe('48');
  });

  it('omits the threshold when its matcher is disabled', () => {
    expect(leadTimeSelectionToRequest(false, '48')).toBeNull();
  });
});
