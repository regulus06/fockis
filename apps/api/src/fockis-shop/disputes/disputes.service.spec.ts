import { nextDisputeStatus } from './disputes.service';

describe('DisputesService state machine', () => {
  it('moves open disputes into review', () => {
    expect(nextDisputeStatus('open', 'start_review')).toBe('under_review');
  });

  it('resolves open or reviewed disputes', () => {
    expect(nextDisputeStatus('open', 'resolve_buyer')).toBe('resolved_buyer');
    expect(nextDisputeStatus('under_review', 'resolve_seller')).toBe('resolved_seller');
    expect(nextDisputeStatus('under_review', 'close')).toBe('closed');
  });

  it('refuses changes to decided disputes', () => {
    expect(nextDisputeStatus('resolved_buyer', 'start_review')).toBeNull();
    expect(nextDisputeStatus('closed', 'resolve_buyer')).toBeNull();
    expect(nextDisputeStatus('under_review', 'start_review')).toBeNull();
  });
});
