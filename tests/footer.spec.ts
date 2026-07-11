import { expect, test } from '@playwright/test';

test.describe('footer support windows', () => {
  test('keeps exact hours and contacts clear on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByText('Every day · Singapore time (SGT)', { exact: true })).toBeVisible();

    const daytime = page.getByTestId('support-window-0900');
    const overnight = page.getByTestId('support-window-0000');

    await expect(daytime.locator('time[datetime="09:00"]')).toHaveText('09:00');
    await expect(daytime.locator('time[datetime="23:59"]')).toHaveText('23:59');
    await expect(daytime.locator('a[href="https://wa.me/6583090333"]')).toBeVisible();
    await expect(daytime.locator('a[href="https://wa.me/6597809828"]')).toBeVisible();
    await expect(daytime.locator('a[href="https://wa.me/6588178504"]')).toHaveCount(0);

    await expect(overnight.locator('time[datetime="00:00"]')).toHaveText('00:00');
    await expect(overnight.locator('time[datetime="08:59"]')).toHaveText('08:59');
    await expect(overnight.getByRole('link', { name: 'WhatsApp: +65 8817 8504' })).toBeVisible();
    await expect(overnight.getByRole('link', { name: 'Telegram support: @bunnybooker' })).toBeVisible();
    await expect(overnight.getByRole('link', { name: 'Email support: support@bunnybooker.com' })).toBeVisible();
    await expect(overnight.getByRole('link', { name: 'Call support: +65 8817 8504' })).toBeVisible();

    const daytimeBox = await daytime.boundingBox();
    const overnightBox = await overnight.boundingBox();
    expect(daytimeBox).not.toBeNull();
    expect(overnightBox).not.toBeNull();
    expect(Math.abs(daytimeBox!.x - overnightBox!.x)).toBeLessThan(1);
    expect(overnightBox!.y).toBeGreaterThanOrEqual(daytimeBox!.y + daytimeBox!.height);

    for (const link of await daytime.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    for (const link of await overnight.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
