import { MapPageComponent } from './map/map-page';
import { routes } from './app.routes';

describe('app routes', () => {
  it('uses map page as default route', () => {
    expect(routes.length).toBeGreaterThanOrEqual(1);
    const home = routes.find((r) => r.path === '');
    expect(home?.component).toBe(MapPageComponent);
  });
});
