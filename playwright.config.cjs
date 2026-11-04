module.exports = {
  testDir: './tests',
  testMatch: '**/*.ui.spec.cjs',
  timeout: 30000,
  expect: {timeout: 8000},
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8765',
    viewport: {width: 390,height: 844},
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  reporter: [['list'],['html',{open:'never',outputFolder:'playwright-report'}]],
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: false,
    timeout: 30000
  }
};