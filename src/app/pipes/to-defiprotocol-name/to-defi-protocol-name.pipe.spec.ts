import { ToDefiProtocolNamePipe } from './to-defi-protocol-name.pipe';

describe('ToDefiProtocolNamePipe', () => {
  it('create an instance', () => {
    const pipe = new ToDefiProtocolNamePipe();
    expect(pipe).toBeTruthy();
  });
});
