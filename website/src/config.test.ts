import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import config from '../docusaurus.config';

describe('Docusaurus Configuration', () => {
  it('logo configuration should have static single link pointing to default locale', () => {
    const navbar = config.themeConfig?.navbar as any;
    assert.ok(navbar, 'Navbar config should exist');
    assert.ok(navbar.logo, 'Navbar logo config should exist');
    
    assert.equal(navbar.logo.src, 'img/logo.svg');
    assert.equal(navbar.logo.srcDark, 'img/logo-light.svg');
    assert.equal(navbar.logo.href, 'https://the-long-ride.github.io/engram/');
    assert.equal(navbar.logo.target, '_self');
  });
});
